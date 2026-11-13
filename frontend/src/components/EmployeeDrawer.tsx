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
import type { Employee, FxRateItem } from '../lib/types';

interface EmployeeDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: Employee | null;
  fxRates?: FxRateItem[];
  onSave: (data: Partial<Employee>, id?: string) => Promise<void>;
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
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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
      setHireDate(new Date().toISOString().substring(0, 10));
    }
    setErrorMsg('');
  }, [employee, isOpen]);

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

  const handleSubmit = async () => {
    setErrorMsg('');
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
      const payload: Partial<Employee> = {
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
      };

      await onSave(payload, employee?.id);
      onOpenChange(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save employee changes');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      purpose="form"
      width={480}
      label={isEdit ? `Edit Employee ${employee?.employeeCode}` : 'Add New Employee'}
    >
      <Layout
        header={
          <DrawerHeader
            title={isEdit ? 'Edit Employee' : 'Add New Employee'}
            subtitle={
              isEdit
                ? `${employee?.employeeCode} • Automatic USD Recalculation`
                : 'Create a global employee with normalized compensation'
            }
            onOpenChange={onOpenChange}
          />
        }
        content={
          <LayoutContent padding={4}>
            <VStack gap={3}>
              {errorMsg && (
                <Card variant="red" padding={2}>
                  <HStack gap={1} align="center">
                    <Badge variant="error" label="Error" />
                    <Text>{errorMsg}</Text>
                  </HStack>
                </Card>
              )}

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

              {/* Live USD Preview Card */}
              <Card variant="muted" padding={3}>
                <VStack gap={1.5}>
                  <Text type="supporting" color="secondary" weight="semibold">
                    Live USD Conversion Preview (1 {localCurrency} = ${currentRate.toFixed(4)} USD)
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
              <Button
                variant="primary"
                label={isSaving ? 'Saving...' : 'Save Changes'}
                isDisabled={isSaving}
                clickAction={handleSubmit}
              />
            </HStack>
          </LayoutFooter>
        }
      />
    </Drawer>
  );
}
