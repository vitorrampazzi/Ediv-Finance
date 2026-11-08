// Market price and safety margin of the ranking, the company pages and the
// public previews (docs/MARGEM-E-HISTORICO.md). The margin always comes from
// the server: these helpers only read it, choose the fallback and write the
// texts, so no screen does the arithmetic. Pure: the unit tests import this
// file directly in Node.
import {
  formatSafetyMarginPercent,
  researchMarginPercent,
  safetyMarginFormula,
} from "../../safety-margin.mjs";
import {
  consultedAt,
  decimal,
  isoTime,
  markStale,
  parseMarket,
  parseQuote,
  priceText,
  quoteMoney,
  quotePercent,
  quoteSourceText,
  quoteTone,
  saoPauloDayMonth,
  saoPauloMoment,
  type LiveQuote,
  type MarketState,
} from "./liveQuotes.ts";

export type MarginBasis = "market" | "stale" | "research" | "unavailable";
export type SafetyMargin = {
  percent: string | null;
  basis: MarginBasis;
  price: string | null;
  checkedAt: string | null;
};
// One company of /api/rankings/market. The public route sends only the
// quote and the margin: the ceiling price is never exposed there.
export type MarketEntry = {
  ticker: string;
  quote: LiveQuote | null;
  ceilingPrice: string | null;
  researchPrice: string | null;
  researchSafetyMargin: string | null;
  safetyMargin: SafetyMargin | null;
};
export type MarketBlock = Pick<MarketEntry, "quote" | "safetyMargin">;
export type RankingMarket = {
  publication: { id: string; publishedAt: string | null } | null;
  market: MarketState | null;
  checkedAt: string | null;
  entries: Record<string, MarketEntry>;
};

const bases: readonly MarginBasis[] = [
  "market",
  "stale",
  "research",
  "unavailable",
];
const percentPattern = /^-?\d+\.\d{2}$/;
const percentText = (value: unknown) =>
  typeof value === "string" && percentPattern.test(value) ? value : null;
const record = (value: unknown) =>
  value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;

export function parseSafetyMargin(input: unknown): SafetyMargin | null {
  const margin = record(input);
  if (!margin || !bases.includes(margin.basis as MarginBasis)) return null;
  const basis = margin.basis as MarginBasis;
  const percent = basis === "unavailable" ? null : percentText(margin.percent);
  return {
    // A basis without a number to show is no margin at all.
    basis: percent === null ? "unavailable" : basis,
    percent,
    price: priceText(margin.price),
    checkedAt: isoTime(margin.checkedAt),
  };
}

function parseEntryQuote(input: unknown, ticker: string) {
  const quote = parseQuote(input);
  return quote?.symbol === ticker ? quote : null;
}

export function parseMarketBlock(
  input: unknown,
  ticker: string,
): MarketBlock | null {
  const block = record(input);
  if (!block) return null;
  return {
    quote: parseEntryQuote(block.quote, ticker.toUpperCase()),
    safetyMargin: parseSafetyMargin(block.safetyMargin),
  };
}

export function parseRankingMarket(input: unknown): RankingMarket {
  const body = record(input) ?? {};
  const publication = record(body.publication);
  const entries: Record<string, MarketEntry> = {};
  for (const item of Array.isArray(body.entries) ? body.entries : []) {
    const entry = record(item);
    const ticker =
      typeof entry?.ticker === "string" ? entry.ticker.toUpperCase() : "";
    if (!entry || !ticker || entries[ticker]) continue;
    entries[ticker] = {
      ticker,
      quote: parseEntryQuote(entry.quote, ticker),
      ceilingPrice: priceText(entry.ceilingPrice),
      researchPrice: priceText(entry.researchPrice),
      researchSafetyMargin: percentText(entry.researchSafetyMargin),
      safetyMargin: parseSafetyMargin(entry.safetyMargin),
    };
  }
  const id = publication?.id;
  return {
    publication:
      typeof id === "string" || typeof id === "number"
        ? {
            id: String(id),
            publishedAt:
              typeof publication?.publishedAt === "string"
                ? publication.publishedAt
                : null,
          }
        : null,
    market: parseMarket(body.market),
    checkedAt: isoTime(body.checkedAt),
    entries,
  };
}

