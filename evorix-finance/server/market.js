import { Router } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import { z } from "zod";
import { MysqlLimitStore } from "./limit-store.js";
import { quoteService } from "./market-service.js";
import { unavailableQuote } from "./market/quote-service.js";
import {
  filterRows,
  isEquityAsset,
  sortedEquityRows,
} from "./market/asset-catalog.js";
import {
  historyQuerySchema,
  isValidTicker,
  symbolsSchema,
  tickerSchema,
} from "./market/validation.js";

// Routes only: caching, budget and provider rules live in ./market/ and the
// shared service in ./market-service.js. Contracts: docs/COTACOES.md and
// docs/MARGEM-E-HISTORICO.md (canonical quote with `session`).
const router = Router();

// Same client identity as the rest of /api (set by identifyClient). Vercel's
// header is the one the platform supplies; req.ip is only a fallback.
const clientKey = (req) => req.securityIpKey || ipKeyGenerator(req.ip, 56);

const quoteLimiter = rateLimit({
  windowMs: 60_000,
  limit: 30,
  keyGenerator: clientKey,
  store: new MysqlLimitStore("market"),
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

// A ticker the shared cache does not hold costs one provider call from the
// daily budget (450 by default, shared by every visitor). Routes that can
// trigger it get a tighter ceiling, so one client cannot drain the budget for
// the others. Company pages refresh a quote every 15 minutes by default.
const providerLimiter = rateLimit({
  windowMs: 60_000,
  limit: 12,
  keyGenerator: clientKey,
  store: new MysqlLimitStore("market-provider"),
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

router.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

// Portfolio valuation: summary quotes from the general list, in input order.
export async function getMarketQuotes(symbols) {
  const unique = [...new Set(symbols)];
  const { quotes } = await quoteService.quotes(unique.filter(isValidTicker));
  const bySymbol = new Map(quotes.map((quote) => [quote.symbol, quote]));
  return unique.map(
    (symbol) => bySymbol.get(symbol) || unavailableQuote(symbol),
  );
}

router.get("/assets", quoteLimiter, async (req, res) => {
  const schema = z.object({
    search: z.string().trim().max(80).optional().default(""),
    type: z.enum(["all", "stock"]).optional().default("stock"),
    sortBy: z
      .enum(["volume", "change", "market_cap", "name"])
      .optional()
      .default("volume"),
    sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
    page: z.coerce.number().int().min(1).max(500).optional().default(1),
    limit: z.coerce.number().int().min(1).max(50).optional().default(25),
  });
  const parsed = schema.safeParse(req.query);
  if (!parsed.success)
    return res
      .status(400)
      .json({ error: "Filtros inválidos para o catálogo de ações." });
  const filters = parsed.data;
  const catalog = await quoteService.catalog();
  if (!catalog.entry)
    return res
      .status(503)
      .json({ error: "Catálogo de ações indisponível no momento." });
  const normalizedSearch = filters.search.toLocaleLowerCase("pt-BR");
  const filtered = filterRows(
    sortedEquityRows(
      catalog.entry.value.items,
      filters.sortBy,
      filters.sortOrder,
    ),
    normalizedSearch,
  );
  const offset = (filters.page - 1) * filters.limit;
  return res.json({
    assets: filtered.slice(offset, offset + filters.limit).map(({ asset }) => ({
      symbol: asset.symbol,
      name: asset.name,
      logoUrl: asset.logoUrl,
      price: asset.price,
      changePercent: asset.changePercent,
      volume: asset.volume,
      marketCap: asset.marketCap,
      sector: asset.sector,
      subSector: asset.subSector,
      type: asset.type,
      subType: asset.subType,
      source: "brapi.dev",
    })),
    total: filtered.length,
    page: filters.page,
    pageSize: filters.limit,
    requestedAt: catalog.entry.checkedAt,
    availableSectors: catalog.entry.value.availableSectors,
  });
});

router.get("/quotes", quoteLimiter, async (req, res) => {
  const parsed = symbolsSchema.safeParse(req.query.symbols);
  if (!parsed.success)
    return res.status(400).json({
      error: "Informe de 1 a 100 tickers válidos, separados por vírgula.",
    });
  // Saved favorites may hold symbols outside the B3 rule: answer them as
  // unavailable, in the requested order, instead of failing the batch.
  const result = await quoteService.quotes(parsed.data.filter(isValidTicker));
  const bySymbol = new Map(result.quotes.map((quote) => [quote.symbol, quote]));
  return res.json({
    ...result,
    quotes: parsed.data.map(
      (symbol) => bySymbol.get(symbol) || unavailableQuote(symbol),
    ),
  });
});

router.get(
  "/quote/:ticker",
  quoteLimiter,
  providerLimiter,
  async (req, res) => {
    const ticker = tickerSchema.safeParse(req.params.ticker);
    if (!ticker.success)
      return res.status(400).json({ error: "Código da ação inválido." });
    return res.json(await quoteService.quote(ticker.data));
  },
);

router.get(
  "/history/:ticker",
  quoteLimiter,
  providerLimiter,
  async (req, res) => {
    const ticker = tickerSchema.safeParse(req.params.ticker);
    const query = historyQuerySchema.safeParse(req.query);
    if (!ticker.success || !query.success)
      return res
        .status(400)
        .json({ error: "Código da ação ou período inválido." });
    return res.json(await quoteService.history(ticker.data, query.data.range));
  },
);

export { router as marketRouter };
