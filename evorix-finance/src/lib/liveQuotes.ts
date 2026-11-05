// brapi.dev quotes served by /api/market (contract in docs/COTACOES.md).
// Pure helpers only: the unit tests import this file directly in Node.

export type LiveQuote = {
  symbol: string;
  name: string | null;
  currency: string;
  price: string | null;
  change: string | null;
  changePercent: string | null;
  previousClose: string | null;
  dayHigh: string | null;
  dayLow: string | null;
  volume: string | null;
  quoteTime: string | null;
  checkedAt: string | null;
  freshness: "delayed" | "stale" | "unavailable";
  stale: boolean;
  unavailable: boolean;
  detail: "summary" | "full";
  delayMinutes: number | null;
  source: string;
};
export type MarketState = {
  state: "open" | "closed";
  refreshSeconds: number;
  nextRefreshAt: string | null;
};

// Same rule as company-logo.mjs and the server routes (B3SA3 included).
export const quoteSymbolPattern = /^[A-Z][A-Z0-9]{3}[0-9]{1,2}F?$/;
export const quoteChunkSize = 100;
// Never poll faster than a minute or slower than an hour, whatever the server says.
export const refreshBounds = { min: 60_000, max: 3_600_000 } as const;
export const defaultRefreshMs = 900_000;

// Same set, same key: order and repeats never cause another request.
export function quoteSymbols(symbols: readonly string[]) {
  return [...new Set(symbols.map((symbol) => symbol.trim().toUpperCase()))]
    .filter((symbol) => quoteSymbolPattern.test(symbol))
    .sort();
}

export function chunkSymbols(
  symbols: readonly string[],
  size = quoteChunkSize,
) {
  const chunks: string[][] = [];
  for (let index = 0; index < symbols.length; index += size)
    chunks.push(symbols.slice(index, index + size));
  return chunks;
}

// Decimal text from the API; null and anything unparsable stay null, never 0.
export function decimal(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || !/^-?\d+(\.\d+)?$/.test(value.trim()))
    return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

const text = (value: unknown) =>
  typeof value === "string" && value.trim() ? value : null;
const isoTime = (value: unknown) =>
  typeof value === "string" && Number.isFinite(Date.parse(value))
    ? value
    : null;

export function refreshMs(market: Partial<MarketState> | null | undefined) {
  const seconds = Number(market?.refreshSeconds);
  return Number.isFinite(seconds) && seconds > 0
    ? Math.min(
        refreshBounds.max,
        Math.max(refreshBounds.min, Math.round(seconds * 1000)),
      )
    : defaultRefreshMs;
}

export function parseMarket(input: unknown): MarketState | null {
  const market = input as Partial<MarketState> | null;
  if (!market || typeof market !== "object") return null;
  return {
    state: market.state === "open" ? "open" : "closed",
    refreshSeconds: refreshMs(market) / 1000,
    nextRefreshAt: isoTime(market.nextRefreshAt),
  };
}

export function parseQuote(input: unknown): LiveQuote | null {
  const quote = input as Record<string, unknown> | null;
  if (!quote || typeof quote !== "object") return null;
  const symbol = text(quote.symbol)?.toUpperCase() ?? null;
  if (!symbol) return null;
  const numeric = (key: string) =>
    decimal(quote[key]) === null ? null : String(quote[key]).trim();
  const price = numeric("price");
  const unavailable =
    price === null ||
    quote.unavailable === true ||
    quote.freshness === "unavailable";
  const stale =
    !unavailable && (quote.stale === true || quote.freshness === "stale");
  const delay = Number(quote.delayMinutes);
  return {
    symbol,
    name: text(quote.name),
    currency: text(quote.currency) ?? "BRL",
    price: unavailable ? null : price,
    change: numeric("change"),
    changePercent: numeric("changePercent"),
    previousClose: numeric("previousClose"),
    dayHigh: numeric("dayHigh"),
    dayLow: numeric("dayLow"),
    volume: numeric("volume"),
    quoteTime: isoTime(quote.quoteTime) ?? isoTime(quote.marketTime),
    checkedAt: isoTime(quote.checkedAt),
    freshness: unavailable ? "unavailable" : stale ? "stale" : "delayed",
    stale,
    unavailable,
    detail: quote.detail === "full" ? "full" : "summary",
    delayMinutes:
      quote.delayMinutes !== null && Number.isInteger(delay) && delay > 0
        ? delay
        : null,
    source: text(quote.source) ?? "brapi.dev",
  };
}

