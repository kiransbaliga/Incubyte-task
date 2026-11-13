import { describe, it, expect } from 'vitest';
import {
  convertLocalToUsd,
  formatCurrencyDisplay,
  SUPPORTED_CURRENCIES,
  SUPPORTED_COUNTRIES,
  COUNTRY_CURRENCY_MAP,
  FALLBACK_FX_RATES,
} from '../lib/currencyUtils.js';

describe('currencyUtils', () => {
  describe('Constants', () => {
    it('defines all 6 supported currencies', () => {
      expect(SUPPORTED_CURRENCIES).toEqual(['USD', 'EUR', 'GBP', 'INR', 'SGD', 'JPY']);
    });

    it('defines all 6 supported countries', () => {
      expect(SUPPORTED_COUNTRIES).toEqual(['US', 'DE', 'GB', 'IN', 'SG', 'JP']);
    });

    it('maps each supported country to its correct local currency', () => {
      expect(COUNTRY_CURRENCY_MAP).toEqual({
        US: 'USD',
        DE: 'EUR',
        GB: 'GBP',
        IN: 'INR',
        SG: 'SGD',
        JP: 'JPY',
      });
      for (const country of SUPPORTED_COUNTRIES) {
        expect(SUPPORTED_CURRENCIES).toContain(COUNTRY_CURRENCY_MAP[country]);
      }
    });

    it('provides valid positive fallback FX rates for all supported currencies', () => {
      for (const currency of SUPPORTED_CURRENCIES) {
        expect(FALLBACK_FX_RATES[currency]).toBeGreaterThan(0);
      }
      expect(FALLBACK_FX_RATES.USD).toBe(1.0);
    });
  });

  describe('convertLocalToUsd', () => {
    it('calculates USD amount with exact 2-decimal precision', () => {
      expect(convertLocalToUsd(100000, 1.0)).toBe('100000.00');
      expect(convertLocalToUsd(100000, 0.0119)).toBe('1190.00');
      expect(convertLocalToUsd(125000, 1.086)).toBe('135750.00');
      expect(convertLocalToUsd(85000, 1.263)).toBe('107355.00');
      expect(convertLocalToUsd(15000000, 0.0067)).toBe('100500.00');
    });

    it('accepts string inputs for amount and rate', () => {
      expect(convertLocalToUsd('100000', '1.0')).toBe('100000.00');
      expect(convertLocalToUsd('100000', 0.745)).toBe('74500.00');
      expect(convertLocalToUsd(100000, '0.745')).toBe('74500.00');
      expect(convertLocalToUsd('50000.50', '1.086')).toBe('54300.54');
    });

    it('rounds to the nearest cent using standard half-up behavior', () => {
      // 100.555 * 1 = 100.555 -> rounds to 100.56
      expect(convertLocalToUsd(100.555, 1)).toBe('100.56');
      // 100.554 * 1 = 100.554 -> rounds to 100.55
      expect(convertLocalToUsd(100.554, 1)).toBe('100.55');
      // 10.005 -> 10.01
      expect(convertLocalToUsd(10.005, 1)).toBe('10.01');
      // 10.004 -> 10.00
      expect(convertLocalToUsd(10.004, 1)).toBe('10.00');
      // 123.4567 * 2 = 246.9134 -> 246.91
      expect(convertLocalToUsd(123.4567, 2)).toBe('246.91');
    });

    it('handles boundary and edge values', () => {
      expect(convertLocalToUsd(0, 1.5)).toBe('0.00');
      expect(convertLocalToUsd('0', '1.0')).toBe('0.00');
      expect(convertLocalToUsd(0, 0)).toBe('0.00');
      // Large salary values (e.g. 1 billion JPY)
      expect(convertLocalToUsd(1000000000, 0.0067)).toBe('6700000.00');
      // Very small values rounding down to 0
      expect(convertLocalToUsd(0.001, 1)).toBe('0.00');
      // Very small values rounding up to 0.01
      expect(convertLocalToUsd(0.005, 1)).toBe('0.01');
    });

    it('throws error for invalid non-numeric amount inputs', () => {
      expect(() => convertLocalToUsd('invalid', 1)).toThrow(/Invalid numeric input for conversion/);
      expect(() => convertLocalToUsd('abc', '1.0')).toThrow(/Invalid numeric input for conversion/);
      expect(() => convertLocalToUsd(NaN, 1)).toThrow(/Invalid numeric input for conversion/);
    });

    it('throws error for invalid non-numeric rate inputs', () => {
      expect(() => convertLocalToUsd(100, 'not-a-rate')).toThrow(/Invalid numeric input for conversion/);
      expect(() => convertLocalToUsd('100', NaN)).toThrow(/Invalid numeric input for conversion/);
      expect(() => convertLocalToUsd(NaN, NaN)).toThrow(/Invalid numeric input for conversion/);
    });
  });

  describe('formatCurrencyDisplay', () => {
    it('formats USD with $ symbol and 2 decimal places', () => {
      const formatted = formatCurrencyDisplay(100000, 'USD');
      expect(formatted).toBe('$100,000.00');
      expect(formatCurrencyDisplay('1234.5', 'USD')).toBe('$1,234.50');
    });

    it('formats EUR with € symbol and European decimal notation', () => {
      const formatted = formatCurrencyDisplay(100000, 'EUR');
      expect(formatted).toContain('€');
      // German format uses period as thousand separator and comma for decimals: 100.000,00
      expect(formatted).toContain('100.000,00');
    });

    it('formats GBP with £ symbol and 2 decimal places', () => {
      const formatted = formatCurrencyDisplay(100000, 'GBP');
      expect(formatted).toBe('£100,000.00');
      expect(formatCurrencyDisplay(5432.1, 'GBP')).toBe('£5,432.10');
    });

    it('formats INR with ₹ symbol and Indian numbering system (lakhs/crores)', () => {
      // 10 lakhs = 1,000,000 -> formatted as 10,00,000.00
      const formatted10Lakh = formatCurrencyDisplay(1000000, 'INR');
      expect(formatted10Lakh).toContain('₹');
      expect(formatted10Lakh).toContain('10,00,000.00');

      // 1 crore = 10,000,000 -> formatted as 1,00,00,000.00
      const formatted1Crore = formatCurrencyDisplay(10000000, 'INR');
      expect(formatted1Crore).toContain('₹');
      expect(formatted1Crore).toContain('1,00,00,000.00');

      // 50,000
      const formatted50k = formatCurrencyDisplay(50000, 'INR');
      expect(formatted50k).toContain('50,000.00');
    });

    it('formats JPY with ¥/￥ symbol and ZERO decimal places', () => {
      const formatted = formatCurrencyDisplay(100000, 'JPY');
      // Must contain currency symbol (¥ or ￥) and 100,000 without decimal fraction
      expect(formatted).toMatch(/^[¥￥]100,000$/);
      expect(formatted).not.toMatch(/[.,]\d{2}$/);

      const zeroJpy = formatCurrencyDisplay(0, 'JPY');
      expect(zeroJpy).toMatch(/^[¥￥]0$/);
    });

    it('formats SGD with $ symbol and 2 decimal places', () => {
      const formatted = formatCurrencyDisplay(100000, 'SGD');
      expect(formatted).toContain('$');
      expect(formatted).toContain('100,000.00');
    });

    it('handles numeric string inputs correctly', () => {
      expect(formatCurrencyDisplay('50000', 'USD')).toBe('$50,000.00');
      expect(formatCurrencyDisplay('75000.5', 'GBP')).toBe('£75,000.50');
    });

    it('returns "0.00" for non-numeric or NaN amount inputs', () => {
      expect(formatCurrencyDisplay('not-a-number', 'USD')).toBe('0.00');
      expect(formatCurrencyDisplay(NaN, 'EUR')).toBe('0.00');
      expect(formatCurrencyDisplay(undefined as unknown as number, 'INR')).toBe('0.00');
    });

    it('falls back gracefully to en-US locale for unmapped currencies', () => {
      const formatted = formatCurrencyDisplay(1000, 'CAD');
      expect(formatted).toContain('1,000.00');
    });
  });
});
