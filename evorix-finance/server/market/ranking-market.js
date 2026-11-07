import {
  researchMarginPercent,
  safetyMarginPercent,
} from "../../safety-margin.mjs";
import { isCalendarDate } from "./b3-calendar.js";
import { unavailableQuote } from "./quote-service.js";

// Market price and dynamic safety margin of the ranking entries
// (docs/MARGEM-E-HISTORICO.md). The ceiling is the one of the latest
// publication and never changes with the price. Every percentage comes from
// safety-margin.mjs; this module only chooses which price feeds it.

function text(value) {
  return typeof value === "string" ? value : null;
}

// A positive decimal that safety-margin.mjs accepts: its margin against itself
// is "0.00". Anything else (missing, zero, negative, "1e3") is not a price.
function positiveDecimal(value) {
  return typeof value === "string" && safetyMarginPercent(value, value) !== null
    ? value
    : null;
}

/** MySQL DATETIME text (UTC) or a Date, as an ISO instant; otherwise null. */
export function isoInstant(value) {
  if (value instanceof Date)
    return Number.isFinite(value.getTime()) ? value.toISOString() : null;
  if (typeof value !== "string" || !value.trim()) return null;
  const textValue = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(value)
    ? `${value.replace(" ", "T")}Z`
    : value;
  const ms = Date.parse(textValue);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

// Research reference day "AAAA-MM-DD" as 00:00 in São Paulo (UTC−3: Brazil has
// had no daylight saving time since 2019).
export function researchDayInstant(date) {
  return typeof date === "string" && isCalendarDate(date)
    ? new Date(`${date}T03:00:00.000Z`).toISOString()
    : null;
}

export function canonicalUnavailable(symbol) {
  return { ...unavailableQuote(symbol), session: null };
}

/**
 * The `safetyMargin` object:
 * - market: listed price of the current cycle;
 * - stale: last valid listed price, after a failed refresh;
 * - research: no valid listed price, so the research price and margin;
 * - unavailable: no valid ceiling (percent null), or nothing to show.
 */
export function safetyMarginFor({
  ceilingPrice,
  quote,
  researchPrice = null,
  researchSafetyMargin = null,
  researchCheckedAt = null,
}) {
  const listedPrice =
    quote && quote.freshness !== "unavailable" ? text(quote.price) : null;
  if (positiveDecimal(text(ceilingPrice)) === null)
    return {
      percent: null,
      basis: "unavailable",
      price: listedPrice,
      checkedAt: listedPrice === null ? null : (quote.checkedAt ?? null),
    };
  const percent =
    listedPrice === null
      ? null
      : safetyMarginPercent(ceilingPrice, listedPrice);
  if (percent !== null)
    return {
      percent,
      basis: quote.freshness === "stale" ? "stale" : "market",
      price: listedPrice,
      checkedAt: quote.checkedAt ?? null,
    };
  if (researchSafetyMargin !== null || researchPrice !== null)
    return {
      percent: researchSafetyMargin,
      basis: "research",
      price: researchPrice,
      checkedAt: researchCheckedAt,
    };
  return { percent: null, basis: "unavailable", price: null, checkedAt: null };
}

function researchValues(entry) {
  const analysis = entry?.dividendAnalysis ?? {};
  return {
    ceilingPrice: text(analysis.ceilingPrice),
    researchPrice: text(analysis.referencePrice),
    researchSafetyMargin: researchMarginPercent(text(analysis.safetyMargin)),
    updatedOn: text(analysis.updatedOn),
  };
}

/** One entry of GET /api/rankings/market. */
export function rankingMarketEntry(entry, quote, publishedAt = null) {
  const research = researchValues(entry);
  return {
    ticker: entry.ticker,
    quote,
    ceilingPrice: research.ceilingPrice,
    researchPrice: research.researchPrice,
    researchSafetyMargin: research.researchSafetyMargin,
    safetyMargin: safetyMarginFor({
      ceilingPrice: research.ceilingPrice,
      quote,
      researchPrice: positiveDecimal(research.researchPrice),
      researchSafetyMargin: research.researchSafetyMargin,
      // The research price is the one of its reference day.
      researchCheckedAt: researchDayInstant(research.updatedOn) ?? publishedAt,
    }),
  };
}

/** Body of GET /api/rankings/market: one canonical quote per entry. */
export function rankingMarketBody({ publication, quotes, checkedAt, market }) {
  const publishedAt = isoInstant(publication?.updatedAt);
  return {
    publication: publication
      ? { id: publication.id ?? null, publishedAt }
      : null,
    market,
    checkedAt: checkedAt ?? null,
    entries: (publication?.entries ?? []).map((entry) =>
      rankingMarketEntry(
        entry,
        quotes.get(entry.ticker) ?? canonicalUnavailable(entry.ticker),
        publishedAt,
      ),
    ),
  };
}

/**
 * `market` of one public entry. Same rules, but neither the ceiling nor the
 * research price leaves the server: with the research basis only the research
 * margin (already public as dividendAnalysis.safetyMargin) is sent, dated by
 * the publication.
 */
export function publicMarketEntry(entry, quote, publishedAt = null) {
  const research = researchValues(entry);
  return {
    quote,
    safetyMargin: safetyMarginFor({
      ceilingPrice: research.ceilingPrice,
      quote,
      researchPrice: null,
      researchSafetyMargin: research.researchSafetyMargin,
      researchCheckedAt: publishedAt,
    }),
  };
}
