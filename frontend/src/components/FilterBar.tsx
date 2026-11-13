'use client';

import React from 'react';
import { Card } from '@astryxdesign/core/Card';
import { HStack } from '@astryxdesign/core/HStack';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Selector } from '@astryxdesign/core/Selector';
import { Button } from '@astryxdesign/core/Button';

export interface FilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  department: string;
  onDepartmentChange: (value: string) => void;
  country: string;
  onCountryChange: (value: string) => void;
  level: string;
  onLevelChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  onReset: () => void;
}

const DEPARTMENT_OPTIONS = [
  { value: 'all', label: 'All Departments' },
  { value: 'Engineering', label: 'Engineering' },
  { value: 'Product', label: 'Product' },
  { value: 'Design', label: 'Design' },
  { value: 'Sales', label: 'Sales' },
  { value: 'Operations', label: 'Operations' },
  { value: 'People', label: 'People' },
];

const COUNTRY_OPTIONS = [
  { value: 'all', label: 'All Countries' },
  { value: 'US', label: 'United States (US)' },
  { value: 'DE', label: 'Germany (DE)' },
  { value: 'GB', label: 'United Kingdom (GB)' },
  { value: 'IN', label: 'India (IN)' },
  { value: 'SG', label: 'Singapore (SG)' },
  { value: 'JP', label: 'Japan (JP)' },
];

const LEVEL_OPTIONS = [
  { value: 'all', label: 'All Levels' },
  { value: 'L1', label: 'L1' },
  { value: 'L2', label: 'L2' },
  { value: 'L3', label: 'L3' },
  { value: 'L4', label: 'L4' },
  { value: 'L5', label: 'L5' },
  { value: 'L6', label: 'L6' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'terminated', label: 'Terminated' },
];

export function FilterBar({
  search,
  onSearchChange,
  department,
  onDepartmentChange,
  country,
  onCountryChange,
  level,
  onLevelChange,
  status,
  onStatusChange,
  onReset,
}: FilterBarProps) {
  return (
    <Card padding={3}>
      <HStack gap={3} align="end" wrap="wrap" width="100%">
        <TextInput
          label="Search Employee"
          placeholder="Name, email, or ACME-ID..."
          value={search}
          onChange={(val) => onSearchChange(val)}
          width={240}
        />
        <Selector
          label="Department"
          options={DEPARTMENT_OPTIONS}
          value={department}
          onChange={(val) => onDepartmentChange(val)}
          width={160}
        />
        <Selector
          label="Country"
          options={COUNTRY_OPTIONS}
          value={country}
          onChange={(val) => onCountryChange(val)}
          width={160}
        />
        <Selector
          label="Level"
          options={LEVEL_OPTIONS}
          value={level}
          onChange={(val) => onLevelChange(val)}
          width={130}
        />
        <Selector
          label="Status"
          options={STATUS_OPTIONS}
          value={status}
          onChange={(val) => onStatusChange(val)}
          width={130}
        />
        <Button
          variant="secondary"
          label="Reset Filters"
          clickAction={onReset}
        />
      </HStack>
    </Card>
  );
}
