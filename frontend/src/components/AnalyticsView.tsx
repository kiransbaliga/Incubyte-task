'use client';

import React from 'react';
import { Card } from '@astryxdesign/core/Card';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Badge } from '@astryxdesign/core/Badge';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import { Grid } from '@astryxdesign/core/Grid';
import { Divider } from '@astryxdesign/core/Divider';
import { formatUsd, formatNumber } from '../lib/formatters';
import type { AnalyticsResponse, DepartmentStat, CountryStat, LevelStat } from '../lib/types';
import { Building2, Globe, TrendingUp, Award, DollarSign, Users } from 'lucide-react';

interface AnalyticsViewProps {
  analytics?: AnalyticsResponse;
  isLoading?: boolean;
}

const COUNTRY_NAMES: Record<string, { name: string; currency: string; flag: string }> = {
  US: { name: 'United States', currency: 'USD', flag: '🇺🇸' },
  IN: { name: 'India', currency: 'INR', flag: '🇮🇳' },
  DE: { name: 'Germany', currency: 'EUR', flag: '🇩🇪' },
  GB: { name: 'United Kingdom', currency: 'GBP', flag: '🇬🇧' },
  SG: { name: 'Singapore', currency: 'SGD', flag: '🇸🇬' },
  JP: { name: 'Japan', currency: 'JPY', flag: '🇯🇵' },
};

const LEVEL_LABELS: Record<string, string> = {
  L1: 'Associate / Entry',
  L2: 'Mid-Level',
  L3: 'Senior',
  L4: 'Staff / Lead',
  L5: 'Principal',
  L6: 'Director / VP',
};

