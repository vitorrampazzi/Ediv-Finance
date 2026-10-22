export function dividendNumber(value: string | null | undefined): number | null;
/** Derived fraction value/reference - 1; both inputs must be positive. */
export function dividendComparison(
  value: string | null | undefined,
  reference: string | null | undefined,
): number | null;
/** Explicit Portuguese months/ranges, sorted 1..12; unknown/ambiguous text is null. */
export function dividendAnnouncementMonths(
  text: string | null | undefined,
): number[] | null;
/** Approximate display only; use the original value/formatter for the full tooltip. */
export function compactDividendValue(
  value: string | null | undefined,
  format: "currency" | "quantity",
): string;
