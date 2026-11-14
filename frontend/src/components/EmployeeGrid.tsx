'use client';

import React from 'react';
import { Card } from '@astryxdesign/core/Card';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Text } from '@astryxdesign/core/Text';
import { Badge } from '@astryxdesign/core/Badge';
import { Button } from '@astryxdesign/core/Button';
import { Avatar } from '@astryxdesign/core/Avatar';
import { Table, proportional, pixel } from '@astryxdesign/core/Table';
import type { TableColumn } from '@astryxdesign/core/Table';
import { formatLocalCurrency, formatUsd } from '../lib/formatters';
import type { Employee } from '../lib/types';
import { Pencil, ChevronLeft, ChevronRight } from 'lucide-react';

interface EmployeeGridProps {
  employees: Employee[];
  isLoading: boolean;
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onEdit: (employee: Employee) => void;
}

type EmployeeRow = Employee & Record<string, unknown>;

const COUNTRY_FLAGS: Record<string, string> = {
  US: '🇺🇸',
  IN: '🇮🇳',
  DE: '🇩🇪',
  GB: '🇬🇧',
  SG: '🇸🇬',
  JP: '🇯🇵',
};

export function EmployeeGrid({
  employees,
  isLoading,
  page,
  pageSize,
  totalCount,
  totalPages,
  onPageChange,
  onEdit,
}: EmployeeGridProps) {
  const columns: TableColumn<EmployeeRow>[] = [
    {
      key: 'employeeCode',
      header: 'Employee Code',
      width: proportional(1.1, { minWidth: 120 }),
      renderCell: (item) => (
        <span
          style={{
            cursor: 'pointer',
            fontFamily: 'var(--font-mono, monospace)',
            fontWeight: 600,
            fontSize: '0.85rem',
            padding: '2px 6px',
            borderRadius: '4px',
            backgroundColor: 'var(--color-bg-secondary, rgba(0,0,0,0.04))',
            color: 'var(--color-primary-main, #2563eb)',
            letterSpacing: '0.02em',
          }}
          onClick={() => onEdit(item)}
        >
          {item.employeeCode}
        </span>
      ),
    },
    {
      key: 'nameEmail',
      header: 'Employee',
      width: proportional(2.4, { minWidth: 200 }),
      renderCell: (item) => (
        <HStack
          gap={2}
          align="center"
          style={{ cursor: 'pointer' }}
          onClick={() => onEdit(item)}
        >
          <Avatar name={item.fullName} size="sm" shape="circle" />
          <VStack gap={0.5}>
            <Text weight="semibold">{item.fullName}</Text>
            <Text type="supporting" color="secondary">
              {item.email}
            </Text>
          </VStack>
        </HStack>
      ),
    },
    {
      key: 'deptLevel',
      header: 'Dept & Level',
      width: proportional(1.6, { minWidth: 140 }),
      renderCell: (item) => {
        const lvl = item.level;
        const levelVariant =
          lvl === 'L5' || lvl === 'L6'
            ? 'purple'
            : lvl === 'L3' || lvl === 'L4'
            ? 'blue'
            : 'neutral';

        return (
          <HStack gap={1.5} align="center">
            <Text>{item.department}</Text>
            <Badge variant={levelVariant} label={item.level} />
          </HStack>
        );
      },
    },
    {
      key: 'country',
      header: 'Country',
      width: proportional(1, { minWidth: 90 }),
      renderCell: (item) => {
        const flag = COUNTRY_FLAGS[item.country] || '🌐';
        return (
          <HStack gap={1} align="center">
            <Text>{flag}</Text>
            <Text weight="semibold">{item.country}</Text>
          </HStack>
        );
      },
    },
    {
      key: 'localSalary',
      header: 'Local Compensation',
      width: proportional(1.7, { minWidth: 150 }),
      renderCell: (item) => (
        <VStack gap={0.5}>
          <Text hasTabularNumbers weight="medium">
            {formatLocalCurrency(item.localBaseSalary, item.localCurrency)}
          </Text>
          {Number(item.localBonusTarget) > 0 && (
            <Text type="supporting" color="secondary" hasTabularNumbers>
              + {formatLocalCurrency(item.localBonusTarget, item.localCurrency)} target
            </Text>
          )}
        </VStack>
      ),
    },
    {
      key: 'baseSalaryUsd',
      header: 'Normalized USD Pay',
      width: proportional(1.7, { minWidth: 150 }),
      renderCell: (item) => (
        <VStack gap={0.5}>
          <Text weight="semibold" hasTabularNumbers color="primary">
            {formatUsd(item.baseSalaryUsd)}
          </Text>
          {Number(item.bonusTargetUsd) > 0 && (
            <Text type="supporting" color="secondary" hasTabularNumbers>
              + {formatUsd(item.bonusTargetUsd)} USD
            </Text>
          )}
        </VStack>
      ),
    },
    {
      key: 'employmentStatus',
      header: 'Status',
      width: proportional(1, { minWidth: 95 }),
      renderCell: (item) => {
        const variant =
          item.employmentStatus === 'active'
            ? 'success'
            : item.employmentStatus === 'inactive'
            ? 'warning'
            : 'error';
        const label =
          item.employmentStatus.charAt(0).toUpperCase() + item.employmentStatus.slice(1);
        return <Badge variant={variant} label={label} />;
      },
    },
    {
      key: 'actions',
      header: 'Action',
      width: pixel(85),
      renderCell: (item) => (
        <Button
          variant="secondary"
          size="sm"
          label="Edit"
          clickAction={() => onEdit(item)}
        />
      ),
    },
  ];

  const startRecord = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRecord = Math.min(page * pageSize, totalCount);

  return (
    <Card padding={0}>
      <VStack gap={0} width="100%">
        {/* Desktop Table View */}
        <div className="desktop-employee-table" style={{ width: '100%' }}>
          <Table<EmployeeRow>
            data={employees as EmployeeRow[]}
            columns={columns}
            idKey="id"
            hasHover
            dividers="rows"
          />
        </div>

        {/* Mobile Employee Card List View */}
        <div className="mobile-employee-list" style={{ width: '100%', padding: '12px' }}>
          {employees.map((emp) => {
            const flag = COUNTRY_FLAGS[emp.country] || '🌐';
            const statusVariant =
              emp.employmentStatus === 'active'
                ? 'success'
                : emp.employmentStatus === 'inactive'
                ? 'warning'
                : 'error';
            const statusLabel =
              emp.employmentStatus.charAt(0).toUpperCase() + emp.employmentStatus.slice(1);
            const lvl = emp.level;
            const levelVariant =
              lvl === 'L5' || lvl === 'L6'
                ? 'purple'
                : lvl === 'L3' || lvl === 'L4'
                ? 'blue'
                : 'neutral';

            return (
              <div
                key={emp.id}
                className="mobile-employee-card"
                onClick={() => onEdit(emp)}
              >
                {/* Top Row: Avatar, Name, Status Badge */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Avatar name={emp.fullName} size="sm" shape="circle" />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--color-text-primary, #0f172a)' }}>
                        {emp.fullName}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary, #64748b)' }}>
                        {emp.email}
                      </div>
                    </div>
                  </div>
                  <Badge variant={statusVariant} label={statusLabel} />
                </div>

                {/* Middle Row: Code, Department, Level, Country Flag */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '12px' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono, monospace)',
                      fontWeight: 600,
                      fontSize: '11px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(0,0,0,0.04)',
                      color: 'var(--color-primary-main, #2563eb)',
                    }}
                  >
                    {emp.employeeCode}
                  </span>
                  <span style={{ color: 'var(--color-text-secondary, #64748b)' }}>•</span>
                  <span>{emp.department}</span>
                  <Badge variant={levelVariant} label={emp.level} />
                  <span style={{ color: 'var(--color-text-secondary, #64748b)' }}>•</span>
                  <span>{flag} {emp.country}</span>
                </div>

                {/* Bottom Row: Compensation Details & Quick Edit */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '8px',
                    borderTop: '1px solid var(--color-border-subtle, #f1f5f9)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#15803d' }} data-tabular-nums>
                      {formatUsd(emp.baseSalaryUsd)}{' '}
                      <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-text-secondary, #64748b)' }}>
                        / USD
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-secondary, #64748b)' }}>
                      Local: {formatLocalCurrency(emp.localBaseSalary, emp.localCurrency)}
                      {Number(emp.localBonusTarget) > 0 && ` (+${formatLocalCurrency(emp.localBonusTarget, emp.localCurrency)} bonus)`}
                    </div>
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    label="Edit"
                    clickAction={(e: any) => {
                      if (e && e.stopPropagation) e.stopPropagation();
                      onEdit(emp);
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination Toolbar */}
        <Card variant="transparent" padding={3}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              width: '100%',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Text type="supporting" color="secondary" style={{ fontSize: '12px' }}>
                {isLoading
                  ? 'Querying indexed records...'
                  : `${startRecord.toLocaleString()}–${endRecord.toLocaleString()} of ${totalCount.toLocaleString()}`}
              </Text>
              <Badge variant="neutral" label="Sub-50ms P95" />
            </div>

            <HStack gap={2} align="center">
              <Button
                variant="secondary"
                size="sm"
                label="Previous"
                isDisabled={page <= 1 || isLoading}
                clickAction={() => onPageChange(page - 1)}
              />
              <Text type="body" hasTabularNumbers weight="medium" style={{ fontSize: '13px' }}>
                {page} / {totalPages || 1}
              </Text>
              <Button
                variant="secondary"
                size="sm"
                label="Next"
                isDisabled={page >= totalPages || isLoading}
                clickAction={() => onPageChange(page + 1)}
              />
            </HStack>
          </div>
        </Card>
      </VStack>
    </Card>
  );
}
