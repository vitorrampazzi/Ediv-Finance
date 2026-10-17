export type ResearchModuleSummaryLine = { label: string | null; value: string };
export function researchModuleSummary(
  entry: unknown,
  key: string,
  demo?: boolean,
): ResearchModuleSummaryLine[];
