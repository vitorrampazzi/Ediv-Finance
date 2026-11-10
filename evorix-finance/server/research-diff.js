export const researchKeys = [
  "rank",
  "companyName",
  "expectedReturnPercent",
  "targetPrice",
  "horizonMonths",
  "thesis",
  "risks",
  "sector",
  "balanceSheet",
  "incomeStatement",
  "cashFlow",
  "companyInformation",
  "netDebt",
  "statistics",
  "referencePeriod",
  "dataSource",
  "dividendAnalysis",
  "annualHistory",
];
export const readEntries = (value) =>
  typeof value === "string" ? JSON.parse(value) : value || [];
// Key order never counts as a change; older entries have no annualHistory.
const canonical = (value) =>
  Array.isArray(value)
    ? value.map(canonical)
    : value && typeof value === "object"
      ? Object.fromEntries(
          Object.keys(value)
            .sort()
            .map((key) => [key, canonical(value[key])]),
        )
      : value ?? null;
export function compareResearch(before, after) {
  const previous = new Map(before.map((entry) => [entry.ticker, entry]));
  const current = new Map(after.map((entry) => [entry.ticker, entry]));
  const added = after.filter((entry) => !previous.has(entry.ticker));
  const removed = before.filter((entry) => !current.has(entry.ticker));
  const changed = after.flatMap((entry) => {
    const old = previous.get(entry.ticker);
    if (!old) return [];
    const fields = researchKeys.filter((key) =>
      key === "dividendAnalysis"
        ? JSON.stringify(Object.entries(old[key] || {}).sort()) !==
          JSON.stringify(Object.entries(entry[key] || {}).sort())
        : key === "annualHistory"
          ? JSON.stringify(canonical(old[key])) !==
            JSON.stringify(canonical(entry[key]))
          : String(old[key] ?? "").trim() !== String(entry[key] ?? "").trim(),
    );
    return fields.length
      ? [
          {
            ticker: entry.ticker,
            companyName: entry.companyName,
            fields,
            before: old,
            after: entry,
          },
        ]
      : [];
  });
  return {
    added,
    removed,
    changed,
    unchanged: after.length - added.length - changed.length,
  };
}
