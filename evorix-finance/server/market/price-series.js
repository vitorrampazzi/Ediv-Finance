import {
  addMonths,
  hasDataGap,
  isCalendarDate,
  isTradingDay,
  monthOf,
  uncoveredYears,
} from "./b3-calendar.js";
import { priceText } from "./brapi-provider.js";
import { saoPauloClock, tradingSessionDate } from "./market-session.js";

// Chart series of GET /api/rankings/price-series (docs/MARGEM-E-HISTORICO.md,
// "Séries do gráfico"). Pure: the caller passes every source and the instant.
//
// - adjusted: brapi `adjustedClose` only;
// - nominal: brapi `rawClose`, then closes consolidated by the Escola, then the
//   nominal tail of the AGF snapshot. On the same date the higher priority
//   wins; a difference above 0.5% is logged as price_source_conflict.
// Adjustments are the vendor's: no value is ever recalculated here.

// A bar of day D is final when it was read from 19:00 of D on (before that it
// may still hold a price from before the closing auction), and the bar of the
// session in progress stays out until 19:00.
const finalFromMinute = 19 * 60;
const inProgressUntilMinute = 19 * 60;
const nominalAgfValue = /^\d+(?:\.\d{1,2})?$/;

/**
 * The trailing run of AGF closes written with at most two decimals is the
 * traded price (it matches brapi `rawClose` on every date checked). Older
 * values were adjusted by an undocumented method and are never used.
 */
export function agfNominalTail(prices) {
  if (!Array.isArray(prices) || !prices.length)
    return { points: [], firstDate: null, excluded: 0 };
  let start = prices.length;
  while (start > 0 && nominalAgfValue.test(String(prices[start - 1]?.close)))
    start--;
  const points = [];
  for (const point of prices.slice(start)) {
    const close = priceText(point?.close);
    if (close !== null && isCalendarDate(point.date))
      points.push({ date: point.date, close });
  }
  return { points, firstDate: points[0]?.date ?? null, excluded: start };
}

// Exact comparison on the 8-decimal texts of priceText(): |a − b| > 0.5% of a.
function differsMoreThanHalfPercent(kept, other) {
  const a = BigInt(kept.replace(".", ""));
  const b = BigInt(other.replace(".", ""));
  const difference = a > b ? a - b : b - a;
  return difference * 200n > a;
}

function yearList(years) {
  const ranges = [];
  for (const year of years) {
    const last = ranges.at(-1);
    if (last && last[1] === year - 1) last[1] = year;
    else ranges.push([year, year]);
  }
  const parts = ranges.map(([from, to]) =>
    from === to ? String(from) : `${from} a ${to}`,
  );
  return parts.length > 1
    ? `${parts.slice(0, -1).join(", ")} e ${parts.at(-1)}`
    : parts[0];
}

/**
 * Builds the response body. `brapi` is the result of quoteService.series()
 * ({ points: [[date, adjustedClose, rawClose]], checkedAt, freshness, reason,
 * includeRaw }), `escola` the consolidated closes ([{ date, close }]), `agf`
 * the result of agfNominalTail() and `quote` the canonical quote.
 */
