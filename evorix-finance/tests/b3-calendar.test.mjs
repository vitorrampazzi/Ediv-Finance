import test from "node:test";
import assert from "node:assert/strict";
import {
  addDays,
  addMonths,
  calendarSource,
  hasDataGap,
  hasTradingDayBetween,
  isCoveredYear,
  isTradingDay,
  lastTradingDayOfMonth,
  nextTradingDay,
  noSessionReason,
  previousTradingDay,
  uncoveredGapWeekdays,
  uncoveredYears,
} from "../server/market/b3-calendar.js";
import {
  cacheTtlMs,
  marketSession,
  publicMarket,
  saoPauloClock,
  tradingSessionDate,
} from "../server/market/market-session.js";

// Calendar of docs/MARGEM-E-HISTORICO.md, checked against the B3 page and
// Ofício Circular 041/2026-VNC (consulted on 06/11/2026; see the module).

function weekdays(year) {
  let count = 0;
  for (let day = `${year}-01-01`; day.startsWith(String(year));) {
    const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
    if (weekday !== 0 && weekday !== 6) count++;
    day = addDays(day, 1);
  }
  return count;
}

function tradingDays(year) {
  let count = 0;
  for (let day = `${year}-01-01`; day.startsWith(String(year));) {
    if (isTradingDay(day)) count++;
    day = addDays(day, 1);
  }
  return count;
}

test("calendário: dias sem pregão conferidos de 2024 a 2026, e 2027 sem cobertura", () => {
  assert.deepEqual([...calendarSource.coveredYears], [2024, 2025, 2026]);
  assert.equal(calendarSource.consultedOn, "2026-11-06");
  // 2026: the 14 weekdays of OC 041/2026-VNC, including 24/12 and 31/12.
  for (const date of [
    "2026-01-01",
    "2026-02-16",
    "2026-02-17",
    "2026-04-03",
    "2026-04-21",
    "2026-05-01",
    "2026-06-04",
    "2026-09-07",
    "2026-10-12",
    "2026-11-02",
    "2026-11-20",
    "2026-12-24",
    "2026-12-25",
    "2026-12-31",
  ]) {
    assert.equal(isTradingDay(date), false, date);
    assert.ok(noSessionReason(date), date);
  }
  // Counted independently: weekdays minus the verified no-session days.
  assert.deepEqual(
    [2024, 2025, 2026].map((year) => [weekdays(year), tradingDays(year)]),
    [
      [262, 251],
      [261, 250],
      [261, 247],
    ],
  );
  // Ash Wednesday opens late but is a session; São Paulo holidays trade.
  for (const date of [
    "2026-02-18",
    "2025-03-05",
    "2024-02-14",
    "2026-07-09",
    "2024-07-09",
    "2024-01-25",
  ])
    assert.equal(isTradingDay(date), true, date);
  assert.equal(
    noSessionReason("2026-11-20"),
    "Dia Nacional de Zumbi e da Consciência Negra",
  );
  assert.equal(noSessionReason("2026-11-05"), null);
  // Weekends never trade, covered or not.
  for (const date of ["2026-11-07", "2026-11-08", "2027-01-02", "2023-12-24"])
    assert.equal(isTradingDay(date), false, date);
  // 2027 is not published by B3 yet: Monday to Friday, said explicitly.
  assert.equal(isCoveredYear(2027), false);
  assert.equal(isCoveredYear(2023), false);
  assert.equal(isTradingDay("2027-01-01"), true, "Fallback: a Friday counts");
  assert.equal(noSessionReason("2027-01-01"), null);
  assert.deepEqual(
    uncoveredYears("2021-03-01", "2027-02-01"),
    [2021, 2022, 2023, 2027],
  );
  assert.deepEqual(uncoveredYears("2024-01-02", "2026-12-30"), []);
});

test("calendário: pregão anterior e seguinte pulam feriados e fins de semana", () => {
  // Carnaval 2026: Friday 13/02 -> Ash Wednesday 18/02.
  assert.equal(nextTradingDay("2026-02-13"), "2026-02-18");
  assert.equal(previousTradingDay("2026-02-18"), "2026-02-13");
  // Finados (Monday 02/11/2026).
  assert.equal(nextTradingDay("2026-10-30"), "2026-11-03");
  assert.equal(previousTradingDay("2026-11-03"), "2026-10-30");
  // Christmas and year end.
  assert.equal(nextTradingDay("2026-12-23"), "2026-12-28");
  assert.equal(previousTradingDay("2026-12-28"), "2026-12-23");
  assert.equal(nextTradingDay("2026-12-30"), "2027-01-01", "2027 fallback");
  assert.equal(previousTradingDay("2025-01-02"), "2024-12-30");
  // Gaps count sessions only.
  assert.equal(hasTradingDayBetween("2026-10-30", "2026-11-03"), false);
  assert.equal(hasTradingDayBetween("2026-10-29", "2026-11-03"), true);
  assert.equal(hasTradingDayBetween("2026-11-04", "2026-11-05"), false);
  assert.equal(hasTradingDayBetween("2026-11-19", "2026-11-23"), false);
  // Last session of the month.
  assert.equal(lastTradingDayOfMonth("2026-12"), "2026-12-30");
  assert.equal(lastTradingDayOfMonth("2026-10"), "2026-10-30");
  assert.equal(lastTradingDayOfMonth("2026-05"), "2026-05-29");
  assert.equal(lastTradingDayOfMonth("2024-12"), "2024-12-30");
  assert.equal(lastTradingDayOfMonth("2025-12"), "2025-12-30");
  assert.equal(lastTradingDayOfMonth("2027-12"), "2027-12-31", "Fallback");
  assert.equal(addMonths("2026-12", 1), "2027-01");
  assert.equal(addMonths("2026-01", -1), "2025-12");
  for (const bad of ["2026-02-30", "2026-13-01", "26-01-01", "", null])
    assert.throws(() => isTradingDay(bad), TypeError, String(bad));
  assert.throws(() => lastTradingDayOfMonth("2026-13"), TypeError);
});

