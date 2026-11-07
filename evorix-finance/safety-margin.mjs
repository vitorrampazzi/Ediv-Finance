// Single source of the safety margin formula, shared by the server and the
// interface (docs/MARGEM-E-HISTORICO.md). The ceiling price comes from the
// latest published research and never changes with the market price:
//
//   margem (%) = (preço-teto − cotação de mercado) ÷ preço-teto × 100
//
// The math is exact (BigInt on the decimal digits) and rounds half away from
// zero to two decimals of the percentage. A negative margin is kept: it means
// the market price is above the ceiling. Invalid input returns null; zero is
// never used as a stand-in for a missing price.

export const safetyMarginFormula =
  '(preço-teto − cotação de mercado) ÷ preço-teto';

const maxDecimals = 18;
const decimalPattern = /^[+-]?\d+(?:\.\d+)?$/;

// "47.64000000" -> { digits: 4764000000n, scale: 8 }. Numbers are accepted
// only when they print without an exponent; anything else is invalid.
function parseDecimal(value) {
  let text;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    text = String(value);
  } else if (typeof value === 'string') {
    text = value.trim();
  } else {
    return null;
  }
  if (!decimalPattern.test(text)) return null;
  const negative = text.startsWith('-');
  const unsigned = text.replace(/^[+-]/, '');
  const [integer, fraction = ''] = unsigned.split('.');
  if (fraction.length > maxDecimals) return null;
  const digits = BigInt(integer + fraction) * (negative ? -1n : 1n);
  return { digits, scale: fraction.length };
}

function sameScale(left, right) {
  const scale = Math.max(left.scale, right.scale);
  return [
    left.digits * 10n ** BigInt(scale - left.scale),
    right.digits * 10n ** BigInt(scale - right.scale),
  ];
}

// Integer division rounding half away from zero.
function divideRounded(numerator, denominator) {
  const negative = numerator < 0n !== denominator < 0n;
  const a = numerator < 0n ? -numerator : numerator;
  const b = denominator < 0n ? -denominator : denominator;
  const quotient = (a * 2n + b) / (2n * b);
  return negative ? -quotient : quotient;
}

function hundredthsToText(hundredths) {
  if (hundredths === 0n) return '0.00';
  const negative = hundredths < 0n;
  const absolute = negative ? -hundredths : hundredths;
  const integer = absolute / 100n;
  const fraction = String(absolute % 100n).padStart(2, '0');
  return `${negative ? '-' : ''}${integer}.${fraction}`;
}

/**
 * Safety margin in percent with two decimals, as text ("20.00", "-20.00"),
 * or null when it cannot be calculated: missing, invalid or non-positive
 * ceiling, or a missing, invalid or non-positive market price.
 */
export function safetyMarginPercent(ceilingPrice, marketPrice) {
  const ceiling = parseDecimal(ceilingPrice);
  const price = parseDecimal(marketPrice);
  if (!ceiling || !price || ceiling.digits <= 0n || price.digits <= 0n)
    return null;
  const [c, p] = sameScale(ceiling, price);
  // (c − p) ÷ c × 100, in hundredths of a percentage point.
  return hundredthsToText(divideRounded((c - p) * 10000n, c));
}

/**
 * The research spreadsheet stores the margin as a fraction ("0.41"). This
 * turns it into the same two-decimal percentage text, exactly, for the
 * fallback when there is no market price.
 */
export function researchMarginPercent(fraction) {
  const value = parseDecimal(fraction);
  if (!value) return null;
  return hundredthsToText(
    divideRounded(value.digits * 10000n, 10n ** BigInt(value.scale)),
  );
}

/** "20.00" -> "20,00%", "-20.00" -> "−20,00%", "1234.50" -> "1.234,50%". */
export function formatSafetyMarginPercent(percent) {
  if (typeof percent !== 'string' || !/^-?\d+\.\d{2}$/.test(percent))
    return 'Não informado';
  const negative = percent.startsWith('-') && !/^-0\.00$/.test(percent);
  const [integer, fraction] = percent.replace(/^-/, '').split('.');
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${negative ? '−' : ''}${grouped},${fraction}%`;
}
