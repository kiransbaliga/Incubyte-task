'use client';

import React, { useState } from 'react';
import { Card } from '@astryxdesign/core/Card';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Badge } from '@astryxdesign/core/Badge';
import { Text } from '@astryxdesign/core/Text';
import { Selector } from '@astryxdesign/core/Selector';
import { formatUsd } from '../lib/formatters';
import { ArrowRightLeft } from 'lucide-react';

interface BentoFxConverterProps {
  rates?: Record<string, number>;
}

const DEFAULT_RATES: Record<string, number> = {
  EUR: 1.086,
  GBP: 1.263,
  INR: 0.0119,
  SGD: 0.745,
  JPY: 0.0067,
  USD: 1.0,
};

const CURRENCY_OPTIONS = [
  { value: 'EUR', label: 'EUR (€) - Euro' },
  { value: 'GBP', label: 'GBP (£) - British Pound' },
  { value: 'INR', label: 'INR (₹) - Indian Rupee' },
  { value: 'SGD', label: 'SGD (S$) - Singapore Dollar' },
  { value: 'JPY', label: 'JPY (¥) - Japanese Yen' },
  { value: 'USD', label: 'USD ($) - US Dollar' },
];

export function BentoFxConverter({ rates = DEFAULT_RATES }: BentoFxConverterProps) {
  const [amount, setAmount] = useState<number>(100000);
  const [currency, setCurrency] = useState<string>('EUR');

  const currentRate = rates[currency] || DEFAULT_RATES[currency] || 1;
  const normalizedUsd = amount * currentRate;

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
              <ArrowRightLeft size={16} className="text-emerald-500" />
            </div>
            <VStack gap={0}>
              <Text weight="bold" type="body">
                FX Normalization Engine
              </Text>
              <Text type="supporting" color="secondary">
                Live Corporate Planning Rates
              </Text>
            </VStack>
          </HStack>
          <Badge variant="green" label="1 USD Peg Benchmark" />
        </HStack>

        {/* Currency Calculator Box */}
        <div
          style={{
            backgroundColor: 'var(--color-surface-sunken, rgba(0,0,0,0.03))',
            borderRadius: '10px',
            padding: '12px',
            border: '1px solid var(--color-border-subtle, rgba(0,0,0,0.08))',
          }}
        >
          <VStack gap={2}>
            <HStack justify="between" align="center">
              <Text type="supporting" weight="semibold" color="secondary">
                QUICK CONVERTER
              </Text>
              <Text type="supporting" color="secondary">
                1 {currency} = {currentRate} USD
              </Text>
            </HStack>

            <HStack gap={2} align="center">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value) || 0)}
                aria-label="Amount to convert"
                style={{
                  width: '120px',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border-subtle, #cbd5e1)',
                  backgroundColor: 'var(--color-surface-default, #fff)',
                  color: 'inherit',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '14px',
                }}
              />
              <div style={{ flex: 1, minWidth: '150px' }}>
                <Selector
                  label="Currency"
                  value={currency}
                  onChange={(val) => setCurrency(val as string)}
                  options={CURRENCY_OPTIONS}
                />
              </div>
            </HStack>

            {/* Calculated USD Output */}
            <div
              style={{
                backgroundColor: 'var(--color-surface-default, #fff)',
                padding: '8px 12px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                border: '1px solid var(--color-border-subtle, rgba(0,0,0,0.06))',
              }}
            >
              <Text type="supporting" color="secondary">
                Normalized USD Pay:
              </Text>
              <Text weight="bold" hasTabularNumbers style={{ fontSize: '16px', color: '#16a34a' }}>
                {formatUsd(normalizedUsd)}
              </Text>
            </div>
          </VStack>
        </div>

        {/* Live Corporate Exchange Rates Ticker */}
        <VStack gap={1}>
          <Text type="supporting" weight="semibold" color="secondary">
            ACTIVE CORPORATE FX PEGS
          </Text>
          <HStack gap={1} wrap="wrap">
            <Badge variant="neutral" label={`🇪🇺 1 EUR = $${rates.EUR ?? 1.086}`} />
            <Badge variant="neutral" label={`🇬🇧 1 GBP = $${rates.GBP ?? 1.263}`} />
            <Badge variant="neutral" label={`🇮🇳 1 INR = $${rates.INR ?? 0.0119}`} />
            <Badge variant="neutral" label={`🇸🇬 1 SGD = $${rates.SGD ?? 0.745}`} />
            <Badge variant="neutral" label={`🇯🇵 1 JPY = $${rates.JPY ?? 0.0067}`} />
          </HStack>
        </VStack>
      </VStack>
    </Card>
  );
}
