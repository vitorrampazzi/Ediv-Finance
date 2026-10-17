export type ResearchModuleKey =
  | "balanceSheet"
  | "incomeStatement"
  | "cashFlow"
  | "companyInformation"
  | "netDebt"
  | "statistics";
export const researchModules: readonly Readonly<{
  key: ResearchModuleKey;
  label: string;
  anchor: string;
}>[];
export function hasResearchModule(entry: unknown, key: string): boolean;
export function researchModuleAnchor(key: string): string | null;
export function researchModuleLink(researchLink: string, key: string): string;