// The only indicators the public API opens, for the first three companies.
export const publicMetrics = [
  "estimatedGrossDividendYield",
  "projectedPE",
  "safetyMargin",
] as const;
export type PublicEntry = {
  rank: number;
  ticker: string;
  companyName: string;
  dividendAnalysis: Record<(typeof publicMetrics)[number], string | null>;
  // Quote and margin of this company, from the same answer; no ceiling.
  market: MarketBlock | null;
};
export type PublicRanking = {
  id: string | null;
  title: string;
  updatedAt: string | null;
  totalEntries?: number;
  entries: PublicEntry[];
  market: MarketState | null;
};

export function parsePublicRanking(input: unknown): PublicRanking {
  const body = record(input) ?? {};
  const entries: PublicEntry[] = [];
  for (const item of Array.isArray(body.entries) ? body.entries : []) {
    const entry = record(item);
    const analysis = record(entry?.dividendAnalysis);
    if (
      !entry ||
      typeof entry.ticker !== "string" ||
      typeof entry.companyName !== "string"
    )
      continue;
    entries.push({
      rank: Number(entry.rank),
      ticker: entry.ticker,
      companyName: entry.companyName,
      dividendAnalysis: Object.fromEntries(
        publicMetrics.map((key) => [
          key,
          typeof analysis?.[key] === "string" ? analysis[key] : null,
        ]),
      ) as PublicEntry["dividendAnalysis"],
      market: parseMarketBlock(entry.market, entry.ticker),
    });
  }
  return {
    id:
      typeof body.id === "string" || typeof body.id === "number"
        ? String(body.id)
        : null,
    title: typeof body.title === "string" ? body.title : "Ranking de Ações",
    updatedAt: typeof body.updatedAt === "string" ? body.updatedAt : null,
    totalEntries:
      typeof body.totalEntries === "number" ? body.totalEntries : undefined,
    entries,
    market: parseMarket(body.market),
  };
}

// Publication dates arrive as UTC, either ISO or MySQL "YYYY-MM-DD HH:MM:SS".
export function publicationInstant(value: string | null | undefined) {
  if (!value) return null;
  const iso = /[zZ]$|[+-]\d\d:?\d\d$/.test(value)
    ? value
    : value.replace(" ", "T") + "Z";
  const time = Date.parse(iso);
  return Number.isFinite(time) ? time : null;
}
const dayMonth = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
});
// "22/10": the day of the publication the ceiling price comes from.
export function publicationDay(value: string | null | undefined) {
  const time = publicationInstant(value);
  return time === null ? null : dayMonth.format(time);
}
// "20/10" from the research reference day "2026-10-20" (already São Paulo).
export function researchDayText(value: string | null | undefined) {
  return typeof value === "string" && /^\d{4}-(\d{2})-(\d{2})$/.test(value)
    ? `${value.slice(8, 10)}/${value.slice(5, 7)}`
    : null;
}

export type MarketCellState =
  "loading" | "market" | "stale" | "research" | "unavailable";
export type MarketView = {
  price: {
    state: MarketCellState;
    // Decimal text of the price shown, the same one the margin used.
    value: string | null;
    text: string;
    change: string | null;
    tone: "up" | "down" | "flat" | null;
    qualifier: string | null;
    title: string;
  };
  margin: {
    state: MarketCellState;
    percent: string | null;
    text: string;
    qualifier: string | null;
    title: string;
  };
  // Canonical quote behind the price, when there is one.
  quote: LiveQuote | null;
  ceiling: string | null;
  researchDay: string | null;
};
export type ResearchValues = {
  price?: string | null;
  // Fraction stored by the research spreadsheet ("0.41").
  margin?: string | null;
  ceiling?: string | null;
  // Reference day of the research ("updatedOn", AAAA-MM-DD).
  date?: string | null;
};
export type MarketViewContext = {
  // No answer yet: the cells stay reserved and empty.
  loading: boolean;
  // The latest refresh failed: the last values stay, marked as stale.
  failed: boolean;
  publishedAt: string | null;
  // Public pages never show the ceiling price.
  showCeiling?: boolean;
  now?: number;
};