// A failed refresh keeps the previous numbers on screen, marked as stale.
export function markStale(quote: LiveQuote): LiveQuote {
  return quote.unavailable
    ? quote
    : { ...quote, stale: true, freshness: "stale" };
}

const zone = "America/Sao_Paulo";
const clock = new Intl.DateTimeFormat("pt-BR", {
  timeZone: zone,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
const dayMonth = new Intl.DateTimeFormat("pt-BR", {
  timeZone: zone,
  day: "2-digit",
  month: "2-digit",
});
const isoDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: zone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
export const saoPauloDay = (time: number | string | Date = Date.now()) =>
  isoDay.format(new Date(time));
export const saoPauloClock = (time: number | string | Date) =>
  clock.format(new Date(time));
// "10:48" today, "04/11 às 17:55" on any other São Paulo day.
export function saoPauloMoment(time: string, now: number = Date.now()) {
  return saoPauloDay(time) === saoPauloDay(now)
    ? saoPauloClock(time)
    : `${dayMonth.format(new Date(time))} às ${saoPauloClock(time)}`;
}

const weekday = new Intl.DateTimeFormat("en-US", {
  timeZone: zone,
  weekday: "short",
});
// First São Paulo date whose daily close may not be final yet: today until
// 18:30 on weekdays (session ends at 18:00), otherwise tomorrow.
export function firstOpenDate(now: number = Date.now()) {
  const today = saoPauloDay(now);
  const [hour, minute] = saoPauloClock(now).split(":").map(Number);
  const trading =
    !["Sat", "Sun"].includes(weekday.format(new Date(now))) &&
    hour * 60 + minute < 18 * 60 + 30;
  if (trading) return today;
  const next = new Date(today + "T12:00:00Z");
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const signedMoney = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: "exceptZero",
});
const signedPercent = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: "exceptZero",
});
const integer = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
// Typographic minus and plain spaces, so the text reads the same everywhere.
const tidy = (value: string) => value.replace(/-/g, "−").replace(/\s/g, " ");

export const quoteMoney = (value: number) => tidy(money.format(value));
export const quoteChange = (value: number) => tidy(signedMoney.format(value));
export const quotePercent = (value: number) =>
  tidy(signedPercent.format(value)) + "%";
export const quoteVolume = (value: number) => tidy(integer.format(value));

export function quoteTone(quote: LiveQuote | null) {
  const change = decimal(quote?.changePercent) ?? decimal(quote?.change);
  return change === null || quote?.unavailable
    ? null
    : change > 0
      ? "up"
      : change < 0
        ? "down"
        : "flat";
}

// The source line never claims live data: it is always "com atraso".
export function quoteSourceText(quote: LiveQuote, now: number = Date.now()) {
  const delay = quote.delayMinutes
    ? `com atraso de até ${quote.delayMinutes} min`
    : "com atraso";
  const when = quote.quoteTime
    ? `cotação de ${saoPauloMoment(quote.quoteTime, now)}`
    : quote.checkedAt
      ? `consultada às ${saoPauloMoment(quote.checkedAt, now)}`
      : "horário não informado";
  return (
    `Cotação ${quote.source} ${delay}, ${when} (horário de Brasília)` +
    (quote.stale
      ? ". Defasada: a consulta mais recente falhou e esta é a última cotação válida."
      : ".")
  );
}

// Short line under the research price in the ranking.
export function quoteLine(quote: LiveQuote | null) {
  const price = decimal(quote?.price);
  if (!quote || quote.unavailable || price === null) return null;
  const percent = decimal(quote.changePercent);
  return {
    prefix: quote.stale ? "defasada" : "agora",
    price: quoteMoney(price),
    percent: percent === null ? null : quotePercent(percent),
  };
}

// Fields of the "Cotação atual" block; a null value is left out, never shown as 0.
export function quoteFields(quote: LiveQuote) {
  const fields: { key: string; label: string; value: string }[] = [];
  const add = (
    key: keyof LiveQuote,
    label: string,
    format: (value: number) => string,
  ) => {
    const value = decimal(quote[key]);
    if (value !== null) fields.push({ key, label, value: format(value) });
  };
  add("previousClose", "Fechamento anterior", quoteMoney);
  add("dayHigh", "Máxima do dia", quoteMoney);
  add("dayLow", "Mínima do dia", quoteMoney);
  add("volume", "Volume", quoteVolume);
  return fields;
}
