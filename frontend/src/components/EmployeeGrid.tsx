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
        <Table<EmployeeRow>
          data={employees as EmployeeRow[]}
          columns={columns}
          idKey="id"
          hasHover
          dividers="rows"
        />

        <Card variant="transparent" padding={3}>
          <HStack justify="between" align="center" width="100%">
            <HStack gap={2} align="center">
              <Text type="supporting" color="secondary">
                {isLoading
                  ? 'Querying indexed records...'
                  : `Showing ${startRecord.toLocaleString()}–${endRecord.toLocaleString()} of ${totalCount.toLocaleString()} employees`}
              </Text>
              <Badge variant="neutral" label="Sub-50ms P95" />
            </HStack>

            <HStack gap={2} align="center">
              <Button
                variant="secondary"
                size="sm"
                label="Previous"
                isDisabled={page <= 1 || isLoading}
                clickAction={() => onPageChange(page - 1)}
              />
              <Text type="body" hasTabularNumbers weight="medium">
                Page {page} of {totalPages || 1}
              </Text>
              <Button
                variant="secondary"
                size="sm"
                label="Next"
                isDisabled={page >= totalPages || isLoading}
                clickAction={() => onPageChange(page + 1)}
              />
            </HStack>
          </HStack>
        </Card>
      </VStack>
    </Card>
  );
}
