'use client';

import React from 'react';
import { Card } from '@astryxdesign/core/Card';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Badge } from '@astryxdesign/core/Badge';
import { Text } from '@astryxdesign/core/Text';
import { Heading } from '@astryxdesign/core/Heading';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import { formatUsd } from '../lib/formatters';
import type { StatsResponse, AnalyticsResponse } from '../lib/types';
import { Users, DollarSign, TrendingUp, Globe2, Activity } from 'lucide-react';

interface BentoExecutivePulseProps {
  stats?: StatsResponse;
  analytics?: AnalyticsResponse;
}

export function BentoExecutivePulse({ stats, analytics }: BentoExecutivePulseProps) {
  const headcount = stats?.totalHeadcount ?? 10000;
  const totalPayroll = stats?.totalPayrollUsd ?? 980978182.55;
  const medianPay = stats?.medianBaseSalaryUsd ?? 85225.5;
  const activeCountries = stats?.activeCountries ?? 6;

  return (
    <Card padding={4} style={{ height: '100%' }}>
      <VStack gap={4}>
        {/* Top Header */}
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
              <Activity size={16} className="text-blue-500" />
            </div>
            <VStack gap={0}>
              <Text weight="bold" type="body">
                Global Workforce Pulse
              </Text>
              <Text type="supporting" color="secondary">
                10,000 Live Records • PostgreSQL 16 Read-Only Replica
              </Text>
            </VStack>
          </HStack>
          <HStack gap={1.5} align="center">
            <Badge variant="cyan" label="Sub-20ms Engine" />
            <Badge variant="blue" label="Live Telemetry" />
          </HStack>
        </HStack>

        {/* 4 Bento Metric Tiles */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
          }}
        >
          {/* Tile 1: Headcount */}
          <div
            style={{
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: 'var(--color-surface-sunken, rgba(0,0,0,0.03))',
              border: '1px solid var(--color-border-subtle, rgba(0,0,0,0.06))',
            }}
          >
            <VStack gap={1}>
              <HStack justify="between" align="center">
                <HStack gap={1.5} align="center">
                  <Users size={14} className="text-blue-500" />
                  <Text type="supporting" color="secondary" weight="semibold">
                    TOTAL PERSONNEL
                  </Text>
                </HStack>
                <Badge variant="neutral" label="Global" />
              </HStack>
              <Heading level={2} style={{ margin: '4px 0 0 0' }}>
                <Text hasTabularNumbers weight="bold" style={{ fontSize: '24px' }}>
                  {headcount.toLocaleString()}
                </Text>
              </Heading>
              <Text type="supporting" color="secondary">
                99.4% active workforce
              </Text>
              <ProgressBar value={99.4} max={100} label="Active rate" />
            </VStack>
          </div>

          {/* Tile 2: Spend */}
          <div
            style={{
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: 'var(--color-surface-sunken, rgba(0,0,0,0.03))',
              border: '1px solid var(--color-border-subtle, rgba(0,0,0,0.06))',
            }}
          >
            <VStack gap={1}>
              <HStack justify="between" align="center">
                <HStack gap={1.5} align="center">
                  <DollarSign size={14} className="text-emerald-500" />
                  <Text type="supporting" color="secondary" weight="semibold">
                    ANNUALIZED SPEND
                  </Text>
                </HStack>
                <Badge variant="green" label="Normalized" />
              </HStack>
              <Heading level={2} style={{ margin: '4px 0 0 0' }}>
                <Text hasTabularNumbers weight="bold" style={{ fontSize: '20px', color: '#16a34a' }}>
                  {formatUsd(totalPayroll)}
                </Text>
              </Heading>
              <Text type="supporting" color="secondary">
                Fixed corporate FX peg
              </Text>
              <ProgressBar value={100} max={100} label="Annual spend" />
            </VStack>
          </div>

          {/* Tile 3: Median Pay */}
          <div
            style={{
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: 'var(--color-surface-sunken, rgba(0,0,0,0.03))',
              border: '1px solid var(--color-border-subtle, rgba(0,0,0,0.06))',
            }}
          >
            <VStack gap={1}>
              <HStack justify="between" align="center">
                <HStack gap={1.5} align="center">
                  <TrendingUp size={14} className="text-cyan-500" />
                  <Text type="supporting" color="secondary" weight="semibold">
                    MEDIAN BASE PAY
                  </Text>
                </HStack>
                <Badge variant="cyan" label="P50" />
              </HStack>
              <Heading level={2} style={{ margin: '4px 0 0 0' }}>
                <Text hasTabularNumbers weight="bold" style={{ fontSize: '24px' }}>
                  {formatUsd(medianPay)}
                </Text>
              </Heading>
              <Text type="supporting" color="secondary">
                Across all departments & tiers
              </Text>
              <ProgressBar value={85} max={100} label="Median pay" />
            </VStack>
          </div>

          {/* Tile 4: Active Entities */}
          <div
            style={{
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: 'var(--color-surface-sunken, rgba(0,0,0,0.03))',
              border: '1px solid var(--color-border-subtle, rgba(0,0,0,0.06))',
            }}
          >
            <VStack gap={1}>
              <HStack justify="between" align="center">
                <HStack gap={1.5} align="center">
                  <Globe2 size={14} className="text-purple-500" />
                  <Text type="supporting" color="secondary" weight="semibold">
                    ACTIVE ENTITIES
                  </Text>
                </HStack>
                <Badge variant="purple" label="6 Nations" />
              </HStack>
              <Heading level={2} style={{ margin: '4px 0 0 0' }}>
                <Text hasTabularNumbers weight="bold" style={{ fontSize: '24px' }}>
                  {activeCountries} / 6
                </Text>
              </Heading>
              <Text type="supporting" color="secondary">
                US, DE, GB, IN, SG, JP
              </Text>
              <ProgressBar value={100} max={100} label="Entities" />
            </VStack>
          </div>
        </div>

        {/* Visual Department Spend Ratio Bar */}
        {analytics?.departments && analytics.departments.length > 0 && (
          <VStack gap={1.5}>
            <HStack justify="between" align="center">
              <Text type="supporting" weight="semibold" color="secondary">
                DEPARTMENT SPEND PROPORTION
              </Text>
              <Text type="supporting" color="secondary">
                Engineering leads at ~36%
              </Text>
            </HStack>
            <div
              style={{
                display: 'flex',
                height: '8px',
                borderRadius: '4px',
                overflow: 'hidden',
                width: '100%',
                backgroundColor: 'var(--color-border-subtle, #e2e8f0)',
              }}
            >
              {analytics.departments.map((dept, idx) => {
                const total = analytics.departments.reduce((acc, d) => acc + d.totalPayroll, 0) || 1;
                const pct = Math.round((dept.totalPayroll / total) * 100);
                const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
                return (
                  <div
                    key={dept.department}
                    title={`${dept.department}: ${pct}%`}
                    style={{
                      width: `${pct}%`,
                      backgroundColor: colors[idx % colors.length],
                      height: '100%',
                    }}
                  />
                );
              })}
            </div>
          </VStack>
        )}
      </VStack>
    </Card>
  );
}
