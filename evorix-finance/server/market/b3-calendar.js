// B3 trading calendar for the listed equities market (docs/MARGEM-E-HISTORICO.md).
// Dates are São Paulo calendar days written "AAAA-MM-DD". Pure functions: the
// caller passes the date, so tests never depend on the real clock.
//
// Days without a trading session ("não haverá negociação nos mercados de renda
// variável" / "sem sessão de negociação na B3"), consulted on 06/11/2026:
// - B3, Calendário de negociação, Feriados (2024, 2025 and 2026):
//   https://www.b3.com.br/pt_br/solucoes/plataformas/puma-trading-system/para-participantes-e-traders/calendario-de-negociacao/feriados/
// - B3, Ofício Circular 041/2026-VNC, 30/06/2026, "Calendário de feriados em
//   2026" (errata of 003/2026-VNC; only a US-holiday FX table changed):
//   https://www.b3.com.br/data/files/20/57/01/AA/06A1F910ADC36BE9AC094EA8/OC%20041-2026-VNC%20ERRATA%20-%20CALENDARIO%20DE%20FERIADOS%20EM%202026_PT.pdf
// - Cross-check of the national holidays at ANBIMA:
//   https://www.anbima.com.br/feriados/fer_nacionais/2024.asp (also 2025.asp
//   and 2026.asp). B3 adds 24/12 and 31/12, which have no session.
// São Paulo city/state holidays (25/01, 09/07) have normal trading since 2022.
// Ash Wednesday opens at 13:00; it is a trading day and the late opening is
// not modeled.
// 2027: B3 had not published the calendar on 06/11/2026, so the year is not
// covered. A year without coverage falls back to Monday to Friday, and the
// callers say so (isCoveredYear / uncoveredYears). For gaps in the data such a
// year uses a conservative rule instead (hasDataGap).
const noSessionDays = Object.freeze({
  2024: Object.freeze({
    "2024-01-01": "Confraternização Universal",
    "2024-02-12": "Carnaval",
    "2024-02-13": "Carnaval",
    "2024-03-29": "Paixão de Cristo",
    "2024-05-01": "Dia do Trabalho",
    "2024-05-30": "Corpus Christi",
    "2024-11-15": "Proclamação da República",
    "2024-11-20": "Consciência Negra",
    "2024-12-24": "Expediente interno nas instituições bancárias",
    "2024-12-25": "Natal",
    "2024-12-31": "Expediente interno nas instituições bancárias",
  }),
  2025: Object.freeze({
    "2025-01-01": "Confraternização Universal",
    "2025-03-03": "Carnaval",
    "2025-03-04": "Carnaval",
    "2025-04-18": "Sexta-feira Santa",
    "2025-04-21": "Tiradentes",
    "2025-05-01": "Dia do Trabalho",
    "2025-06-19": "Corpus Christi",
    "2025-11-20": "Dia Nacional de Zumbi e da Consciência Negra",
    "2025-12-24": "Véspera de Natal",
    "2025-12-25": "Natal",
    "2025-12-31": "Expediente interno nas instituições bancárias",
  }),
  2026: Object.freeze({
    "2026-01-01": "Confraternização Universal",
    "2026-02-16": "Carnaval",
    "2026-02-17": "Carnaval",
    "2026-04-03": "Sexta-feira Santa",
    "2026-04-21": "Tiradentes",
    "2026-05-01": "Dia do Trabalho",
    "2026-06-04": "Corpus Christi",
    "2026-09-07": "Independência do Brasil",
    "2026-10-12": "Nossa Senhora Aparecida",
    "2026-11-02": "Finados",
    "2026-11-20": "Dia Nacional de Zumbi e da Consciência Negra",
    "2026-12-24": "Véspera de Natal",
    "2026-12-25": "Natal",
    "2026-12-31": "Expediente interno nas instituições bancárias",
  }),
});

const datePattern = /^(\d{4})-(\d{2})-(\d{2})$/;
const monthPattern = /^(\d{4})-(\d{2})$/;
const dayMs = 86_400_000;
// The longest run without a session is far shorter (Carnaval + weekend).
const maxSearchDays = 31;

export const calendarSource = Object.freeze({
  consultedOn: "2026-11-06",
  coveredYears: Object.freeze(Object.keys(noSessionDays).map(Number)),
});

