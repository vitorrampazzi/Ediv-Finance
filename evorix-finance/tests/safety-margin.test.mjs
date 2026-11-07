import assert from "node:assert/strict";
import test from "node:test";
import {
  formatSafetyMarginPercent,
  researchMarginPercent,
  safetyMarginPercent,
} from "../safety-margin.mjs";

test("margem: exemplos do corretor com preço-teto de R$ 10,00", () => {
  const cases = [
    ["5", "50.00"],
    ["8", "20.00"],
    ["10", "0.00"],
    ["12", "-20.00"],
    ["4", "60.00"],
  ];
  for (const [price, expected] of cases)
    assert.equal(safetyMarginPercent("10.00", price), expected, price);
});

test("margem: o preço-teto não muda e a margem acompanha a cotação", () => {
  const ceiling = "10.00";
  assert.equal(safetyMarginPercent(ceiling, "5.00"), "50.00");
  assert.equal(safetyMarginPercent(ceiling, "8.00"), "20.00");
  assert.equal(ceiling, "10.00");
});

test("margem: conta exata, sem erro de ponto flutuante", () => {
  // 0.1 + 0.2 style traps and half-way rounding, away from zero.
  assert.equal(safetyMarginPercent("3", "1"), "66.67");
  assert.equal(safetyMarginPercent("3", "2"), "33.33");
  assert.equal(safetyMarginPercent("8", "7.0004"), "12.50");
  assert.equal(safetyMarginPercent("8", "7.0012"), "12.49");
  assert.equal(safetyMarginPercent("2", "2.0001"), "-0.01");
  assert.equal(safetyMarginPercent("2", "2.00009"), "0.00");
  assert.equal(safetyMarginPercent("32.74", "19.37000000"), "40.84");
  assert.equal(safetyMarginPercent(10, 8), "20.00");
  assert.equal(safetyMarginPercent("10", "30"), "-200.00");
});

test("margem: entradas inválidas não viram número", () => {
  for (const [ceiling, price] of [
    [null, "5"],
    ["10", null],
    [undefined, "5"],
    ["0", "5"],
    ["-10", "5"],
    ["10", "0"],
    ["10", "-1"],
    ["", "5"],
    ["10", "abc"],
    ["1e3", "5"],
    [Number.NaN, "5"],
    [Number.POSITIVE_INFINITY, "5"],
    ["10", "R$ 5"],
    ["10", "5,00"],
    [{}, "5"],
  ])
    assert.equal(safetyMarginPercent(ceiling, price), null, `${ceiling} ${price}`);
});

test("margem da pesquisa vira o mesmo formato, sem arredondar duas vezes", () => {
  assert.equal(researchMarginPercent("0.41"), "41.00");
  assert.equal(researchMarginPercent("-0.5"), "-50.00");
  assert.equal(researchMarginPercent("0.123449"), "12.34");
  assert.equal(researchMarginPercent("0.12345"), "12.35");
  assert.equal(researchMarginPercent(null), null);
  assert.equal(researchMarginPercent("x"), null);
});

test("formatação em pt-BR com duas casas", () => {
  assert.equal(formatSafetyMarginPercent("20.00"), "20,00%");
  assert.equal(formatSafetyMarginPercent("-20.00"), "−20,00%");
  assert.equal(formatSafetyMarginPercent("0.00"), "0,00%");
  assert.equal(formatSafetyMarginPercent("1234.50"), "1.234,50%");
  assert.equal(formatSafetyMarginPercent(null), "Não informado");
  assert.equal(formatSafetyMarginPercent("20"), "Não informado");
});
