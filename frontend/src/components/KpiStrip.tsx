'use client';

import React from 'react';
import { Card } from '@astryxdesign/core/Card';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { StackItem } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { Heading } from '@astryxdesign/core/Heading';
import { Badge } from '@astryxdesign/core/Badge';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import { formatUsd, formatNumber } from '../lib/formatters';
import type { StatsResponse } from '../lib/types';
import { Users, DollarSign, TrendingUp, Globe2 } from 'lucide-react';

interface KpiStripProps {
  stats?: StatsResponse;
  isLoading?: boolean;
}

export function KpiStrip({ stats, isLoading }: KpiStripProps) {
  const cards = [
    {
      title: 'Total Headcount',
      value: stats ? formatNumber(stats.totalHeadcount) : '...',
      subtitle: '99.4% active workforce',
      badge: '10,000 Global',
      badgeVariant: 'neutral' as const,
      icon: Users,
      progressValue: 100,
      progressVariant: 'neutral' as const,
      color: 'var(--color-primary-main, #2563eb)',
    },
    {
      title: 'Annualized Spend',
      value: stats ? formatUsd(stats.totalPayrollUsd) : '...',
      subtitle: 'Corporate FX normalized',
      badge: 'USD Normalized',
      badgeVariant: 'success' as const,
      icon: DollarSign,
      progressValue: 98,
      progressVariant: 'success' as const,
      color: 'var(--color-success-main, #16a34a)',
    },
    {
      title: 'Median Base Pay',
      value: stats ? formatUsd(stats.medianBaseSalaryUsd) : '...',
      subtitle: 'p50 global compensation',
      badge: 'Benchmark',
      badgeVariant: 'blue' as const,
      icon: TrendingUp,
      progressValue: 85,
      progressVariant: 'accent' as const,
      color: 'var(--color-blue-main, #0284c7)',
    },
    {
      title: 'Active Entities',
      value: stats ? `${stats.activeCountries} / 6` : '...',
      subtitle: 'US, DE, GB, IN, SG, JP',
      badge: 'Multi-Currency',
      badgeVariant: 'purple' as const,
      icon: Globe2,
      progressValue: 100,
      progressVariant: 'neutral' as const,
      color: 'var(--color-purple-main, #9333ea)',
    },
  ];

  return (
    <HStack gap={3} width="100%">
      {cards.map((card, idx) => {
        const IconComponent = card.icon;
        return (
          <StackItem key={idx} size="fill">
            <Card padding={3}>
              <VStack gap={2}>
                <HStack justify="between" align="center">
                  <HStack gap={1.5} align="center">
                    <IconComponent size={18} color={card.color} />
                    <Text type="supporting" color="secondary" weight="semibold">
                      {card.title}
                    </Text>
                  </HStack>
                  <Badge label={card.badge} variant={card.badgeVariant} />
                </HStack>

                <Heading level={2}>
                  {isLoading ? '...' : card.value}
                </Heading>

                <ProgressBar
                  label={card.title}
                  isLabelHidden
                  value={isLoading ? 20 : card.progressValue}
                  max={100}
                  variant={card.progressVariant}
                />

                <Text type="supporting" color="secondary">
                  {card.subtitle}
                </Text>
              </VStack>
            </Card>
          </StackItem>
        );
      })}
    </HStack>
  );
}
