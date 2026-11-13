'use client';

import React from 'react';
import { Card } from '@astryxdesign/core/Card';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Text } from '@astryxdesign/core/Text';
import { Badge } from '@astryxdesign/core/Badge';
import { Button } from '@astryxdesign/core/Button';
import { Table, proportional, pixel, type TableColumn } from '@astryxdesign/core/Table';
import { formatLocalCurrency, formatUsd } from '../lib/formatters';
import type { Employee } from '../lib/types';

export type EmployeeRow = Employee & Record<string, unknown>;

export interface EmployeeGridProps {
  employees: Employee[];
  isLoading?: boolean;
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  onEdit: (employee: Employee) => void;
}

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
      width: proportional(1, { minWidth: 100 }),
      renderCell: (item) => (
        <Text weight="semibold">{item.employeeCode}</Text>
      ),
    },
    {
      key: 'nameEmail',
      header: 'Name & Email',
      width: proportional(2, { minWidth: 180 }),
      renderCell: (item) => (
        <VStack gap={0.5}>
          <Text weight="semibold">{item.fullName}</Text>
          <Text type="supporting" color="secondary">{item.email}</Text>
        </VStack>
      ),
    },
    {
      key: 'deptLevel',
      header: 'Dept & Level',
      width: proportional(1.5, { minWidth: 130 }),
      renderCell: (item) => (
        <HStack gap={1} align="center">
          <Text>{item.department}</Text>
          <Badge variant="neutral" label={item.level} />
        </HStack>
      ),
    },
    {
      key: 'country',
      header: 'Country',
      width: proportional(0.8, { minWidth: 80 }),
      renderCell: (item) => (
        <Text>{item.country}</Text>
      ),
    },
    {
      key: 'localSalary',
      header: 'Local Compensation',
      width: proportional(1.5, { minWidth: 130 }),
      renderCell: (item) => (
        <VStack gap={0.5}>
          <Text hasTabularNumbers>
            {formatLocalCurrency(item.localBaseSalary, item.localCurrency)}
          </Text>
          {Number(item.localBonusTarget) > 0 && (
            <Text type="supporting" color="secondary" hasTabularNumbers>
              + {formatLocalCurrency(item.localBonusTarget, item.localCurrency)} bonus
            </Text>
          )}
        </VStack>
      ),
    },
    {
      key: 'baseSalaryUsd',
      header: 'Normalized USD Salary',
      width: proportional(1.5, { minWidth: 130 }),
      renderCell: (item) => (
        <VStack gap={0.5}>
          <Text weight="semibold" hasTabularNumbers>
            {formatUsd(item.baseSalaryUsd)}
          </Text>
          {Number(item.bonusTargetUsd) > 0 && (
            <Text type="supporting" color="secondary" hasTabularNumbers>
              + {formatUsd(item.bonusTargetUsd)} bonus
            </Text>
          )}
        </VStack>
      ),
    },
    {
      key: 'employmentStatus',
      header: 'Status',
      width: proportional(1, { minWidth: 90 }),
      renderCell: (item) => {
        const variant =
          item.employmentStatus === 'active'
            ? 'success'
            : item.employmentStatus === 'inactive'
            ? 'warning'
            : 'error';
        return (
          <Badge
            variant={variant}
            label={item.employmentStatus.charAt(0).toUpperCase() + item.employmentStatus.slice(1)}
          />
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      width: pixel(80),
      renderCell: (item) => (
        <Button
          variant="ghost"
          size="sm"
          label="Edit"
          onClick={() => onEdit(item)}
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
            <Text type="supporting" color="secondary">
              {isLoading
                ? 'Loading records...'
                : `Showing ${startRecord}–${endRecord} of ${totalCount.toLocaleString()} employees`}
            </Text>
            <HStack gap={2} align="center">
              <Button
                variant="secondary"
                size="sm"
                label="Previous"
                isDisabled={page <= 1 || isLoading}
                onClick={() => onPageChange(page - 1)}
              />
              <Text type="body">
                Page {page} of {totalPages || 1}
              </Text>
              <Button
                variant="secondary"
                size="sm"
                label="Next"
                isDisabled={page >= totalPages || isLoading}
                onClick={() => onPageChange(page + 1)}
              />
            </HStack>
          </HStack>
        </Card>
      </VStack>
    </Card>
  );
}