export function AnalyticsView({ analytics, isLoading }: AnalyticsViewProps) {
  if (isLoading || !analytics) {
    return (
      <Card padding={6}>
        <VStack gap={3} align="center" justify="center">
          <Text type="body" color="secondary">
            Aggregating global compensation distributions across 10,000 employees...
          </Text>
        </VStack>
      </Card>
    );
  }

  const { departments, countries, levels } = analytics;

  // Calculate maximums for proportional progress bars
  const maxDeptPayroll = Math.max(...departments.map((d) => d.totalPayroll), 1);
  const totalEmployees = countries.reduce((acc, c) => acc + c.headcount, 0) || 10000;
  const maxLevelSalary = Math.max(...levels.map((l) => l.medianSalary), 1);

  return (
    <VStack gap={5} width="100%">
      {/* SECTION 1: Department Compensation & Org Spend */}
      <Card padding={4}>
        <VStack gap={4}>
          <HStack justify="between" align="center">
            <HStack gap={2} align="center">
              <Building2 size={20} color="var(--color-primary-main, #2563eb)" />
              <Heading level={3}>Department Compensation & Spend Allocation</Heading>
            </HStack>
            <Badge variant="blue" label={`${departments.length} Functional Orgs`} />
          </HStack>

          <Text type="supporting" color="secondary">
            Normalized annual USD payroll spend, headcount allocation, and median compensation per functional department.
          </Text>

          <Grid columns={{ minWidth: 320, repeat: 'fit' }} gap={3}>
            {departments.map((dept: DepartmentStat) => {
              const spendPercentage = Math.round((dept.totalPayroll / maxDeptPayroll) * 100);
              const headcountShare = ((dept.headcount / totalEmployees) * 100).toFixed(1);

              return (
                <Card key={dept.department} padding={3}>
                  <VStack gap={2}>
                    <HStack justify="between" align="center">
                      <HStack gap={1.5} align="center">
                        <Text weight="semibold">{dept.department}</Text>
                        <Badge variant="neutral" label={`${headcountShare}% Org`} />
                      </HStack>
                      <Text type="supporting" color="secondary" hasTabularNumbers>
                        {formatNumber(dept.headcount)} employees
                      </Text>
                    </HStack>

                    <HStack justify="between" align="end">
                      <VStack gap={0.5}>
                        <Text type="supporting" color="secondary">Total Spend</Text>
                        <Text weight="semibold" hasTabularNumbers>
                          {formatUsd(dept.totalPayroll)}
                        </Text>
                      </VStack>
                      <VStack gap={0.5} align="end">
                        <Text type="supporting" color="secondary">Median Pay</Text>
                        <Text weight="semibold" hasTabularNumbers>
                          {formatUsd(dept.medianSalary)}
                        </Text>
                      </VStack>
                    </HStack>

                    <ProgressBar
                      label={`${dept.department} Spend`}
                      isLabelHidden
                      value={spendPercentage}
                      max={100}
                      variant="accent"
                    />
                  </VStack>
                </Card>
              );
            })}
          </Grid>
        </VStack>
      </Card>

      {/* SECTION 2: Global Regional Distribution (6 Countries) */}
      <Card padding={4}>
        <VStack gap={4}>
          <HStack justify="between" align="center">
            <HStack gap={2} align="center">
              <Globe size={20} color="var(--color-success-main, #16a34a)" />
              <Heading level={3}>Global Regional Benchmarks (6 Entities)</Heading>
            </HStack>
            <Badge variant="success" label="Precomputed Corporate FX" />
          </HStack>

          <Text type="supporting" color="secondary">
            Cross-border headcount distribution and median salary benchmarking converted to USD corporate planning rates.
          </Text>

          <Grid columns={{ minWidth: 320, repeat: 'fit' }} gap={3}>
            {countries.map((c: CountryStat) => {
              const meta = COUNTRY_NAMES[c.country] || { name: c.country, currency: 'USD', flag: '🌐' };
              const regionalShare = Math.round((c.headcount / totalEmployees) * 100);

              return (
                <Card key={c.country} padding={3}>
                  <VStack gap={2}>
                    <HStack justify="between" align="center">
                      <HStack gap={1.5} align="center">
                        <Text>{meta.flag}</Text>
                        <Text weight="semibold">{meta.name} ({c.country})</Text>
                      </HStack>
                      <Badge variant="neutral" label={meta.currency} />
                    </HStack>

                    <HStack justify="between" align="end">
                      <VStack gap={0.5}>
                        <Text type="supporting" color="secondary">Workforce</Text>
                        <Text weight="semibold" hasTabularNumbers>
                          {formatNumber(c.headcount)} ({regionalShare}%)
                        </Text>
                      </VStack>
                      <VStack gap={0.5} align="end">
                        <Text type="supporting" color="secondary">Median USD Pay</Text>
                        <Text weight="semibold" hasTabularNumbers>
                          {formatUsd(c.medianSalary)}
                        </Text>
                      </VStack>
                    </HStack>

                    <ProgressBar
                      label={`${meta.name} Headcount`}
                      isLabelHidden
                      value={regionalShare}
                      max={100}
                      variant="success"
                    />
                  </VStack>
                </Card>
              );
            })}
          </Grid>
        </VStack>
      </Card>

      {/* SECTION 3: Career Level Bands (L1 to L6) */}
      <Card padding={4}>
        <VStack gap={4}>
          <HStack justify="between" align="center">
            <HStack gap={2} align="center">
              <TrendingUp size={20} color="var(--color-purple-main, #9333ea)" />
              <Heading level={3}>Compensation Hierarchy Bands (L1–L6)</Heading>
            </HStack>
            <Badge variant="purple" label="6 Job Tiers" />
          </HStack>

          <Text type="supporting" color="secondary">
            Global salary progression across job levels from Associate (L1) through Executive Leadership (L6).
          </Text>

          <Grid columns={{ minWidth: 320, repeat: 'fit' }} gap={3}>
            {levels.map((lvl: LevelStat) => {
              const progressionPct = Math.round((lvl.medianSalary / maxLevelSalary) * 100);
              const label = LEVEL_LABELS[lvl.level] || lvl.level;

              return (
                <Card key={lvl.level} padding={3}>
                  <VStack gap={2}>
                    <HStack justify="between" align="center">
                      <HStack gap={1.5} align="center">
                        <Badge variant="blue" label={lvl.level} />
                        <Text weight="semibold">{label}</Text>
                      </HStack>
                      <Text type="supporting" color="secondary" hasTabularNumbers>
                        {formatNumber(lvl.headcount)} staff
                      </Text>
                    </HStack>

                    <HStack justify="between" align="end">
                      <VStack gap={0.5}>
                        <Text type="supporting" color="secondary">Median USD Base</Text>
                        <Text weight="semibold" hasTabularNumbers>
                          {formatUsd(lvl.medianSalary)}
                        </Text>
                      </VStack>
                      <VStack gap={0.5} align="end">
                        <Text type="supporting" color="secondary">Average USD Base</Text>
                        <Text weight="semibold" hasTabularNumbers>
                          {formatUsd(lvl.avgSalary)}
                        </Text>
                      </VStack>
                    </HStack>

                    <ProgressBar
                      label={`${lvl.level} Salary Progression`}
                      isLabelHidden
                      value={progressionPct}
                      max={100}
                      variant="neutral"
                    />
                  </VStack>
                </Card>
              );
            })}
          </Grid>
        </VStack>
      </Card>
    </VStack>
  );
}
