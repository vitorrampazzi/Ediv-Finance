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
];
export const readEntries = (value) =>
  typeof value === "string" ? JSON.parse(value) : value || [];
export function compareResearch(before, after) {
  const previous = new Map(before.map((entry) => [entry.ticker, entry]));
  const current = new Map(after.map((entry) => [entry.ticker, entry]));
  const added = after.filter((entry) => !previous.has(entry.ticker));
  const removed = before.filter((entry) => !current.has(entry.ticker));
  const changed = after.flatMap((entry) => {
    const old = previous.get(entry.ticker);
    if (!old) return [];
    const fields = researchKeys.filter(
      (key) =>
        String(old[key] ?? "").trim() !== String(entry[key] ?? "").trim(),
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