const money = (value: string | null) => {
  const number = decimal(value);
  return number === null ? "Não informado" : quoteMoney(number);
};
const staleNote =
  " Defasada: a consulta mais recente falhou e esta é a última cotação válida.";

function marginTitle(
  state: MarketCellState,
  percent: string | null,
  price: string | null,
  ceiling: string | null,
  checkedAt: string | null,
  context: MarketViewContext,
  day: string | null,
) {
  const now = context.now ?? Date.now();
  const text = formatSafetyMarginPercent(percent);
  const when = checkedAt
    ? ` consultada ${consultedAt(checkedAt, now)} (horário de Brasília)`
    : "";
  if (state === "market" || state === "stale")
    return (
      (context.showCeiling !== false && ceiling
        ? `Margem de segurança = ${safetyMarginFormula} = (${money(ceiling)} − ${money(price)}) ÷ ${money(ceiling)} = ${text}. Preço-teto da pesquisa${day ? ` de ${day}` : ""}; cotação brapi.dev${when}.`
        : `Margem de segurança = ${safetyMarginFormula}: ${text}, com a cotação brapi.dev de ${money(price)}${when}. O preço-teto está na pesquisa completa.`) +
      (state === "stale" ? staleNote : "")
    );
  if (state === "research")
    return `Margem de segurança da pesquisa${day ? ` de ${day}` : ""}: ${text}${price ? `, com o preço da pesquisa de ${money(price)}` : ""}. Sem cotação válida da brapi.dev, ela não acompanha o mercado agora.`;
  if (state === "loading")
    return "Consultando a cotação para mostrar a margem de segurança.";
  return context.showCeiling !== false && ceiling === null
    ? "Margem de segurança indisponível: a pesquisa não informa um preço-teto válido."
    : "Margem de segurança indisponível no momento.";
}

