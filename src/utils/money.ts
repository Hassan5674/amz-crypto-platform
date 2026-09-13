// Centralized Money-Formatting Utility for ApexPlatform
// Handles decimal precision, currency symbols, thousands separators, zero and large values cleanly

export interface FormatMoneyOptions {
  currency?: string;
  decimals?: number;
  showCurrencyCode?: boolean;
  showSymbol?: boolean;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  BTC: '₿',
  ETH: 'Ξ',
  USDT: '₮',
  USDC: '$'
};

export function formatMoney(
  amount: string | number | null | undefined,
  options: FormatMoneyOptions = {}
): string {
  const {
    currency = 'USD',
    decimals = (currency === 'BTC' || currency === 'ETH' ? 6 : 2),
    showCurrencyCode = false,
    showSymbol = true
  } = options;

  if (amount === null || amount === undefined || amount === '') {
    return formatZero(currency, decimals, showSymbol, showCurrencyCode);
  }

  const strVal = String(amount).trim();
  const num = Number(strVal);
  if (isNaN(num)) {
    return formatZero(currency, decimals, showSymbol, showCurrencyCode);
  }

  // Parse sign
  const isNegative = strVal.startsWith('-');
  const cleanStr = isNegative ? strVal.substring(1) : strVal;

  const parts = cleanStr.split('.');
  const intPart = parts[0] || '0';
  const fracPart = parts[1] || '';

  // Format integer with commas
  const formattedInt = Number(intPart).toLocaleString('en-US');

  // Format fraction
  const formattedFrac = (fracPart.padEnd(decimals, '0')).slice(0, decimals);

  const signStr = isNegative ? '-' : '';
  const symbolStr = showSymbol ? (CURRENCY_SYMBOLS[currency] || '') : '';
  const codeStr = showCurrencyCode ? ` ${currency}` : '';

  const valueStr = decimals > 0 ? `${formattedInt}.${formattedFrac}` : formattedInt;

  return `${signStr}${symbolStr}${valueStr}${codeStr}`;
}

function formatZero(currency: string, decimals: number, showSymbol: boolean, showCurrencyCode: boolean): string {
  const symbol = showSymbol ? (CURRENCY_SYMBOLS[currency] || '') : '';
  const zeros = decimals > 0 ? `0.${'0'.repeat(decimals)}` : '0';
  const code = showCurrencyCode ? ` ${currency}` : '';
  return `${symbol}${zeros}${code}`;
}

export function parseMoneyInput(input: string): string {
  // Remove non-digit, non-decimal characters
  return input.replace(/[^\d.]/g, '');
}
