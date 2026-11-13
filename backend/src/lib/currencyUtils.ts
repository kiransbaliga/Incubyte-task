/**
 * Currency and Foreign Exchange (FX) Utility Functions
 * Enforces corporate planning rates and exact decimal formatting.
 */

export const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'SGD', 'JPY'] as const;
export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

export const SUPPORTED_COUNTRIES = ['US', 'DE', 'GB', 'IN', 'SG', 'JP'] as const;
export type SupportedCountry = typeof SUPPORTED_COUNTRIES[number];

export const COUNTRY_CURRENCY_MAP: Record<SupportedCountry, SupportedCurrency> = {
  US: 'USD',
  DE: 'EUR',
  GB: 'GBP',
  IN: 'INR',
  SG: 'SGD',
  JP: 'JPY',
};

export const FALLBACK_FX_RATES: Record<SupportedCurrency, number> = {
  USD: 1.000000,
  EUR: 1.086000,
  GBP: 1.263000,
  INR: 0.011900,
  SGD: 0.745000,
  JPY: 0.006700,
};

/**
 * Calculates USD equivalent of a local amount using exact rounding to 2 decimal places.
 * Avoids floating-point drift by rounding at the minor cent level.
 *
 * @param localAmount Local currency amount as number or numeric string
 * @param rateToUsd Multiplier to convert 1 local unit into USD
 * @returns Two-decimal precision string (e.g. "91800.00")
 */
export function convertLocalToUsd(
  localAmount: number | string,
  rateToUsd: number | string
): string {
  const numAmount = typeof localAmount === 'string' ? parseFloat(localAmount) : localAmount;
  const numRate = typeof rateToUsd === 'string' ? parseFloat(rateToUsd) : rateToUsd;

  if (isNaN(numAmount) || isNaN(numRate)) {
    throw new Error(`Invalid numeric input for conversion: amount=${localAmount}, rate=${rateToUsd}`);
  }

  // Round to nearest cent: Math.round(val * 100) / 100
  const usdValue = Math.round(numAmount * numRate * 100) / 100;
  return usdValue.toFixed(2);
}

/**
 * Format a currency value using Intl.NumberFormat with country-accurate formatting.
 * Handles JPY zero-decimal formatting and Indian numbering system (lakhs/crores).
 */
export function formatCurrencyDisplay(
  amount: number | string,
  currency: string
): string {
  const val = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(val)) return '0.00';

  const localeMap: Record<string, string> = {
    USD: 'en-US',
    EUR: 'de-DE',
    GBP: 'en-GB',
    INR: 'en-IN',
    SGD: 'en-SG',
    JPY: 'ja-JP',
  };

  const locale = localeMap[currency] || 'en-US';
  const hasZeroDecimals = currency === 'JPY';

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: hasZeroDecimals ? 0 : 2,
    maximumFractionDigits: hasZeroDecimals ? 0 : 2,
  }).format(val);
}