// Chooses what each screen shows for one company, in this order: the margin
// basis sent by the server, then a valid quote, then the research values.
export function marketView(
  entry: (MarketBlock & Partial<MarketEntry>) | null,
  research: ResearchValues,
  context: MarketViewContext,
): MarketView {
  const margin = entry?.safetyMargin ?? null;
  // The research's own day; the server dates a research margin the same way.
  const day =
    (margin?.basis === "research" && margin.checkedAt
      ? saoPauloDayMonth(margin.checkedAt)
      : null) ??
    researchDayText(research.date) ??
    publicationDay(context.publishedAt);
  const fromResearch = day ? `da pesquisa (${day})` : "da pesquisa";
  const now = context.now ?? Date.now();
  const ceiling =
    entry?.ceilingPrice ?? (entry ? null : priceText(research.ceiling));
  if (context.loading && !entry)
    return {
      price: {
        state: "loading",
        value: null,
        text: "",
        change: null,
        tone: null,
        qualifier: null,
        title: "Consultando a cotação na brapi.dev.",
      },
      margin: {
        state: "loading",
        percent: null,
        text: "",
        qualifier: null,
        title: marginTitle("loading", null, null, null, null, context, day),
      },
      quote: null,
      ceiling,
      researchDay: day,
    };
  const valid =
    entry?.quote && !entry.quote.unavailable && entry.quote.price
      ? entry.quote
      : null;
  const quote = valid && context.failed ? markStale(valid) : valid;
  const researchPrice = entry?.researchPrice ?? priceText(research.price);
  const live = margin?.basis === "market" || margin?.basis === "stale";
  const stale = (live && margin?.basis === "stale") || context.failed;

  let priceState: MarketCellState;
  let priceValue: string | null;
  let checkedAt: string | null = null;
  if (live) {
    priceState = stale || quote?.stale ? "stale" : "market";
    priceValue = margin?.price ?? quote?.price ?? null;
    checkedAt = quote?.checkedAt ?? margin?.checkedAt ?? null;
  } else if (margin?.basis === "research") {
    priceState = "research";
    priceValue = margin.price ?? researchPrice;
  } else if (quote) {
    priceState = quote.stale ? "stale" : "market";
    priceValue = quote.price;
    checkedAt = quote.checkedAt;
  } else if (researchPrice) {
    priceState = "research";
    priceValue = researchPrice;
  } else {
    priceState = "unavailable";
    priceValue = null;
  }
  if (priceValue === null && priceState !== "unavailable")
    priceState = "unavailable";

  let marginState: MarketCellState;
  let percent: string | null;
  if (margin && margin.basis !== "unavailable") {
    percent = margin.percent;
    marginState =
      margin.basis === "research" ? "research" : stale ? "stale" : "market";
  } else if (margin) {
    percent = null;
    marginState = "unavailable";
  } else {
    // No market data for this company: the research margin, two decimals.
    percent =
      entry?.researchSafetyMargin ?? researchMarginPercent(research.margin);
    marginState = percent === null ? "unavailable" : "research";
  }

  const sourceQuote =
    quote ??
    (checkedAt
      ? {
          source: "brapi.dev",
          delayMinutes: null,
          quoteTime: null,
          checkedAt,
          stale: priceState === "stale",
        }
      : null);
  const changeValue =
    (priceState === "market" || priceState === "stale") && quote
      ? decimal(quote.changePercent)
      : null;
  return {
    price: {
      state: priceState,
      value: priceValue,
      text: priceValue === null ? "Não informado" : money(priceValue),
      change: changeValue === null ? null : quotePercent(changeValue),
      tone: changeValue === null ? null : quoteTone(quote),
      qualifier:
        priceState === "stale"
          ? "defasada"
          : priceState === "research"
            ? fromResearch
            : priceState === "unavailable"
              ? "cotação indisponível"
              : null,
      title:
        (priceState === "market" || priceState === "stale") && sourceQuote
          ? quoteSourceText(
              { ...sourceQuote, stale: priceState === "stale" },
              now,
            )
          : priceState === "research"
            ? `Preço da pesquisa${day ? ` de ${day}` : ""}. A cotação da brapi.dev não está disponível agora.`
            : "Cotação da brapi.dev indisponível no momento.",
    },
    margin: {
      state: marginState,
      percent,
      text: formatSafetyMarginPercent(percent),
      qualifier:
        marginState === "stale"
          ? "defasada"
          : marginState === "research"
            ? fromResearch
            : null,
      title: marginTitle(
        marginState,
        percent,
        marginState === "research"
          ? (margin?.price ?? researchPrice)
          : priceValue,
        ceiling,
        checkedAt,
        context,
        day,
      ),
    },
    quote,
    ceiling,
    researchDay: day,
  };
}

// "Na publicação de 22/10: preço R$ 19,37 e margem de segurança de 41,00%."
// The publication's own values stay visible next to the dynamic ones.
export function researchReference(
  research: ResearchValues,
  publishedAt: string | null,
) {
  const price = priceText(research.price);
  const percent = researchMarginPercent(research.margin);
  if (!price && percent === null) return null;
  const day = publicationDay(publishedAt);
  return `Na publicação${day ? ` de ${day}` : ""}: ${[
    price ? `preço ${money(price)}` : "preço não informado",
    percent === null
      ? "margem de segurança não informada"
      : `margem de segurança de ${formatSafetyMarginPercent(percent)}`,
  ].join(" e ")}.`;
}

// The order "maior margem de segurança" uses the margin on screen.
export const marginSortValue = (view: MarketView | undefined) => {
  const value = decimal(view?.margin.percent);
  return value === null ? null : value;
};

// Short lines under the big figures of the company page.
export function priceCaption(view: MarketView, now: number = Date.now()) {
  const time = view.quote?.checkedAt
    ? saoPauloMoment(view.quote.checkedAt, now)
    : null;
  if (view.price.state === "market")
    return `brapi.dev${time ? ` · ${time}` : ""}`;
  if (view.price.state === "stale")
    return `defasada${time ? ` · ${time}` : ""}`;
  if (view.price.state === "loading") return "consultando a cotação";
  return view.price.qualifier ?? "";
}
export function marginCaption(view: MarketView, now: number = Date.now()) {
  const time = view.quote?.checkedAt
    ? saoPauloMoment(view.quote.checkedAt, now)
    : null;
  if (view.margin.state === "market")
    return time ? `com a cotação de ${time}` : "com a cotação de mercado";
  if (view.margin.state === "loading") return "consultando a cotação";
  if (view.margin.state === "unavailable")
    return view.ceiling === null ? "sem preço-teto válido" : "indisponível";
  return view.margin.qualifier ?? "";
}