export function buildPriceSeries({
  ticker,
  basis: requestedBasis,
  granularity = "daily",
  brapi = null,
  escola = [],
  agf = null,
  quote = null,
  now,
  log = () => {},
}) {
  const clock = saoPauloClock(now);
  const today = clock.date;
  const todayInProgress =
    isTradingDay(today) && clock.minute < inProgressUntilMinute;
  let droppedToday = false;

  function acceptDate(date) {
    if (typeof date !== "string" || !isCalendarDate(date)) return false;
    if (date > today) return false;
    if (date === today && todayInProgress) {
      droppedToday = true;
      return false;
    }
    // One point per B3 session: weekends and verified holidays never count.
    return isTradingDay(date);
  }

  const brapiRead = brapi?.checkedAt
    ? saoPauloClock(Date.parse(brapi.checkedAt))
    : null;
  // A brapi bar is a consolidated close only if it was read from that day's
  // 19:00; a bar cached earlier is not final even when shown after 19:00.
  function brapiFinal(date) {
    if (!brapiRead) return false;
    return (
      brapiRead.date > date ||
      (brapiRead.date === date && brapiRead.minute >= finalFromMinute)
    );
  }
  const brapiRows = Array.isArray(brapi?.points) ? brapi.points : [];

  // Nominal: lowest priority first, so each higher source overwrites it.
  const nominal = new Map();
  const conflicts = [];
  function putNominal(date, close, source) {
    if (close === null) return;
    const previous = nominal.get(date);
    if (previous && differsMoreThanHalfPercent(close, previous.close))
      conflicts.push({ date, kept: source, replaced: previous.source });
    nominal.set(date, { close, source });
  }
  for (const point of agf?.points ?? [])
    if (acceptDate(point.date)) putNominal(point.date, point.close, "agf");
  for (const point of escola ?? [])
    if (acceptDate(point.date))
      putNominal(point.date, priceText(point.close), "escola");
  for (const [date, , rawClose] of brapiRows)
    if (rawClose !== null && acceptDate(date) && brapiFinal(date))
      putNominal(date, priceText(rawClose), "brapi");

  const adjusted = new Map();
  for (const [date, adjustedClose] of brapiRows) {
    if (adjustedClose === null || !acceptDate(date) || !brapiFinal(date))
      continue;
    const close = priceText(adjustedClose);
    if (close !== null) adjusted.set(date, { close, source: "brapi" });
  }

  const availableBases = [
    ...(adjusted.size ? ["adjusted"] : []),
    ...(nominal.size ? ["nominal"] : []),
  ];
  const defaultBasis = availableBases[0] ?? null;
  const basis = requestedBasis ?? defaultBasis ?? "nominal";
  const selected = basis === "adjusted" ? adjusted : nominal;

  // Daily: one consolidated close per session; a point after one or more B3
  // sessions without data starts a new stroke. In a year the calendar does
  // not cover, only three or more missing weekdays in a row do (hasDataGap).
  const daily = [];
  for (const date of [...selected.keys()].sort()) {
    const { close, source } = selected.get(date);
    const point = { date, close, status: "consolidated", source };
    const previous = daily.at(-1);
    if (previous && hasDataGap(previous.date, date)) point.gapBefore = true;
    daily.push(point);
  }

  // Monthly: the close of the last session of each ended month that is in
  // the series. The current month is left to latestQuote.
  const currentMonth = monthOf(today);
  const lastOfMonth = new Map();
  for (const point of daily) {
    const month = monthOf(point.date);
    if (month < currentMonth) lastOfMonth.set(month, point);
  }
  const monthly = [];
  for (const [month, point] of lastOfMonth) {
    // Complete when no session of the month follows the point: in a verified
    // year it is the month's last session; in an uncovered one, at most two
    // weekdays (holidays, maybe) are missing at the end.
    const nextMonth = `${addMonths(month, 1)}-01`;
    const entry = {
      date: point.date,
      month,
      close: point.close,
      status: hasDataGap(point.date, nextMonth) ? "incomplete" : "consolidated",
      source: point.source,
    };
    const previous = monthly.at(-1);
    if (previous && addMonths(previous.month, 1) !== month)
      entry.gapBefore = true;
    monthly.push(entry);
  }
  const points = granularity === "monthly" ? monthly : daily;

  // The canonical quote is always nominal. The dashed line to it is drawn only
  // when nothing is missing between the last point and the quote's session,
  // and, on the adjusted basis, when the last point has factor 1.
  let latestQuote = null;
  if (
    quote &&
    quote.freshness !== "unavailable" &&
    typeof quote.price === "string"
  ) {
    const checkedMs = Date.parse(quote.checkedAt);
    const session = Number.isFinite(checkedMs)
      ? tradingSessionDate(checkedMs)
      : null;
    const last = points.at(-1) ?? null;
    let reason = null;
    // Daily: the last point is the quote's session or the one before it (with
    // the same rule as gapBefore in a year the calendar does not cover).
    if (!last || !session) reason = "gap";
    else if (granularity === "monthly") {
      const month = monthOf(session);
      if (
        last.status !== "consolidated" ||
        (last.month !== month && last.month !== addMonths(month, -1))
      )
        reason = "gap";
    } else if (last.date > session || hasDataGap(last.date, session))
      reason = "gap";
    if (reason === null && basis === "adjusted") {
      const traded = nominal.get(last.date)?.close ?? null;
      if (traded === null || traded !== last.close) reason = "base_mismatch";
    }
    latestQuote = {
      price: quote.price,
      checkedAt: quote.checkedAt ?? null,
      freshness: quote.freshness,
      connect: reason === null,
      reason,
    };
  }

  const segments = [];
  for (const point of points) {
    const last = segments.at(-1);
    if (last && last.source === point.source) last.to = point.date;
    else
      segments.push({ from: point.date, to: point.date, source: point.source });
  }
  const from = points[0]?.date ?? null;
  const to = points.at(-1)?.date ?? null;

  // Notes are sentences for the screen (src/lib/priceSeries.ts keeps strings).
  const notes = [];
  if (from !== null) {
    const years = uncoveredYears(from, to);
    if (years.length)
      notes.push(
        `Sem calendário da B3 conferido para ${yearList(years)}: nesses anos, um feriado não vira lacuna; o traço só é interrompido com 3 ou mais dias úteis seguidos sem dado, e o mês só fica incompleto quando faltam 3 ou mais dias úteis no fim.`,
      );
  }
  if (basis === "adjusted" && points.length)
    notes.push(
      "Preços ajustados por proventos e eventos pela brapi, sem ajuste próprio da Escola.",
    );
  if (
    basis === "nominal" &&
    agf?.excluded > 0 &&
    agf.firstDate &&
    points.some((point) => point.source === "agf")
  )
    notes.push(
      `O histórico mais antigo da AGF foi ajustado por um método não documentado e não é usado.`,
    );
  if (basis === "nominal" && conflicts.length)
    notes.push(
      `Em ${conflicts.length} ${conflicts.length === 1 ? "data" : "datas"}, as fontes de preço nominal diferem mais de 0,5%; vale a de maior prioridade.`,
    );
  if (droppedToday)
    notes.push(
      "O fechamento do pregão de hoje entra no gráfico depois das 19:00.",
    );
  const usesBrapi = points.some((point) => point.source === "brapi");
  if (usesBrapi && brapi?.freshness === "stale")
    notes.push(
      "A brapi não respondeu agora; o histórico dela vem da última consulta válida.",
    );

  if (conflicts.length)
    log({
      event: "price_source_conflict",
      ticker,
      dates: conflicts.length,
      first: conflicts[0].date,
      last: conflicts.at(-1).date,
      sources: [
        ...new Set(conflicts.map((item) => `${item.kept}>${item.replaced}`)),
      ],
    });

  let unavailableReason = null;
  if (!selected.size) {
    if (basis === "adjusted")
      unavailableReason = brapi?.reason ?? "not_covered";
    else if (brapi?.includeRaw)
      unavailableReason = brapi.reason ?? "not_covered";
    else
      unavailableReason =
        brapi?.reason === "no_token" ? "no_token" : "not_covered";
  }

  return {
    ticker,
    basis,
    granularity,
    availableBases,
    defaultBasis,
    points,
    latestQuote,
    coverage: { from, to, segments, notes },
    unavailableReason,
    checkedAt: usesBrapi ? (brapi.checkedAt ?? null) : null,
  };
}