test("lacuna nos dados: regra exata nos anos conferidos e conservadora nos outros", () => {
  // Verified years: any missing session is a gap; holidays are not.
  assert.equal(hasDataGap("2026-10-30", "2026-11-03"), false, "Finados");
  assert.equal(hasDataGap("2026-10-29", "2026-11-03"), true, "30/10 missing");
  assert.equal(hasDataGap("2026-02-13", "2026-02-18"), false, "Carnaval 2026");
  assert.equal(hasDataGap("2026-11-04", "2026-11-05"), false);
  // Uncovered years: one or two missing weekdays may be holidays.
  assert.equal(uncoveredGapWeekdays, 3);
  assert.equal(hasDataGap("2023-02-17", "2023-02-22"), false, "Carnaval 2023");
  assert.equal(hasDataGap("2023-04-06", "2023-04-10"), false, "Good Friday");
  assert.equal(hasDataGap("2023-08-09", "2023-08-14"), false, "Thu and Fri");
  assert.equal(hasDataGap("2023-08-08", "2023-08-14"), true, "Three weekdays");
  assert.equal(hasDataGap("2021-08-06", "2021-08-16"), true, "Five weekdays");
  // 2027 is not covered yet: 01/01/2027 is a single missing weekday.
  assert.equal(hasDataGap("2026-12-30", "2027-01-04"), false);
  assert.equal(hasDataGap("2027-02-05", "2027-02-10"), false, "Carnaval 2027");
  // Across years the verified sessions still count: 02/01/2024 traded.
  assert.equal(hasDataGap("2023-12-28", "2024-01-02"), false);
  assert.equal(hasDataGap("2023-12-28", "2024-01-03"), true);
  // The exact helper is unchanged for verified years.
  assert.equal(
    hasTradingDayBetween("2023-02-17", "2023-02-22"),
    true,
    "Monday-Friday fallback",
  );
});

test("sessão: feriado da B3 fica fechado e a próxima abertura pula o feriado", () => {
  const at = (iso) => marketSession(Date.parse(iso));
  // Friday 20/11/2026 (Consciência Negra), 12:00 in São Paulo.
  const holiday = at("2026-11-20T15:00:00Z");
  assert.equal(holiday.state, "closed");
  assert.equal(holiday.settling, false);
  assert.equal(holiday.nextOpenAt, "2026-11-23T13:00:00.000Z");
  assert.equal(
    at("2026-11-19T21:30:00Z").nextOpenAt,
    "2026-11-23T13:00:00.000Z",
  );
  // Monday 02/11/2026 (Finados) and the Friday before it.
  assert.equal(at("2026-11-02T14:00:00Z").state, "closed");
  assert.equal(
    at("2026-10-30T21:00:00Z").nextOpenAt,
    "2026-11-03T13:00:00.000Z",
  );
  // Carnaval and Christmas.
  assert.equal(
    at("2026-02-13T22:00:00Z").nextOpenAt,
    "2026-02-18T13:00:00.000Z",
  );
  assert.equal(
    at("2026-12-23T22:00:00Z").nextOpenAt,
    "2026-12-28T13:00:00.000Z",
  );
  assert.equal(
    at("2026-12-30T22:00:00Z").nextOpenAt,
    "2027-01-01T13:00:00.000Z",
  );
  // A normal day is unchanged.
  assert.equal(at("2026-11-05T14:00:00Z").state, "open");
  // Holiday: closed cadence and closed TTL (until the opening, at most 12 h).
  assert.deepEqual(publicMarket(Date.parse("2026-11-20T15:00:00Z")), {
    state: "closed",
    refreshSeconds: 1800,
    nextRefreshAt: "2026-11-20T15:30:00.000Z",
  });
  assert.equal(
    cacheTtlMs("catalog", Date.parse("2026-11-20T15:00:00Z")),
    12 * 60 * 60_000,
  );
  // 18:10 on a holiday is not the settling window of a session.
  assert.equal(
    cacheTtlMs("quote", Date.parse("2026-11-20T21:10:00Z")),
    12 * 60 * 60_000,
  );
  assert.equal(
    cacheTtlMs("series", Date.parse("2026-11-05T14:00:00Z")),
    60 * 60_000,
  );
});

test("sessão de referência de um preço e relógio de São Paulo", () => {
  const session = (iso) => tradingSessionDate(Date.parse(iso));
  assert.equal(session("2026-11-05T13:00:00Z"), "2026-11-05", "10:00 opens");
  assert.equal(
    session("2026-11-05T12:59:00Z"),
    "2026-11-04",
    "Before the opening",
  );
  assert.equal(session("2026-11-05T23:00:00Z"), "2026-11-05");
  assert.equal(session("2026-11-07T15:00:00Z"), "2026-11-06", "Saturday");
  assert.equal(session("2026-11-03T12:00:00Z"), "2026-10-30", "After Finados");
  assert.equal(session("2026-11-20T15:00:00Z"), "2026-11-19", "Holiday");
  // 02:00 UTC is still the previous day in São Paulo.
  assert.deepEqual(saoPauloClock(Date.parse("2026-11-06T02:30:00Z")), {
    date: "2026-11-05",
    minute: 23 * 60 + 30,
  });
});