type ResearchEntry = {
  ticker: string;
  dividendAnalysis?: {
    referencePrice?: string | null;
    safetyMargin?: string | null;
    ceilingPrice?: string | null;
    updatedOn?: string | null;
  } | null;
};
export type MarketSnapshot = {
  data: RankingMarket | null;
  loading: boolean;
  failed: boolean;
};

// Views of every company of a publication. Market data only applies to the
// publication it was computed for; other versions show their own research.
export function publicationMarket(
  entries: readonly ResearchEntry[],
  market: MarketSnapshot,
  publication: { id: string | null; publishedAt: string | null },
  now: number = Date.now(),
) {
  const applies = Boolean(
    market.data?.publication &&
    publication.id !== null &&
    market.data.publication.id === publication.id,
  );
  const loading = market.loading && !market.data;
  const views = new Map<string, MarketView>();
  for (const entry of entries)
    views.set(
      entry.ticker,
      marketView(
        applies
          ? (market.data?.entries[entry.ticker.toUpperCase()] ?? null)
          : null,
        {
          price: entry.dividendAnalysis?.referencePrice,
          margin: entry.dividendAnalysis?.safetyMargin,
          ceiling: entry.dividendAnalysis?.ceilingPrice,
          date: entry.dividendAnalysis?.updatedOn,
        },
        {
          loading,
          failed: applies && market.failed,
          publishedAt: publication.publishedAt,
          now,
        },
      ),
    );
  return {
    views,
    applies,
    loading,
    note: rankingMarketNote(
      {
        loading,
        failed: applies && market.failed,
        applies,
        hasData: Boolean(market.data),
        checkedAt: applies ? (market.data?.checkedAt ?? null) : null,
        publishedAt: publication.publishedAt,
      },
      now,
    ),
    // The usual text once a quote arrives: it reserves the note's height.
    noteSizer: rankingMarketNote(
      {
        loading: false,
        failed: false,
        applies: true,
        hasData: true,
        checkedAt: new Date(now).toISOString(),
        publishedAt: publication.publishedAt,
      },
      now,
    ),
  };
}

export type RankingNoteState = {
  loading: boolean;
  failed: boolean;
  applies: boolean;
  hasData: boolean;
  checkedAt: string | null;
  publishedAt: string | null;
};

// The note next to the ranking: formula, source and time, and which
// publication the ceiling price comes from.
export function rankingMarketNote(
  state: RankingNoteState,
  now: number = Date.now(),
) {
  const day = publicationDay(state.publishedAt);
  const formula = `Margem de segurança = ${safetyMarginFormula}, recalculada a cada cotação; fica negativa quando a cotação passa do teto.`;
  const ceiling = `O preço-teto vem da publicação${day ? ` de ${day}` : ""} e só muda com uma nova análise.`;
  const when = state.checkedAt
    ? `, consultada ${consultedAt(state.checkedAt, now)} (horário de Brasília)`
    : "";
  if (state.loading)
    return `Preço de mercado: cotação da brapi.dev. ${formula} ${ceiling}`;
  if (state.applies)
    return state.failed
      ? `Preço de mercado: última cotação válida da brapi.dev${when}; a consulta mais recente falhou, então os valores aparecem como defasados. ${formula} ${ceiling}`
      : `Preço de mercado: cotação da brapi.dev${when}. ${formula} ${ceiling}`;
  const research = `os da pesquisa${day ? ` publicada em ${day}` : ""}`;
  return state.hasData
    ? `Nesta versão, preço de mercado e margem de segurança são ${research}: a cotação da brapi.dev acompanha só a publicação mais recente.`
    : `A cotação da brapi.dev não está disponível agora: preço de mercado e margem de segurança aparecem como ${research}.`;
}
