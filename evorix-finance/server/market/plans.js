// brapi plans as published on 05/11/2026 (docs/COTACOES.md). Pure values so
// config.js and the tests share the same table. `seriesRange` is the longest
// daily history of the plan, used by the chart series; `includeRaw` (traded
// price) is a Pro feature (docs/MARGEM-E-HISTORICO.md).
export const brapiPlans = Object.freeze({
  free: Object.freeze({
    delayMinutes: 30,
    symbolsPerRequest: 1,
    historyRanges: Object.freeze(["1mo", "3mo"]),
    seriesRange: "3mo",
    includeRaw: false,
  }),
  startup: Object.freeze({
    delayMinutes: 15,
    symbolsPerRequest: 10,
    historyRanges: Object.freeze(["1mo", "3mo", "1y"]),
    seriesRange: "1y",
    includeRaw: false,
  }),
  pro: Object.freeze({
    delayMinutes: 5,
    symbolsPerRequest: 20,
    historyRanges: Object.freeze(["1mo", "3mo", "1y"]),
    seriesRange: "max",
    includeRaw: true,
  }),
});

// Demonstration tickers answer without a token: full history and raw prices.
export const demoSeries = Object.freeze({ range: "max", includeRaw: true });

export const defaultDailyBudget = 420;

export function parseBrapiPlan(value) {
  const name = typeof value === "string" ? value.trim().toLowerCase() : "";
  return Object.hasOwn(brapiPlans, name) ? name : "free";
}

// 0 is a valid kill switch for per-ticker calls; anything invalid is 420.
export function parseDailyBudget(value) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return defaultDailyBudget;
  if (!/^\d{1,6}$/.test(text)) return defaultDailyBudget;
  return Math.min(100_000, Number(text));
}
