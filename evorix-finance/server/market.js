import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { config } from './config.js';

const router = Router();
const quoteCache = new Map();
const inFlight = new Map();
const CACHE_TTL_MS = 30 * 60 * 1000;
const SANDBOX_SYMBOLS = new Set(['PETR4', 'ITUB4', 'VALE3', 'MGLU3']);
const quoteLimiter = rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false });

async function fetchQuote(symbol) {
  const cached = quoteCache.get(symbol);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) return { ...cached.quote, stale: false };
  if (!config.brapiApiKey && !SANDBOX_SYMBOLS.has(symbol)) {
    return { symbol, name: symbol, currency: 'BRL', price: null, change: null, changePercent: null, marketTime: null, source: 'brapi.dev', stale: false, unavailable: true };
  }
  if (inFlight.has(symbol)) return inFlight.get(symbol);

  const request = (async () => {
    try {
      const url = `https://brapi.dev/api/quote/${encodeURIComponent(symbol)}`;
      const response = await fetch(url, {
        headers: config.brapiApiKey ? { Authorization: `Bearer ${config.brapiApiKey}` } : {},
        signal: AbortSignal.timeout(7000),
      });
      if (!response.ok) throw new Error(`Market provider returned ${response.status}`);
      const payload = await response.json();
      const item = Array.isArray(payload.results) ? payload.results.find(result => result.symbol === symbol) : null;
      const price = Number(item?.regularMarketPrice);
      if (!item || !Number.isFinite(price) || price <= 0) throw new Error('Quote unavailable');
      const quote = {
        symbol,
        name: String(item.shortName || item.longName || symbol).slice(0, 120),
        currency: String(item.currency || 'BRL'),
        price: price.toFixed(8),
        change: Number.isFinite(Number(item.regularMarketChange)) ? Number(item.regularMarketChange).toFixed(8) : null,
        changePercent: Number.isFinite(Number(item.regularMarketChangePercent)) ? Number(item.regularMarketChangePercent).toFixed(4) : null,
        marketTime: typeof item.regularMarketTime === 'string' ? item.regularMarketTime : null,
        source: 'brapi.dev',
      };
      quoteCache.set(symbol, { quote, cachedAt: Date.now() });
      return { ...quote, stale: false };
    } catch {
      if (cached) return { ...cached.quote, stale: true };
      return { symbol, name: symbol, currency: 'BRL', price: null, change: null, changePercent: null, marketTime: null, source: 'brapi.dev', stale: true, unavailable: true };
    } finally {
      inFlight.delete(symbol);
    }
  })();
  inFlight.set(symbol, request);
  return request;
}

export async function getMarketQuotes(symbols) {
  return Promise.all([...new Set(symbols)].map(fetchQuote));
}

router.get('/quotes', quoteLimiter, async (req, res) => {
  const parsed = z.string().max(160).safeParse(req.query.symbols);
  if (!parsed.success) return res.status(400).json({ error: 'Informe tickers separados por vírgula.' });
  const symbols = [...new Set(parsed.data.split(',').map(value => value.trim().toUpperCase()).filter(Boolean))];
  if (!symbols.length || symbols.length > 8 || symbols.some(symbol => !/^[A-Z0-9.-]{1,16}$/.test(symbol))) {
    return res.status(400).json({ error: 'Informe de 1 a 8 tickers válidos.' });
  }
  return res.json({ quotes: await getMarketQuotes(symbols), delayMinutes: 30 });
});

export { router as marketRouter };
