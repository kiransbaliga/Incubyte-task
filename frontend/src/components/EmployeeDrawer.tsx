'use client';

import React, { useState, useEffect } from 'react';
import { Drawer, DrawerHeader } from '@astryxdesign/core/Drawer';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Selector } from '@astryxdesign/core/Selector';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Text } from '@astryxdesign/core/Text';
import { Badge } from '@astryxdesign/core/Badge';
import { formatUsd } from '../lib/formatters';
import { getSalaryRevisions, getEmployee, ConcurrencyConflictError } from '../lib/api';
import type { Employee, FxRateItem, SalaryRevision } from '../lib/types';

interface EmployeeDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: Employee | null;
  fxRates?: FxRateItem[];
  onSave: (data: Partial<Employee> & { revisionReason?: string; changedBy?: string }, id?: string) => Promise<void>;
}

const DEPARTMENTS = [
  { value: 'Engineering', label: 'Engineering' },
  { value: 'Product', label: 'Product' },
  { value: 'Design', label: 'Design' },
  { value: 'Sales', label: 'Sales' },
  { value: 'Operations', label: 'Operations' },
  { value: 'People', label: 'People' },
];

const LEVELS = [
  { value: 'L1', label: 'L1' },
  { value: 'L2', label: 'L2' },
  { value: 'L3', label: 'L3' },
  { value: 'L4', label: 'L4' },
  { value: 'L5', label: 'L5' },
  { value: 'L6', label: 'L6' },
];

const COUNTRIES = [
  { value: 'US', label: 'United States (US)' },
  { value: 'DE', label: 'Germany (DE)' },
  { value: 'GB', label: 'United Kingdom (GB)' },
  { value: 'IN', label: 'India (IN)' },
  { value: 'SG', label: 'Singapore (SG)' },
  { value: 'JP', label: 'Japan (JP)' },
];

const CURRENCIES = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'INR', label: 'INR (₹)' },
  { value: 'SGD', label: 'SGD (S$)' },
  { value: 'JPY', label: 'JPY (¥)' },
];

const STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'terminated', label: 'Terminated' },
];

const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  US: 'USD',
  DE: 'EUR',
  GB: 'GBP',
  IN: 'INR',
  SG: 'SGD',
  JP: 'JPY',
};

const DEFAULT_FX_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 1.086,
  GBP: 1.263,
  INR: 0.0119,
  SGD: 0.745,
  JPY: 0.0067,
};

