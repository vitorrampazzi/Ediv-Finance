import { z } from "zod";

// docs/COTACOES.md writes ^[A-Z]{4}[0-9]{1,2}F?$, which rejects B3SA3 (a
// ranking and snapshot ticker). Keep the first character a letter and allow
// digits in the root, the same rule as company-logo.mjs.
export const tickerPattern = /^[A-Z][A-Z0-9]{3}[0-9]{1,2}F?$/;
export const maxSymbolsPerRequest = 100;
export const historyRanges = Object.freeze(["1mo", "3mo", "1y"]);
// Tickers the brapi v2 answers without a token.
export const demoTickers = Object.freeze(
  new Set(["PETR4", "MGLU3", "VALE3", "ITUB4"]),
);

export function isValidTicker(value) {
  return typeof value === "string" && tickerPattern.test(value);
}

export const tickerSchema = z
  .string()
  .max(16)
  .trim()
  .toUpperCase()
  .regex(tickerPattern);

// Favorites and the portfolio save tickers with this wider rule. The list route
// only reads the general catalog, so any such symbol is safe: one outside the
// catalog comes back as unavailable instead of failing the whole batch.
export const storedTickerPattern = /^[A-Z0-9.-]{1,16}$/;

// "A,b , A" -> ["A", "B"]. Duplicates collapse before the 1..100 count.
export const symbolsSchema = z
  .string()
  .max(1600)
  .transform((value) => [
    ...new Set(
      value
        .split(",")
        .map((item) => item.trim().toUpperCase())
        .filter(Boolean),
    ),
  ])
  .pipe(
    z
      .array(z.string().regex(storedTickerPattern))
      .min(1)
      .max(maxSymbolsPerRequest),
  );

export const historyQuerySchema = z.object({
  range: z.enum(historyRanges).optional().default("1mo"),
});

// Chart series: the plan's longest range ("max" for Pro and demo tickers).
export const seriesRanges = Object.freeze(["3mo", "1y", "max"]);
export const priceBases = Object.freeze(["adjusted", "nominal"]);

// GET /api/rankings/price-series/:ticker. Without `basis` the answer uses the
// default basis (adjusted when it exists).
export const priceSeriesQuerySchema = z.object({
  basis: z.enum(priceBases).optional(),
  granularity: z.enum(["daily", "monthly"]).optional().default("daily"),
});
