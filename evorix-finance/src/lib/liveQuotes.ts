// brapi.dev quotes served by the API (contracts in docs/COTACOES.md and
// docs/MARGEM-E-HISTORICO.md). Pure helpers only: the unit tests import this
// file directly in Node.

// Day data of the v2 quote: never replaces the canonical price of the list.
export type QuoteSession = {
  open: string | null;
  dayHigh: string | null;
  dayLow: string | null;
  previousClose: string | null;
  quoteTime: string | null;
  checkedAt: string | null;
};
export type LiveQuote = {
  symbol: string;
  name: string | null;
  currency: string;
  price: string | null;
  change: string | null;
  changePercent: string | null;
  volume: string | null;
  quoteTime: string | null;
  checkedAt: string | null;
  freshness: "delayed" | "stale" | "unavailable";
  stale: boolean;
  unavailable: boolean;
  detail: "summary" | "full";
  delayMinutes: number | null;
  source: string;
  session: QuoteSession | null;
};
export type MarketState = {
  state: "open" | "closed";
  refreshSeconds: number;
  nextRefreshAt: string | null;
};

// Same rule as company-logo.mjs and the server routes (B3SA3 included).
export const quoteSymbolPattern = /^[A-Z][A-Z0-9]{3}[0-9]{1,2}F?$/;
// Never poll faster than a minute or slower than an hour, whatever the server says.
export const refreshBounds = { min: 60_000, max: 3_600_000 } as const;
export const defaultRefreshMs = 900_000;

// Same set, same key: order and repeats never cause another request.
export function quoteSymbols(symbols: readonly string[]) {
  return [...new Set(symbols.map((symbol) => symbol.trim().toUpperCase()))]
    .filter((symbol) => quoteSymbolPattern.test(symbol))
    .sort();
}

// Decimal text from the API; null and anything unparsable stay null, never 0.
export function decimal(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || !/^-?\d+(\.\d+)?$/.test(value.trim()))
    return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

// A price must be positive: zero or a negative number is no price at all.
export function priceText(value: unknown): string | null {
  const number = decimal(value);
  return number === null || number <= 0 ? null : String(value).trim();
}

const text = (value: unknown) =>
  typeof value === "string" && value.trim() ? value : null;
export const isoTime = (value: unknown) =>
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

export function parseSession(input: unknown): QuoteSession | null {
  const session = input as Record<string, unknown> | null;
  if (!session || typeof session !== "object") return null;
  const parsed = {
    open: priceText(session.open),
    dayHigh: priceText(session.dayHigh),
    dayLow: priceText(session.dayLow),
    previousClose: priceText(session.previousClose),
    quoteTime: isoTime(session.quoteTime),
    checkedAt: isoTime(session.checkedAt),
  };
  return parsed.open || parsed.dayHigh || parsed.dayLow || parsed.previousClose
    ? parsed
    : null;
}

export function parseQuote(input: unknown): LiveQuote | null {
  const quote = input as Record<string, unknown> | null;
  if (!quote || typeof quote !== "object") return null;
  const symbol = text(quote.symbol)?.toUpperCase() ?? null;
  if (!symbol) return null;
  const numeric = (key: string) =>
    decimal(quote[key]) === null ? null : String(quote[key]).trim();
  const price = priceText(quote.price);
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
    change: unavailable ? null : numeric("change"),
    changePercent: unavailable ? null : numeric("changePercent"),
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
    session: parseSession(quote.session),
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
export const saoPauloDayMonth = (time: number | string | Date) =>
  dayMonth.format(new Date(time));
// "10:48" today, "04/11 às 17:55" on any other São Paulo day.
export function saoPauloMoment(time: string, now: number = Date.now()) {
  return saoPauloDay(time) === saoPauloDay(now)
    ? saoPauloClock(time)
    : `${saoPauloDayMonth(time)} às ${saoPauloClock(time)}`;
}
// "às 10:48" today, "em 04/11 às 17:55" on any other São Paulo day.
export function consultedAt(time: string, now: number = Date.now()) {
  return saoPauloDay(time) === saoPauloDay(now)
    ? `às ${saoPauloClock(time)}`
    : `em ${saoPauloDayMonth(time)} às ${saoPauloClock(time)}`;
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
export function quoteSourceText(
  quote: Pick<
    LiveQuote,
    "source" | "delayMinutes" | "quoteTime" | "checkedAt" | "stale"
  >,
  now: number = Date.now(),
) {
  const delay = quote.delayMinutes
    ? `com atraso de até ${quote.delayMinutes} min`
    : "com atraso";
  const when = quote.quoteTime
    ? `cotação de ${saoPauloMoment(quote.quoteTime, now)}`
    : quote.checkedAt
      ? `consultada ${consultedAt(quote.checkedAt, now)}`
      : "horário não informado";
  return (
    `Cotação ${quote.source} ${delay}, ${when} (horário de Brasília)` +
    (quote.stale
      ? ". Defasada: a consulta mais recente falhou e esta é a última cotação válida."
      : ".")
  );
}

// Day data of the session block; a null value is left out, never shown as 0.
export function sessionFields(session: QuoteSession | null) {
  const fields: { key: string; label: string; value: string }[] = [];
  if (!session) return fields;
  const add = (key: keyof QuoteSession, label: string) => {
    const value = decimal(session[key]);
    if (value !== null) fields.push({ key, label, value: quoteMoney(value) });
  };
  add("open", "Abertura");
  add("dayHigh", "Máxima do dia");
  add("dayLow", "Mínima do dia");
  add("previousClose", "Fechamento anterior");
  return fields;
}