export function EmployeeDrawer({
  isOpen,
  onOpenChange,
  employee,
  fxRates,
  onSave,
}: EmployeeDrawerProps) {
  const isEdit = Boolean(employee?.id);

  const [activeTab, setActiveTab] = useState<'edit' | 'ledger'>('edit');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('Engineering');
  const [level, setLevel] = useState('L3');
  const [country, setCountry] = useState('US');
  const [localCurrency, setLocalCurrency] = useState('USD');
  const [localBaseSalary, setLocalBaseSalary] = useState('');
  const [localBonusTarget, setLocalBonusTarget] = useState('0');
  const [employmentStatus, setEmploymentStatus] = useState('active');
  const [hireDate, setHireDate] = useState('');
  const [currentVersion, setCurrentVersion] = useState<number>(1);
  const [revisionReason, setRevisionReason] = useState('Annual Compensation Review');
  const [errorMsg, setErrorMsg] = useState('');
  const [conflictData, setConflictData] = useState<{ message: string; currentVersion?: number } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Bi-temporal revisions ledger state
  const [revisions, setRevisions] = useState<SalaryRevision[]>([]);
  const [loadingRevisions, setLoadingRevisions] = useState(false);

  // Sync form values on employee prop change or reset
  useEffect(() => {
    if (employee) {
      setFullName(employee.fullName || '');
      setEmail(employee.email || '');
      setDepartment(employee.department || 'Engineering');
      setLevel(employee.level || 'L3');
      setCountry(employee.country || 'US');
      setLocalCurrency(employee.localCurrency || 'USD');
      setLocalBaseSalary(String(employee.localBaseSalary || ''));
      setLocalBonusTarget(String(employee.localBonusTarget || '0'));
      setEmploymentStatus(employee.employmentStatus || 'active');
      setCurrentVersion(employee.version ?? 1);
      setHireDate(
        employee.hireDate ? employee.hireDate.substring(0, 10) : new Date().toISOString().substring(0, 10)
      );
    } else {
      setFullName('');
      setEmail('');
      setDepartment('Engineering');
      setLevel('L3');
      setCountry('US');
      setLocalCurrency('USD');
      setLocalBaseSalary('');
      setLocalBonusTarget('0');
      setEmploymentStatus('active');
      setCurrentVersion(1);
      setHireDate(new Date().toISOString().substring(0, 10));
    }
    setErrorMsg('');
    setConflictData(null);
    setActiveTab('edit');
  }, [employee, isOpen]);

  // Load bi-temporal revisions when switching to ledger tab
  useEffect(() => {
    if (activeTab === 'ledger' && employee?.id) {
      setLoadingRevisions(true);
      getSalaryRevisions(employee.id)
        .then((data) => setRevisions(data))
        .catch((err) => setErrorMsg(err.message || 'Failed to fetch revision history'))
        .finally(() => setLoadingRevisions(false));
    }
  }, [activeTab, employee?.id]);

  // Handle country change to auto-update currency
  const handleCountryChange = (newCountry: string) => {
    setCountry(newCountry);
    const mapped = COUNTRY_CURRENCY_MAP[newCountry];
    if (mapped) {
      setLocalCurrency(mapped);
    }
  };

  // Live USD conversion preview calculation
  const fxRatesMap = React.useMemo(() => {
    const map: Record<string, number> = { ...DEFAULT_FX_RATES };
    if (fxRates) {
      for (const item of fxRates) {
        map[item.currencyCode] = parseFloat(item.rateToUsd);
      }
    }
    return map;
  }, [fxRates]);

  const currentRate = fxRatesMap[localCurrency] || 1.0;
  const numBase = parseFloat(localBaseSalary) || 0;
  const numBonus = parseFloat(localBonusTarget) || 0;
  const previewUsdBase = Math.round(numBase * currentRate * 100) / 100;
  const previewUsdBonus = Math.round(numBonus * currentRate * 100) / 100;

  // Handle reloading latest employee data on OCC 409 conflict
  const handleReloadLatest = async () => {
    if (!employee?.id) return;
    try {
      const latest = await getEmployee(employee.id);
      setFullName(latest.fullName);
      setEmail(latest.email);
      setDepartment(latest.department);
      setLevel(latest.level);
      setCountry(latest.country);
      setLocalCurrency(latest.localCurrency);
      setLocalBaseSalary(String(latest.localBaseSalary));
      setLocalBonusTarget(String(latest.localBonusTarget));
      setEmploymentStatus(latest.employmentStatus);
      setCurrentVersion(latest.version);
      setConflictData(null);
      setErrorMsg('');
    } catch (err: any) {
      setErrorMsg('Failed to reload latest employee record');
    }
  };

  const handleSubmit = async () => {
    setErrorMsg('');
    setConflictData(null);

    if (!fullName.trim()) {
      setErrorMsg('Full Name is required');
      return;
    }
    if (!email.trim()) {
      setErrorMsg('Email Address is required');
      return;
    }
    if (!localBaseSalary || isNaN(parseFloat(localBaseSalary)) || parseFloat(localBaseSalary) <= 0) {
      setErrorMsg('A valid positive Local Base Salary is required');
      return;
    }
    if (!hireDate) {
      setErrorMsg('Hire Date is required');
      return;
    }

    setIsSaving(true);
    try {
      const payload: Partial<Employee> & { revisionReason?: string; changedBy?: string } = {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        department,
        level,
        country,
        localCurrency,
        localBaseSalary: parseFloat(localBaseSalary),
        localBonusTarget: parseFloat(localBonusTarget) || 0,
        employmentStatus,
        hireDate,
        version: currentVersion,
        revisionReason: revisionReason.trim() || 'Compensation adjustment',
        changedBy: 'HR Operations',
      };

      await onSave(payload, employee?.id);
      onOpenChange(false);
    } catch (err: any) {
      if (err instanceof ConcurrencyConflictError || err.name === 'ConcurrencyConflictError' || err.message?.includes('modified by another')) {
        setConflictData({
          message: err.message,
          currentVersion: err.currentVersion,
        });
      } else {
        setErrorMsg(err.message || 'Failed to save employee changes');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      purpose="form"
      width={520}
      label={isEdit ? `Edit Employee ${employee?.employeeCode}` : 'Add New Employee'}
    >
      <Layout
        header={
          <DrawerHeader
            title={isEdit ? `Employee ${employee?.employeeCode}` : 'Add New Employee'}
            subtitle={
              isEdit
                ? `Version ${currentVersion} · Bi-Temporal Ledger Protected`
                : 'Create a global employee with normalized compensation'
            }
            onOpenChange={onOpenChange}
          />
        }
        content={
          <LayoutContent padding={4}>
            <VStack gap={3}>
              {/* Tabs for Edit vs Bi-Temporal Ledger */}
              {isEdit && (
                <div style={{
                  display: 'flex',
                  gap: '4px',
                  background: '#f1f5f9',
                  padding: '4px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                }}>
                  <button
                    type="button"
                    onClick={() => setActiveTab('edit')}
                    style={{
                      flex: 1,
                      padding: '7px 12px',
                      fontSize: '13px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      background: activeTab === 'edit' ? '#ffffff' : 'transparent',
                      color: activeTab === 'edit' ? '#0f172a' : '#64748b',
                      boxShadow: activeTab === 'edit' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    Edit Profile & Comp (v{currentVersion})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('ledger')}
                    style={{
                      flex: 1,
                      padding: '7px 12px',
                      fontSize: '13px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      background: activeTab === 'ledger' ? '#ffffff' : 'transparent',
                      color: activeTab === 'ledger' ? '#0f172a' : '#64748b',
                      boxShadow: activeTab === 'ledger' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    📜 Salary Ledger History
                  </button>
                </div>
              )}

              {/* OCC 409 Conflict Banner */}
              {conflictData && (
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #f87171',
                  borderRadius: '8px',
                  padding: '12px 14px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>⚠️</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#991b1b', marginBottom: '2px' }}>
                        Optimistic Concurrency Conflict (HTTP 409)
                      </div>
                      <div style={{ fontSize: '12px', color: '#b91c1c', lineHeight: 1.4, marginBottom: '8px' }}>
                        This record was modified by another administrator or session while you were editing.
                        {conflictData.currentVersion && ` Database version is now v${conflictData.currentVersion}.`}
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        label="Reload Latest Database Record"
                        clickAction={handleReloadLatest}
                      />
                    </div>
                  </div>
                </div>
              )}

              {errorMsg && (
                <Card variant="red" padding={2}>
                  <HStack gap={1} align="center">
                    <Badge variant="error" label="Error" />
                    <Text>{errorMsg}</Text>
                  </HStack>
                </Card>
              )}

              {/* TAB 1: Edit Form */}
              {activeTab === 'edit' && (
                <VStack gap={3}>
                  <TextInput
                    label="Full Name"
                    value={fullName}
                    onChange={(val) => setFullName(val)}
                    placeholder="e.g. Jane Doe"
                    isRequired
                  />

                  <TextInput
                    label="Email Address"
                    type="email"
                    value={email}
                    onChange={(val) => setEmail(val)}
                    placeholder="e.g. jane.doe@acme.corp"
                    isRequired
                  />

                  <HStack gap={2} width="100%">
                    <Selector
                      label="Department"
                      options={DEPARTMENTS}
                      value={department}
                      onChange={(val) => setDepartment(val)}
                      width="50%"
                    />
                    <Selector
                      label="Level"
                      options={LEVELS}
                      value={level}
                      onChange={(val) => setLevel(val)}
                      width="50%"
                    />
                  </HStack>

                  <HStack gap={2} width="100%">
                    <Selector
                      label="Country"
                      options={COUNTRIES}
                      value={country}
                      onChange={(val) => handleCountryChange(val)}
                      width="50%"
                    />
                    <Selector
                      label="Local Currency"
                      options={CURRENCIES}
                      value={localCurrency}
                      onChange={(val) => setLocalCurrency(val)}
                      width="50%"
                    />
                  </HStack>

                  <HStack gap={2} width="100%">
                    <TextInput
                      label="Local Base Salary"
                      value={localBaseSalary}
                      onChange={(val) => setLocalBaseSalary(val)}
                      placeholder="e.g. 120000"
                      isRequired
                      width="50%"
                    />
                    <TextInput
                      label="Local Bonus Target"
                      value={localBonusTarget}
                      onChange={(val) => setLocalBonusTarget(val)}
                      placeholder="e.g. 15000"
                      width="50%"
                    />
                  </HStack>

                  <HStack gap={2} width="100%">
                    <Selector
                      label="Status"
                      options={STATUSES}
                      value={employmentStatus}
                      onChange={(val) => setEmploymentStatus(val)}
                      width="50%"
                    />
                    <TextInput
                      label="Hire Date"
                      value={hireDate}
                      onChange={(val) => setHireDate(val)}
                      placeholder="YYYY-MM-DD"
                      isRequired
                      width="50%"
                    />
                  </HStack>

                  {/* Audit / Reason for Change */}
                  {isEdit && (
                    <TextInput
                      label="Reason for Compensation Change (Audit Trail)"
                      value={revisionReason}
                      onChange={(val) => setRevisionReason(val)}
                      placeholder="e.g. Annual Merit Calibration, Promotion to L4"
                    />
                  )}

                  {/* Live USD Preview Card */}
                  <Card variant="muted" padding={3}>
                    <VStack gap={1.5}>
                      <Text type="supporting" color="secondary" weight="semibold">
                        Live USD Normalization (1 {localCurrency} = ${currentRate.toFixed(4)} USD)
                      </Text>
                      <HStack justify="between" align="center">
                        <Text type="body">Normalized Base Salary:</Text>
                        <Text type="body" weight="semibold" hasTabularNumbers>
                          {formatUsd(previewUsdBase)}
                        </Text>
                      </HStack>
                      <HStack justify="between" align="center">
                        <Text type="supporting" color="secondary">
                          Normalized Bonus Target:
                        </Text>
                        <Text type="supporting" color="secondary" hasTabularNumbers>
                          {formatUsd(previewUsdBonus)}
                        </Text>
                      </HStack>
                    </VStack>
                  </Card>
                </VStack>
              )}

              {/* TAB 2: Bi-Temporal Salary Ledger */}
              {activeTab === 'ledger' && (
                <VStack gap={3}>
                  <div style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                    color: '#64748b',
                  }}>
                    🛡️ <strong>Immutable Append-Only Ledger:</strong> Every compensation update creates a timestamped revision row with snapshot FX rates, enabling point-in-time auditability.
                  </div>

                  {loadingRevisions && (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                      Loading revision history...
                    </div>
                  )}

                  {!loadingRevisions && revisions.length === 0 && (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                      No prior salary revisions found.
                    </div>
                  )}

                  {!loadingRevisions && revisions.map((rev, idx) => {
                    const isActive = rev.effectiveTo === null;
                    return (
                      <div
                        key={rev.id || idx}
                        style={{
                          borderRadius: '8px',
                          border: isActive ? '1.5px solid #22c55e' : '1px solid #e2e8f0',
                          background: isActive ? '#f0fdf4' : '#ffffff',
                          padding: '12px 14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '999px',
                            background: isActive ? '#dcfce7' : '#f1f5f9',
                            color: isActive ? '#15803d' : '#475569',
                          }}>
                            {isActive ? '● Active Revision' : '○ Historical Term'}
                          </span>
                          <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                            {new Date(rev.effectiveFrom).toLocaleDateString()} → {rev.effectiveTo ? new Date(rev.effectiveTo).toLocaleDateString() : 'Present'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '2px' }}>
                          <span style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                            {formatUsd(Number(rev.baseSalaryUsd))}
                          </span>
                          <span style={{ fontSize: '12px', color: '#64748b' }}>
                            Local: {Number(rev.localBaseSalary).toLocaleString()} {rev.localCurrency} @ {Number(rev.fxRateSnapshot).toFixed(4)}
                          </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#475569', borderTop: '1px solid #f1f5f9', paddingTop: '6px', marginTop: '2px' }}>
                          <span><strong>Reason:</strong> {rev.reason}</span>
                          <span style={{ color: '#94a3b8' }}>by {rev.changedBy}</span>
                        </div>
                      </div>
                    );
                  })}
                </VStack>
              )}
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter hasDivider padding={3}>
            <HStack justify="end" gap={2} width="100%">
              <Button
                variant="secondary"
                label="Cancel"
                clickAction={() => onOpenChange(false)}
              />
              {activeTab === 'edit' && (
                <Button
                  variant="primary"
                  label={isSaving ? 'Saving...' : 'Save Changes'}
                  isDisabled={isSaving}
                  clickAction={handleSubmit}
                />
              )}
            </HStack>
          </LayoutFooter>
        }
      />
    </Drawer>
  );
}
