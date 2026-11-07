export const safetyMarginFormula: string;
export function safetyMarginPercent(
  ceilingPrice: string | number | null | undefined,
  marketPrice: string | number | null | undefined,
): string | null;
export function researchMarginPercent(
  fraction: string | number | null | undefined,
): string | null;
export function formatSafetyMarginPercent(percent: string | null | undefined): string;
