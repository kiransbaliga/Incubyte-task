'use client';

import React from 'react';
import { Card } from '@astryxdesign/core/Card';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Badge } from '@astryxdesign/core/Badge';
import { Text } from '@astryxdesign/core/Text';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import { formatUsd } from '../lib/formatters';
import type { DepartmentStat } from '../lib/types';
import { Briefcase, Check } from 'lucide-react';

interface BentoDepartmentMatrixProps {
  departments?: DepartmentStat[];
  selectedDepartment?: string;
  onSelectDepartment: (dept: string) => void;
}

const DEFAULT_DEPTS: DepartmentStat[] = [
  { department: 'Engineering', totalPayroll: 361438574.38, headcount: 3301, avgSalary: 109493, medianSalary: 96300 },
  { department: 'Sales', totalPayroll: 165190399.82, headcount: 1846, avgSalary: 89485, medianSalary: 79503.42 },
  { department: 'Product', totalPayroll: 138208061.17, headcount: 1310, avgSalary: 105502, medianSalary: 92072.7 },
  { department: 'Design', totalPayroll: 88469544.84, headcount: 942, avgSalary: 93916, medianSalary: 83358 },
  { department: 'People', totalPayroll: 78953071.2, headcount: 937, avgSalary: 84261, medianSalary: 74100 },
  { department: 'Operations', totalPayroll: 77716592.68, headcount: 935, avgSalary: 83119, medianSalary: 73759.2 },
];

export function BentoDepartmentMatrix({
  departments = DEFAULT_DEPTS,
  selectedDepartment,
  onSelectDepartment,
}: BentoDepartmentMatrixProps) {
  const depts = departments && departments.length > 0 ? departments : DEFAULT_DEPTS;
  const totalAllSpend = depts.reduce((acc, d) => acc + d.totalPayroll, 0) || 1;

  return (
    <Card padding={4} style={{ height: '100%' }}>
      <VStack gap={3}>
        {/* Header */}
        <HStack justify="between" align="center">
          <HStack gap={2} align="center">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-surface-sunken, rgba(0,0,0,0.06))',
              }}
            >
              <Briefcase size={16} className="text-purple-500" />
            </div>
            <VStack gap={0}>
              <Text weight="bold" type="body">
                Functional Department Allocation
              </Text>
              <Text type="supporting" color="secondary">
                Click any department card to filter 10,000 workforce records
              </Text>
            </VStack>
          </HStack>
          {selectedDepartment && selectedDepartment !== 'all' ? (
            <Badge variant="blue" label={`Filtered: ${selectedDepartment}`} />
          ) : (
            <Badge variant="neutral" label="6 Business Units" />
          )}
        </HStack>

        {/* 6 Grid Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: '10px',
          }}
        >
          {depts.map((dept) => {
            const isSelected = selectedDepartment?.toLowerCase() === dept.department.toLowerCase();
            const spendShare = Math.round((dept.totalPayroll / totalAllSpend) * 100);

            return (
              <div
                key={dept.department}
                onClick={() => onSelectDepartment(isSelected ? 'all' : dept.department)}
                className={`interactive-bento-card ${isSelected ? 'is-active' : ''}`}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  backgroundColor: isSelected
                    ? 'var(--color-surface-hover, rgba(59, 130, 246, 0.08))'
                    : 'var(--color-surface-sunken, rgba(0,0,0,0.03))',
                  border: isSelected
                    ? '2px solid var(--color-primary-main, #3b82f6)'
                    : '1px solid var(--color-border-subtle, rgba(0,0,0,0.06))',
                  cursor: 'pointer',
                }}
              >
                <VStack gap={1}>
                  <HStack justify="between" align="center">
                    <Text weight="bold" type="body">
                      {dept.department}
                    </Text>
                    <HStack gap={1} align="center">
                      <Badge variant={isSelected ? 'blue' : 'neutral'} label={`${spendShare}%`} />
                      {isSelected && <Check size={12} className="text-blue-500" />}
                    </HStack>
                  </HStack>

                  <HStack justify="between" align="end">
                    <VStack gap={0}>
                      <Text type="supporting" color="secondary">
                        Total Spend
                      </Text>
                      <Text hasTabularNumbers weight="semibold" style={{ fontSize: '13px' }}>
                        {formatUsd(dept.totalPayroll)}
                      </Text>
                    </VStack>
                    <VStack gap={0} align="end">
                      <Text type="supporting" color="secondary">
                        Headcount
                      </Text>
                      <Text hasTabularNumbers style={{ fontSize: '12px' }}>
                        {dept.headcount.toLocaleString()}
                      </Text>
                    </VStack>
                  </HStack>

                  <ProgressBar
                    value={spendShare}
                    max={40}
                    label={`${dept.department} spend`}
                  />
                </VStack>
              </div>
            );
          })}
        </div>
      </VStack>
    </Card>
  );
}
