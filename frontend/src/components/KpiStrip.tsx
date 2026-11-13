'use client';

import React from 'react';
import { Card } from '@astryxdesign/core/Card';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { StackItem } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { Heading } from '@astryxdesign/core/Heading';
import { Badge } from '@astryxdesign/core/Badge';
import { formatUsd, formatNumber } from '../lib/formatters';
import type { StatsResponse } from '../lib/types';

interface KpiStripProps {
  stats?: StatsResponse;
  isLoading?: boolean;
}

export function KpiStrip({ stats, isLoading }: KpiStripProps) {
  const cards = [
    {
      title: 'Total Headcount',
      value: stats ? formatNumber(stats.totalHeadcount) : '...',
      subtitle: 'Active global workforce',
      badge: '10k Dataset',
      variant: 'neutral' as const,
    },
    {
      title: 'Annualized Payroll',
      value: stats ? formatUsd(stats.totalPayrollUsd) : '...',
      subtitle: 'Normalized USD spend',
      badge: 'Precomputed FX',
      variant: 'success' as const,
    },
    {
      title: 'Median Base Pay',
      value: stats ? formatUsd(stats.medianBaseSalaryUsd) : '...',
      subtitle: '50th percentile benchmark',
      badge: 'Equitable Pay',
      variant: 'blue' as const,
    },
    {
      title: 'Active Countries',
      value: stats ? `${stats.activeCountries} / 6` : '...',
      subtitle: 'US, DE, GB, IN, SG, JP',
      badge: 'Multi-Currency',
      variant: 'purple' as const,
    },
  ];

  return (
    <HStack gap={3} width="100%">
      {cards.map((card, idx) => (
        <StackItem key={idx} size="fill">
          <Card padding={3}>
            <VStack gap={1.5}>
              <HStack justify="between" align="center">
                <Text type="supporting" color="secondary" weight="semibold">
                  {card.title}
                </Text>
                <Badge label={card.badge} variant={card.variant} />
              </HStack>
              <Heading level={2}>
                {isLoading ? '...' : card.value}
              </Heading>
              <Text type="supporting" color="secondary">
                {card.subtitle}
              </Text>
            </VStack>
          </Card>
        </StackItem>
      ))}
    </HStack>
  );
}
