import test from "node:test";
import assert from "node:assert/strict";
import {
  dividendNumber,
  dividendComparison,
  dividendAnnouncementMonths,
  compactDividendValue,
} from "../dividend-insights.mjs";

test("números ausentes não viram zero; apenas strings numéricas finitas são aceitas", () => {
  for (const value of [
    null,
    undefined,
    "",
    " ",
    "NaN",
    "Infinity",
    "-Infinity",
    "1e309",
    "1,5",
    "R$ 12",
    "106%",
    "0x10",
    "12abc",
  ])
    assert.equal(dividendNumber(value), null, String(value));
  for (const [value, expected] of [
    ["0", 0],
    ["-2.5", -2.5],
    ["1.06", 1.06],
    [" 0.115 ", 0.115],
    ["1e6", 1e6],
  ])
    assert.equal(dividendNumber(value), expected);
});

test("comparação é fração derivada e exige dois valores positivos", () => {
  assert.equal(dividendComparison("15", "10"), 0.5);
  assert.equal(dividendComparison("5", "10"), -0.5);
  assert.equal(dividendComparison("10", "10"), 0);
  for (const value of [
    null,
    undefined,
    "",
    " ",
    "0",
    "-0",
    "-1",
    "NaN",
    "Infinity",
  ])
    for (const pair of [
      [value, "10"],
      ["10", value],
    ])
      assert.equal(dividendComparison(...pair), null);
  assert.equal(dividendComparison("1e308", "1e-308"), null);
  assert.equal(dividendComparison("1e308", "1e308"), 0);
});

test("calendário reconhece listas reais da fonte, acentos, abreviações e intervalos explícitos", () => {
  const cases = [
    ["mar abr jun set dez", [3, 4, 6, 9, 12]],
    ["jan-dez", Array.from({ length: 12 }, (_, i) => i + 1)],
    ["fevereiro e agosto", [2, 8]],
    ["abril e nov", [4, 11]],
    ["abril e novembro", [4, 11]],
    ["jun e dez", [6, 12]],
    ["mar jun set e dez", [3, 6, 9, 12]],
    ["abril", [4]],
    ["junho e dez", [6, 12]],
    ["fev mai ago e nov", [2, 5, 8, 11]],
    ["abr mai ago nov", [4, 5, 8, 11]],
    ["fev até dez", Array.from({ length: 11 }, (_, i) => i + 2)],
    ["mar, ago e dez", [3, 8, 12]],
    ["jan, abr, ago e nov", [1, 4, 8, 11]],
    ["março, agosto e novembro", [3, 8, 11]],
    ["fevereiro e ago", [2, 8]],
    ["fev, abr, julho e out", [2, 4, 7, 10]],
    ["abril e agosto", [4, 8]],
    ["jan a dezembro", Array.from({ length: 12 }, (_, i) => i + 1)],
    ["Abril e novembro", [4, 11]],
    ["mar abr jun set e dez", [3, 4, 6, 9, 12]],
    ["abr jul out e dez", [4, 7, 10, 12]],
    ["mai, ago, nov, dez", [5, 8, 11, 12]],
    ["maio e dez", [5, 12]],
    ["mar jun set dez", [3, 6, 9, 12]],
    ["maio ago e nov", [5, 8, 11]],
    ["fev maio ago e nov", [2, 5, 8, 11]],
    ["Mar, jun, set, dez", [3, 6, 9, 12]],
    ["jan, abr, jul, out", [1, 4, 7, 10]],
    ["mar, jun e out", [3, 6, 10]],
    ["abr set e dez", [4, 9, 12]],
    ["dezembro", [12]],
    ["março e dezembro", [3, 12]],
    ["abr jun set dez", [4, 6, 9, 12]],
    ["mar abr mai ago nov", [3, 4, 5, 8, 11]],
    ["fev, mai, ago, nov", [2, 5, 8, 11]],
    ["mar mai ago nov", [3, 5, 8, 11]],
    ["abril e dezembro", [4, 12]],
    ["abril e dez", [4, 12]],
    ["Indefinido", null],
    ["abr ago e nov", [4, 8, 11]],
    ["fev junho e dez", [2, 6, 12]],
    ["jun set e dez", [6, 9, 12]],
    ["abr jul dez", [4, 7, 12]],
    ["mar maio ago e nov", [3, 5, 8, 11]],
    ["maio, ago e dez", [5, 8, 12]],
    ["outubro", [10]],
    ["mar, jun, set e dez", [3, 6, 9, 12]],
    ["mar ago e out", [3, 8, 10]],
    ["jan ago e dez", [1, 8, 12]],
    ["Abril e dezembro", [4, 12]],
    ["jun set dez", [6, 9, 12]],
    ["DEZ.; Jan.; março e jan", [1, 3, 12]],
    ["jan–mar", [1, 2, 3]],
  ];
  for (const [text, expected] of cases)
    assert.deepEqual(dividendAnnouncementMonths(text), expected, text);
});

test("calendário ambíguo/desconhecido não inventa meses nem infere frequência", () => {
  for (const text of [
    null,
    undefined,
    "",
    " ",
    "Indefinido",
    "mensal",
    "trimestral",
    "todos os meses",
    "mar ou abr",
    "mar talvez",
    "jan 2026",
    "1/3",
    "dez-fev",
    "jan-",
    "e jan",
    "jan e",
    "jan e e fev",
    "jan até",
    "jan--dez",
    "m.a.r",
    "mar a fev",
  ])
    assert.equal(dividendAnnouncementMonths(text), null, String(text));
  assert.deepEqual(dividendAnnouncementMonths("mar a mar"), [3]);
});

test("formato compacto preserva sinal, unidades e ausência, inclusive payout106% como número1.06", () => {
  const normal = (value) => value.replace(/\u00a0/g, " ");
  for (const value of [null, undefined, "", " ", "NaN", "Infinity", "1e309"])
    assert.equal(compactDividendValue(value, "currency"), "Não informado");
  const cases = [
    ["0", "currency", "R$ 0,00"],
    ["-0", "quantity", "0,00"],
    ["-1500", "currency", "-R$ 1,50 mil"],
    ["1250000", "currency", "R$ 1,25 mi"],
    ["2500000000", "quantity", "2,50 bi"],
    ["999", "quantity", "999,00"],
    ["1000", "quantity", "1,00 mil"],
    ["1.06", "quantity", "1,06"],
    ["104995666.67", "quantity", "105,00 mi"],
  ];
  for (const [value, format, expected] of cases)
    assert.equal(normal(compactDividendValue(value, format)), expected);
});
