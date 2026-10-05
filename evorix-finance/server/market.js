import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { readCache, saveCache } from "./provider-cache.js";
import { config } from "./config.js";
import { MysqlLimitStore } from "./limit-store.js";

const router = Router();
const quoteCache = new Map();
const inFlight = new Map();
let assetCatalogCache = null;
let assetCatalogInFlight = null;
const CACHE_TTL_MS = 15 * 60 * 1000;
const ASSET_CATALOG_TTL_MS = 15 * 60 * 1000;
const quoteLimiter = rateLimit({
  windowMs: 60_000,
  limit: 30,
  store: new MysqlLimitStore("market"),
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

async function fetchQuote(symbol) {
  let cached = quoteCache.get(symbol);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS)
    return { ...cached.quote, stale: false };
  if (inFlight.has(symbol)) return inFlight.get(symbol);

  const request = (async () => {
    try {
      const shared = await readCache("quote:" + symbol);
      if (shared) {
        cached = {
          quote: shared.data,
          cachedAt: shared.fresh ? Date.now() : 0,
        };
        quoteCache.set(symbol, cached);
        if (shared.fresh) return { ...shared.data, stale: false };
      }
      if (!config.brapiApiKey) {
        const catalog = await getAssetCatalog();
        const asset = catalog.stocks.find((result) => result.stock === symbol);
        if (
          !asset ||
          asset.close === null ||
          !Number.isFinite(Number(asset.close)) ||
          Number(asset.close) <= 0
        )
          throw new Error("Quote unavailable");
        const quote = {
          symbol,
          name: String(asset.name || symbol).slice(0, 120),
          currency: "BRL",
          price: Number(asset.close).toFixed(8),
          change: null,
          changePercent:
            asset.change != null && Number.isFinite(Number(asset.change))
              ? Number(asset.change).toFixed(4)
              : null,
          marketTime: null,
          checkedAt: catalog.requestedAt || new Date().toISOString(),
          source: "brapi.dev",
        };
        quoteCache.set(symbol, { quote, cachedAt: Date.now() });
        await saveCache("quote:" + symbol, quote, CACHE_TTL_MS);
        return { ...quote, stale: false };
      }
      const url = `https://brapi.dev/api/quote/${encodeURIComponent(symbol)}`;
      const response = await fetch(url, {
        headers: config.brapiApiKey
          ? { Authorization: `Bearer ${config.brapiApiKey}` }
          : {},
        signal: AbortSignal.timeout(7000),
      });
      if (!response.ok)
        throw new Error(`Market provider returned ${response.status}`);
      const payload = await response.json();
      const item = Array.isArray(payload.results)
        ? payload.results.find((result) => result.symbol === symbol)
        : null;
      const price = Number(item?.regularMarketPrice);
      if (
        !item ||
        !Number.isFinite(price) ||
        price < 0.00000001 ||
        price >= 1e12
      )
        throw new Error("Quote unavailable");
      const quote = {
        symbol,
        name: String(item.shortName || item.longName || symbol).slice(0, 120),
        currency: String(item.currency || "BRL"),
        price: price.toFixed(8),
        change:
          item.regularMarketChange != null &&
          Number.isFinite(Number(item.regularMarketChange))
            ? Number(item.regularMarketChange).toFixed(8)
            : null,
        changePercent:
          item.regularMarketChangePercent != null &&
          Number.isFinite(Number(item.regularMarketChangePercent))
            ? Number(item.regularMarketChangePercent).toFixed(4)
            : null,
        marketTime:
          typeof item.regularMarketTime === "string"
            ? item.regularMarketTime
            : null,
        checkedAt: new Date().toISOString(),
        source: "brapi.dev",
      };
      quoteCache.set(symbol, { quote, cachedAt: Date.now() });
      await saveCache("quote:" + symbol, quote, CACHE_TTL_MS);
      return { ...quote, stale: false };
    } catch {
      if (cached) return { ...cached.quote, stale: true };
      return {
        symbol,
        name: symbol,
        currency: "BRL",
        price: null,
        change: null,
        changePercent: null,
        marketTime: null,
        source: "brapi.dev",
        stale: true,
        unavailable: true,
      };
    } finally {
      inFlight.delete(symbol);
    }
  })();
  inFlight.set(symbol, request);
  return request;
}

async function getAssetCatalog() {
  if (
    assetCatalogCache &&
    Date.now() - assetCatalogCache.cachedAt < ASSET_CATALOG_TTL_MS
  )
    return assetCatalogCache.data;
  if (assetCatalogInFlight) return assetCatalogInFlight;
  assetCatalogInFlight = (async () => {
    try {
      const shared = await readCache("catalog");
      if (shared?.fresh) {
        assetCatalogCache = { data: shared.data, cachedAt: Date.now() };
        return shared.data;
      }
      const response = await fetch(
        "https://brapi.dev/api/quote/list?limit=2000&sortBy=volume&sortOrder=desc",
        {
          headers: config.brapiApiKey
            ? { Authorization: `Bearer ${config.brapiApiKey}` }
            : {},
          signal: AbortSignal.timeout(12_000),
        },
      );
      if (!response.ok)
        throw new Error(`Market provider returned ${response.status}`);
      const payload = await response.json();
      if (!Array.isArray(payload.stocks))
        throw new Error("Market provider returned an invalid asset list");
      const data = {
        stocks: payload.stocks.filter(
          (asset) =>
            typeof asset.stock === "string" &&
            asset.close !== null &&
            Number.isFinite(Number(asset.close)) &&
            Number(asset.close) > 0,
        ),
        indexes: Array.isArray(payload.indexes) ? payload.indexes : [],
        availableSectors: Array.isArray(payload.availableSectors)
          ? payload.availableSectors
          : [],
        requestedAt:
          typeof payload.requestedAt === "string"
            ? payload.requestedAt
            : new Date().toISOString(),
      };
      await saveCache("catalog", data, ASSET_CATALOG_TTL_MS);
      assetCatalogCache = { data, cachedAt: Date.now() };
      return data;
    } finally {
      assetCatalogInFlight = null;
    }
  })();
  return assetCatalogInFlight;
}

export async function getMarketQuotes(symbols) {
  const unique = [...new Set(symbols)];
  const results = new Array(unique.length);
  let cursor = 0;
  const deadline = Date.now() + 20_000;
  await Promise.all(
    Array.from({ length: Math.min(4, unique.length) }, async () => {
      while (cursor < unique.length) {
        const index = cursor++;
        results[index] =
          Date.now() < deadline
            ? await fetchQuote(unique[index])
            : {
                symbol: unique[index],
                name: unique[index],
                currency: "BRL",
                price: null,
                change: null,
                changePercent: null,
                marketTime: null,
                source: "brapi.dev",
                stale: true,
                unavailable: true,
              };
      }
    }),
  );
  return results;
}

router.get("/assets", quoteLimiter, async (req, res) => {
  const schema = z.object({
    search: z.string().trim().max(80).optional().default(""),
    type: z.enum(["all", "stock", "fund", "bdr"]).optional().default("stock"),
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
      .json({ error: "Filtros inválidos para a lista de ativos." });
  const filters = parsed.data;
  const catalog = await getAssetCatalog();
  const normalizedSearch = filters.search.toLocaleLowerCase("pt-BR");
  const filtered = catalog.stocks
    .filter((asset) => filters.type === "all" || asset.type === filters.type)
    .filter(
      (asset) =>
        !normalizedSearch ||
        `${asset.stock} ${asset.name} ${asset.sector || ""} ${asset.subsector || ""}`
          .toLocaleLowerCase("pt-BR")
          .includes(normalizedSearch),
    );
  filtered.sort((left, right) => {
    const sign = filters.sortOrder === "asc" ? 1 : -1;
    if (filters.sortBy === "name")
      return (
        sign * String(left.name).localeCompare(String(right.name), "pt-BR")
      );
    const field =
      filters.sortBy === "market_cap" ? "market_cap" : filters.sortBy;
    return sign * ((Number(left[field]) || 0) - (Number(right[field]) || 0));
  });
  const offset = (filters.page - 1) * filters.limit;
  return res.json({
    assets: filtered.slice(offset, offset + filters.limit).map((asset) => ({
      symbol: asset.stock,
      name: String(asset.name || asset.stock).slice(0, 120),
      price: Number(asset.close).toFixed(8),
      changePercent: Number.isFinite(Number(asset.change))
        ? Number(asset.change).toFixed(4)
        : null,
      volume: Number.isFinite(Number(asset.volume))
        ? String(asset.volume)
        : null,
      marketCap: Number.isFinite(Number(asset.market_cap))
        ? String(asset.market_cap)
        : null,
      sector: typeof asset.sector === "string" ? asset.sector : null,
      subSector: typeof asset.subsector === "string" ? asset.subsector : null,
      type: asset.type,
      subType: asset.subType,
      source: "brapi.dev",
    })),
    total: filtered.length,
    page: filters.page,
    pageSize: filters.limit,
    requestedAt: catalog.requestedAt,
    availableSectors: catalog.availableSectors,
  });
});

router.get("/quotes", quoteLimiter, async (req, res) => {
  const parsed = z.string().max(160).safeParse(req.query.symbols);
  if (!parsed.success)
    return res
      .status(400)
      .json({ error: "Informe tickers separados por vírgula." });
  const symbols = [
    ...new Set(
      parsed.data
        .split(",")
        .map((value) => value.trim().toUpperCase())
        .filter(Boolean),
    ),
  ];
  if (
    !symbols.length ||
    symbols.length > 8 ||
    symbols.some((symbol) => !/^[A-Z0-9.-]{1,16}$/.test(symbol))
  ) {
    return res.status(400).json({ error: "Informe de 1 a 8 tickers válidos." });
  }
  return res.json({ quotes: await getMarketQuotes(symbols) });
});

export { router as marketRouter };
