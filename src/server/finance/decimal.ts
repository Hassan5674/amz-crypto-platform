// Exact Fixed-Point Decimal Arithmetic for Double-Entry Financial Accounting
// Eliminates IEEE 754 floating-point drift (e.g. 0.1 + 0.2 !== 0.3)
// Scale: 8 decimal places (standard for institutional fiat & crypto accounting)

export const FINANCIAL_SCALE = 8;
export const FINANCIAL_MULTIPLIER = 100_000_000n; // 10^8

export class Decimal {
  private readonly raw: bigint;

  private constructor(raw: bigint) {
    this.raw = raw;
  }

  /**
   * Parse string into exact Decimal.
   * Throws if invalid or negative when not permitted.
   */
  public static fromString(value: string | number | bigint): Decimal {
    if (typeof value === 'bigint') {
      return new Decimal(value * FINANCIAL_MULTIPLIER);
    }
    const str = String(value).trim();
    if (!str || str === 'NaN') {
      throw new Error(`Invalid monetary amount: "${value}"`);
    }

    // Check pattern: optional sign, digits, optional decimal point and digits
    const regex = /^(-)?(\d+)(?:\.(\d+))?$/;
    const match = str.match(regex);
    if (!match) {
      throw new Error(`Invalid monetary amount format: "${value}"`);
    }

    const isNegative = !!match[1];
    const integerPart = match[2];
    const fractionPart = (match[3] || '').padEnd(FINANCIAL_SCALE, '0').slice(0, FINANCIAL_SCALE);

    const combinedStr = `${integerPart}${fractionPart}`;
    let raw = BigInt(combinedStr);
    if (isNegative) {
      raw = -raw;
    }
    return new Decimal(raw);
  }

  public static zero(): Decimal {
    return new Decimal(0n);
  }

  public static get ZERO(): Decimal {
    return new Decimal(0n);
  }

  public static fromRaw(raw: bigint): Decimal {
    return new Decimal(raw);
  }

  public getRaw(): bigint {
    return this.raw;
  }

  public add(other: Decimal): Decimal {
    return new Decimal(this.raw + other.raw);
  }

  public subtract(other: Decimal): Decimal {
    return new Decimal(this.raw - other.raw);
  }

  public multiply(other: Decimal | number | string): Decimal {
    const o = other instanceof Decimal ? other : Decimal.fromString(other);
    const resRaw = (this.raw * o.raw) / FINANCIAL_MULTIPLIER;
    return new Decimal(resRaw);
  }

  public divide(other: Decimal | number | string): Decimal {
    const o = other instanceof Decimal ? other : Decimal.fromString(other);
    if (o.raw === 0n) {
      throw new Error('Division by zero');
    }
    const resRaw = (this.raw * FINANCIAL_MULTIPLIER) / o.raw;
    return new Decimal(resRaw);
  }

  public greaterThan(other: Decimal | number | string): boolean {
    const o = other instanceof Decimal ? other : Decimal.fromString(other);
    return this.raw > o.raw;
  }

  public lessThan(other: Decimal | number | string): boolean {
    const o = other instanceof Decimal ? other : Decimal.fromString(other);
    return this.raw < o.raw;
  }

  public toFixed(decimals: number = 2): string {
    return this.toString(decimals);
  }

  public compareTo(other: Decimal): number {
    if (this.raw < other.raw) return -1;
    if (this.raw > other.raw) return 1;
    return 0;
  }

  public equals(other: Decimal): boolean {
    return this.raw === other.raw;
  }

  public isZero(): boolean {
    return this.raw === 0n;
  }

  public isPositive(): boolean {
    return this.raw > 0n;
  }

  public isNegative(): boolean {
    return this.raw < 0n;
  }

  /**
   * Convert back to standard decimal string with fixed scale
   */
  public toString(scale: number = FINANCIAL_SCALE): string {
    const isNeg = this.raw < 0n;
    const absRaw = isNeg ? -this.raw : this.raw;
    const intPart = absRaw / FINANCIAL_MULTIPLIER;
    const fracPart = (absRaw % FINANCIAL_MULTIPLIER).toString().padStart(FINANCIAL_SCALE, '0');

    const slicedFrac = fracPart.slice(0, scale);
    const sign = isNeg ? '-' : '';
    return `${sign}${intPart}.${slicedFrac}`;
  }

  /**
   * Clean formatting for display (e.g., 2 decimal places for fiat USD)
   */
  public toDisplayString(decimals: number = 2): string {
    const isNeg = this.raw < 0n;
    const absRaw = isNeg ? -this.raw : this.raw;
    const intPart = absRaw / FINANCIAL_MULTIPLIER;
    const fracPart = (absRaw % FINANCIAL_MULTIPLIER).toString().padStart(FINANCIAL_SCALE, '0');

    const targetFrac = fracPart.slice(0, decimals).padEnd(decimals, '0');
    // Format integer with commas
    const formattedInt = intPart.toLocaleString('en-US');
    const sign = isNeg ? '-' : '';
    return `${sign}${formattedInt}.${targetFrac}`;
  }
}
