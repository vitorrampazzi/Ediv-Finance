import test from "node:test";
import assert from "node:assert/strict";
import { safetyMarginFormula } from "../safety-margin.mjs";
import {
  indicatorHelp,
  indicatorText,
} from "../src/lib/indicatorDefinitions.ts";

const keys = Object.keys(indicatorHelp);

test("every indicator has a title and at least two layers", () => {
  for (const key of keys) {
    const help = indicatorHelp[key];
    assert.ok(help.title.trim(), `${key}: título vazio`);
    assert.ok(help.layers.length >= 2, `${key}: menos de duas camadas`);
  }
});

test('the first layer of every indicator is "O que é"', () => {
  for (const key of keys) {
    assert.equal(indicatorHelp[key].layers[0].label, "O que é", key);
  }
});

test("no layer or note is empty or shows a broken value", () => {
  const broken = /undefined|NaN|null|\[object/;
  for (const key of keys) {
    const { layers, note } = indicatorHelp[key];
    for (const layer of layers) {
      assert.ok(layer.label.trim(), `${key}: rótulo vazio`);
      assert.ok(layer.text.trim(), `${key}: texto vazio em "${layer.label}"`);
      assert.doesNotMatch(layer.text, broken, `${key}: "${layer.label}"`);
    }
    if (note !== undefined) {
      assert.ok(note.trim(), `${key}: nota vazia`);
      assert.doesNotMatch(note, broken, `${key}: nota`);
    }
  }
});

test("safety margin explanations state the formula exported by safety-margin.mjs", () => {
  assert.ok(safetyMarginFormula.length > 0);
  assert.ok(
    indicatorText("safetyMargin").includes(safetyMarginFormula),
    "safetyMargin não cita a fórmula de safety-margin.mjs",
  );
});

test("indicator help analytics sends only groups from the closed list", async () => {
  const { analyticsEvents } = await import("../analytics-policy.mjs");
  const { indicatorAnalyticsName, columnHelp } =
    await import("../src/lib/indicatorDefinitions.ts");
  const allowed = analyticsEvents.open_indicator_help.indicator;
  for (const key of keys) {
    const name = indicatorAnalyticsName(key);
    assert.ok(allowed.includes(name), `${key}: ${name} fora da lista`);
    assert.equal(indicatorAnalyticsName(indicatorHelp[key]), name, key);
  }
  assert.equal(
    indicatorAnalyticsName("estimatedGrossDividendYield"),
    "dividend_yield",
  );
  // A table column keeps the group even with the spreadsheet's own title.
  const column = columnHelp(
    { key: "safetyMargin", label: "Margem", format: "percent" },
    true,
  );
  assert.equal(indicatorAnalyticsName(column), "safety_margin");
  for (const value of ["PETR4", "toString", "", "Texto livre", null, 42, {}])
    assert.equal(indicatorAnalyticsName(value), null, String(value));
});
