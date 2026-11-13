/**
 * Client-side formatting utilities for dual-currency and date display
 */

const LOCALE_MAP: Record<string, string> = {
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
  INR: 'en-IN',
  SGD: 'en-SG',
  JPY: 'ja-JP',
};

export function formatCurrency(amount: number | string | null | undefined, currency: string = 'USD'): string {
  if (amount === null || amount === undefined || amount === '') return '$0.00';
  const val = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(val)) return '$0.00';

  const locale = LOCALE_MAP[currency] || 'en-US';
  const hasZeroDecimals = currency === 'JPY';

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: hasZeroDecimals ? 0 : 2,
    maximumFractionDigits: hasZeroDecimals ? 0 : 2,
  }).format(val);
}

export function formatUsd(amount: number | string | null | undefined): string {
  return formatCurrency(amount, 'USD');
}

export function formatLocalCurrency(amount: number | string | null | undefined, currency: string): string {
  return formatCurrency(amount, currency);
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return String(dateString);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatNumber(num: number | string | null | undefined): string {
  if (num === null || num === undefined) return '0';
  const val = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(val)) return '0';
  return val.toLocaleString('en-US');
}
