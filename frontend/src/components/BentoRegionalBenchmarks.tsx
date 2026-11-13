'use client';

import React from 'react';
import { Card } from '@astryxdesign/core/Card';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Badge } from '@astryxdesign/core/Badge';
import { Text } from '@astryxdesign/core/Text';
import { formatUsd } from '../lib/formatters';
import type { CountryStat } from '../lib/types';
import { Globe, Check } from 'lucide-react';

interface BentoRegionalBenchmarksProps {
  countries?: CountryStat[];
  selectedCountry?: string;
  onSelectCountry: (country: string) => void;
}

const COUNTRY_FLAGS: Record<string, string> = {
  US: '🇺🇸',
  DE: '🇩🇪',
  GB: '🇬🇧',
  IN: '🇮🇳',
  SG: '🇸🇬',
  JP: '🇯🇵',
};

const COUNTRY_CURRENCIES: Record<string, string> = {
  US: 'USD',
  DE: 'EUR',
  GB: 'GBP',
  IN: 'INR',
  SG: 'SGD',
  JP: 'JPY',
};

const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States',
  DE: 'Germany',
  GB: 'United Kingdom',
  IN: 'India',
  SG: 'Singapore',
  JP: 'Japan',
};

const DEFAULT_COUNTRIES: CountryStat[] = [
  { country: 'US', headcount: 2500, totalPayroll: 275500000, avgSalary: 114500, medianSalary: 110200 },
  { country: 'DE', headcount: 1500, totalPayroll: 132600000, avgSalary: 91200, medianSalary: 88400 },
  { country: 'GB', headcount: 1500, totalPayroll: 127500000, avgSalary: 87800, medianSalary: 85000 },
  { country: 'SG', headcount: 1500, totalPayroll: 118350000, avgSalary: 81500, medianSalary: 78900 },
  { country: 'JP', headcount: 1500, totalPayroll: 108150000, avgSalary: 74600, medianSalary: 72100 },
  { country: 'IN', headcount: 1500, totalPayroll: 48750000, avgSalary: 34100, medianSalary: 32500 },
];

export function BentoRegionalBenchmarks({
  countries = DEFAULT_COUNTRIES,
  selectedCountry,
  onSelectCountry,
}: BentoRegionalBenchmarksProps) {
  const items = countries && countries.length > 0 ? countries : DEFAULT_COUNTRIES;

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
              <Globe size={16} className="text-cyan-500" />
            </div>
            <VStack gap={0}>
              <Text weight="bold" type="body">
                Global Regional Benchmarks
              </Text>
              <Text type="supporting" color="secondary">
                Click any regional entity to filter 10,000 workforce records
              </Text>
            </VStack>
          </HStack>
          {selectedCountry && selectedCountry !== 'all' ? (
            <Badge variant="blue" label={`Filtered: ${selectedCountry}`} />
          ) : (
            <Badge variant="cyan" label="6 Operating Entities" />
          )}
        </HStack>

        {/* 6 Country Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: '10px',
          }}
        >
          {items.map((bm) => {
            const flag = COUNTRY_FLAGS[bm.country] || '🌐';
            const currency = COUNTRY_CURRENCIES[bm.country] || 'USD';
            const name = COUNTRY_NAMES[bm.country] || bm.country;
            const isSelected = selectedCountry?.toUpperCase() === bm.country.toUpperCase();

            return (
              <div
                key={bm.country}
                onClick={() => onSelectCountry(isSelected ? 'all' : bm.country)}
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
                    <HStack gap={1.5} align="center">
                      <span style={{ fontSize: '18px' }}>{flag}</span>
                      <Text weight="bold" type="body">
                        {bm.country}
                      </Text>
                    </HStack>
                    <HStack gap={1} align="center">
                      <Badge variant="neutral" label={currency} />
                      {isSelected && <Check size={12} className="text-blue-500" />}
                    </HStack>
                  </HStack>

                  <Text type="supporting" color="secondary" style={{ fontSize: '11px' }}>
                    {name}
                  </Text>

                  <HStack justify="between" align="end">
                    <VStack gap={0}>
                      <Text type="supporting" color="secondary">
                        Median USD Pay
                      </Text>
                      <Text hasTabularNumbers weight="bold" style={{ fontSize: '14px', color: '#0284c7' }}>
                        {formatUsd(bm.medianSalary)}
                      </Text>
                    </VStack>
                    <VStack gap={0} align="end">
                      <Text type="supporting" color="secondary">
                        Personnel
                      </Text>
                      <Text hasTabularNumbers style={{ fontSize: '12px' }}>
                        {bm.headcount.toLocaleString()}
                      </Text>
                    </VStack>
                  </HStack>
                </VStack>
              </div>
            );
          })}
        </div>
      </VStack>
    </Card>
  );
}