function parts(date) {
  const match = typeof date === "string" ? datePattern.exec(date) : null;
  if (!match) throw new TypeError("Invalid calendar date");
  const [year, month, day] = match.slice(1).map(Number);
  const ms = Date.UTC(year, month - 1, day);
  if (new Date(ms).toISOString().slice(0, 10) !== date)
    throw new TypeError("Invalid calendar date");
  return { year, month, day, ms };
}

function fromMs(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

export function isCalendarDate(value) {
  try {
    parts(value);
    return true;
  } catch {
    return false;
  }
}

export function addDays(date, days) {
  return fromMs(parts(date).ms + days * dayMs);
}

export function isCoveredYear(year) {
  return Object.hasOwn(noSessionDays, String(year));
}

/** Holiday or no-session day name from the verified calendar, or null. */
export function noSessionReason(date) {
  const { year } = parts(date);
  return isCoveredYear(year) ? (noSessionDays[year][date] ?? null) : null;
}

/** Monday to Friday and not a verified no-session day. */
export function isTradingDay(date) {
  const { ms, year } = parts(date);
  const weekday = new Date(ms).getUTCDay();
  if (weekday === 0 || weekday === 6) return false;
  return !(isCoveredYear(year) && Object.hasOwn(noSessionDays[year], date));
}

/** The last trading day strictly before `date`. */
export function previousTradingDay(date) {
  let day = date;
  for (let step = 0; step < maxSearchDays; step++) {
    day = addDays(day, -1);
    if (isTradingDay(day)) return day;
  }
  throw new Error("No trading day found");
}

/** The first trading day strictly after `date`. */
export function nextTradingDay(date) {
  let day = date;
  for (let step = 0; step < maxSearchDays; step++) {
    day = addDays(day, 1);
    if (isTradingDay(day)) return day;
  }
  throw new Error("No trading day found");
}

/** True when at least one trading day lies strictly between the two dates. */
export function hasTradingDayBetween(earlier, later) {
  return nextTradingDay(earlier) < later;
}

// In a year the calendar does not cover, one or two missing weekdays may be
// holidays (Carnaval is Monday and Tuesday): only this many in a row are a
// hole in the data.
export const uncoveredGapWeekdays = 3;

/**
 * True when the data skips B3 sessions between the two dates (both excluded).
 * In a verified year any missing trading day counts; in a year without the
 * calendar only uncoveredGapWeekdays or more missing weekdays count, so an
 * ordinary holiday never breaks a line.
 */
export function hasDataGap(earlier, later) {
  let missingWeekdays = 0;
  for (let day = addDays(earlier, 1); day < later; day = addDays(day, 1)) {
    const { year, ms } = parts(day);
    if (isCoveredYear(year)) {
      if (isTradingDay(day)) return true;
      continue;
    }
    const weekday = new Date(ms).getUTCDay();
    if (
      weekday !== 0 &&
      weekday !== 6 &&
      ++missingWeekdays >= uncoveredGapWeekdays
    )
      return true;
  }
  return false;
}

export function monthOf(date) {
  parts(date);
  return date.slice(0, 7);
}

function monthParts(month) {
  const match = typeof month === "string" ? monthPattern.exec(month) : null;
  const value = match ? [Number(match[1]), Number(match[2])] : null;
  if (!value || value[1] < 1 || value[1] > 12)
    throw new TypeError("Invalid calendar month");
  return value;
}

export function addMonths(month, months) {
  const [year, number] = monthParts(month);
  return fromMs(Date.UTC(year, number - 1 + months, 1)).slice(0, 7);
}

/** The last trading day of "AAAA-MM". */
export function lastTradingDayOfMonth(month) {
  const [year, number] = monthParts(month);
  const last = fromMs(Date.UTC(year, number, 0));
  return isTradingDay(last) ? last : previousTradingDay(last);
}

/** Years between the two dates (inclusive) that use the Monday-Friday rule. */
export function uncoveredYears(from, to) {
  const first = parts(from).year;
  const last = parts(to).year;
  const years = [];
  for (let year = first; year <= last; year++)
    if (!isCoveredYear(year)) years.push(year);
  return years;
}
