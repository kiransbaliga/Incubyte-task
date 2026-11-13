'use client';

import React, { useState } from 'react';
import { Card } from '@astryxdesign/core/Card';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Button } from '@astryxdesign/core/Button';
import { Badge } from '@astryxdesign/core/Badge';
import { Text } from '@astryxdesign/core/Text';
import { Heading } from '@astryxdesign/core/Heading';
import { Selector } from '@astryxdesign/core/Selector';
import { Table } from '@astryxdesign/core/Table';
import { formatUsd } from '../lib/formatters';
import type { FxRateItem } from '../lib/types';
import { ArrowRightLeft, DollarSign, Calculator, Globe } from 'lucide-react';

interface FxRatesViewProps {
  rates?: Record<string, number>;
  fxList?: FxRateItem[];
}

const DEFAULT_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 1.086,
  GBP: 1.263,
  INR: 0.0119,
  SGD: 0.745,
  JPY: 0.0067,
};

const CURRENCY_OPTIONS = [
  { value: 'EUR', label: 'EUR (€) - Euro (Germany)' },
  { value: 'GBP', label: 'GBP (£) - British Pound (UK)' },
  { value: 'INR', label: 'INR (₹) - Indian Rupee (India)' },
  { value: 'SGD', label: 'SGD (S$) - Singapore Dollar (Singapore)' },
  { value: 'JPY', label: 'JPY (¥) - Japanese Yen (Japan)' },
  { value: 'USD', label: 'USD ($) - US Dollar (United States)' },
];

export function FxRatesView({ rates = DEFAULT_RATES, fxList }: FxRatesViewProps) {
  const [amount, setAmount] = useState<number>(100000);
  const [currency, setCurrency] = useState<string>('EUR');

  const currentRate = rates[currency] || DEFAULT_RATES[currency] || 1;
  const normalizedUsd = amount * currentRate;

  const tableData = [
    { entity: 'United States', code: 'USD', symbol: '$', rateToUsd: '1.000000', effective: '2026-01-01', example: '$100,000 USD = $100,000.00' },
    { entity: 'Germany (EU)', code: 'EUR', symbol: '€', rateToUsd: '1.086000', effective: '2026-01-01', example: '€100,000 EUR = $108,600.00' },
    { entity: 'United Kingdom', code: 'GBP', symbol: '£', rateToUsd: '1.263000', effective: '2026-01-01', example: '£100,000 GBP = $126,300.00' },
    { entity: 'Singapore', code: 'SGD', symbol: 'S$', rateToUsd: '0.745000', effective: '2026-01-01', example: 'S$100,000 SGD = $74,500.00' },
    { entity: 'India', code: 'INR', symbol: '₹', rateToUsd: '0.011900', effective: '2026-01-01', example: '₹10,000,000 INR = $119,000.00' },
    { entity: 'Japan', code: 'JPY', symbol: '¥', rateToUsd: '0.006700', effective: '2026-01-01', example: '¥10,000,000 JPY = $67,000.00' },
  ];

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <Heading level={2}>FX Normalization & Corporate Pegs</Heading>
        <Text color="secondary" type="body">
          Fixed quarterly corporate planning rates used for global compensation benchmarking and normalized USD reporting
        </Text>
      </div>

      {/* Interactive Converter Card */}
      <div className="clean-stat-card">
        <VStack gap={4}>
          <HStack justify="between" align="center">
            <HStack gap={2} align="center">
              <Calculator size={20} className="text-emerald-600" />
              <Heading level={3}>Real-Time Currency Normalization Calculator</Heading>
            </HStack>
            <Badge variant="green" label="1 USD Benchmark" />
          </HStack>

          <div
            style={{
              display: 'flex',
              gap: '16px',
              alignItems: 'flex-end',
              flexWrap: 'wrap',
              backgroundColor: 'var(--color-surface-subtle, #f8fafc)',
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid var(--color-border-subtle, #e2e8f0)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary, #64748b)' }}>
                Local Currency Amount
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value) || 0)}
                style={{
                  width: '180px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border-subtle, #e2e8f0)',
                  backgroundColor: 'var(--color-surface-default, #fff)',
                  color: 'inherit',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '15px',
                }}
              />
            </div>

            <div style={{ minWidth: '240px' }}>
              <Selector
                label="Currency"
                value={currency}
                onChange={(val) => setCurrency(val as string)}
                options={CURRENCY_OPTIONS}
              />
            </div>

            <div
              style={{
                flex: 1,
                minWidth: '220px',
                backgroundColor: 'var(--color-surface-default, #ffffff)',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid var(--color-border-subtle, #e2e8f0)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <VStack gap={0}>
                <Text type="supporting" color="secondary">
                  Normalized Base Pay (USD)
                </Text>
                <Text weight="bold" hasTabularNumbers style={{ fontSize: '20px', color: '#15803d' }}>
                  {formatUsd(normalizedUsd)}
                </Text>
              </VStack>
              <Badge variant="neutral" label={`Rate: ${currentRate}`} />
            </div>
          </div>
        </VStack>
      </div>

      {/* Corporate Rates Table */}
      <div className="clean-stat-card">
        <VStack gap={3}>
          <Heading level={3}>Corporate Reference Rates Schedule (2026)</Heading>
          <Table
            data={tableData}
            columns={[
              { key: 'entity', header: 'OPERATING ENTITY', renderCell: (row) => <Text weight="semibold">{row.entity}</Text> },
              { key: 'code', header: 'CURRENCY', renderCell: (row) => <Badge variant="blue" label={row.code} /> },
              { key: 'rateToUsd', header: 'MULTIPLIER TO USD', renderCell: (row) => <Text hasTabularNumbers>{row.rateToUsd}</Text> },
              { key: 'example', header: 'CONVERSION EXAMPLE', renderCell: (row) => <Text type="supporting" color="secondary">{row.example}</Text> },
              { key: 'effective', header: 'EFFECTIVE DATE', renderCell: (row) => <Text>{row.effective}</Text> },
            ]}
            density="compact"
            dividers="grid"
          />
        </VStack>
      </div>
    </div>
  );
}
