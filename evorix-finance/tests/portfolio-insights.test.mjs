import test from "node:test";
import assert from "node:assert/strict";
import { ledger } from "../server/ledger.js";
import {
  portfolioInsights,
  valuePortfolioPositions,
} from "../server/portfolio-insights.js";

const asOf = "2026-10-07T12:00:00.000Z";
const summary = { realizedPnl: "3.00000000", receivedIncome: "8.00000000" };
const position = (ticker, quantity, costBasis, assetType = "ACAO") => ({
  ticker,
  assetName: `Empresa ${ticker}`,
  assetType,
  quantity,
  costBasis,
  averageCost: "1.00000000",
});
const quote = (symbol, price, extra = {}) => ({
  symbol,
  price,
  currency: "BRL",
  source: "brapi.dev",
  stale: false,
  marketTime: "2026-10-06T18:00:00.000Z",
  ...extra,
});
const insights = (positions, quotes = []) =>
  portfolioInsights(valuePortfolioPositions(positions, quotes), summary, {
    asOf,
  });

test("carteira vazia não recebe valorização ou perdas artificiais", () => {
  const result = insights([]);
  assert.equal(result.status, "EMPTY");
  assert.equal(result.openCostBasis, "0.00000000");
  assert.equal(result.quotedMarketValue, null);
  assert.equal(result.unrealizedPnl, null);
  assert.equal(result.unrealizedPnlPercent, null);
  assert.equal(result.coverage.costPercent, null);
  assert.equal(result.concentration, null);
  assert.equal(result.realizedPnl, summary.realizedPnl);
  assert.equal(result.receivedIncome, summary.receivedIncome);
  assert.deepEqual(result.allocation, []);
  assert.equal(result.asOf, asOf);
});

test("resultado vs custo inclui taxas e pondera os valores investidos", () => {
  const calculated = ledger([
    {
      id: "a",
      side: "BUY",
      ticker: "TEST3",
      asset_name: "Test",
      asset_type: "ACAO",
      quantity: "10",
      unit_price: "10",
      fees: "10",
      traded_at: "2026-01-01",
    },
    {
      id: "b",
      side: "BUY",
      ticker: "FUNDO11",
      asset_name: "Fundo",
      asset_type: "FII",
      quantity: "5",
      unit_price: "10",
      fees: "0",
      traded_at: "2026-01-01",
    },
  ]);
  const result = portfolioInsights(
    valuePortfolioPositions(calculated.positions, [
      quote("TEST3", "15"),
      quote("FUNDO11", "8"),
    ]),
    calculated.summary,
    { asOf },
  );
  assert.equal(result.status, "COMPLETE");
  assert.equal(result.openCostBasis, "160.00000000");
  assert.equal(result.quotedMarketValue, "190.00000000");
  assert.equal(result.unrealizedPnl, "30.00000000");
  assert.equal(result.unrealizedPnlPercent, "18.7500");
  assert.equal(result.coverage.costPercent, "100.0000");
  assert.equal(result.concentration.ticker, "TEST3");
  assert.equal(result.concentration.weightPercent, "68.7500");
  assert.equal(result.biggestGain.amount, "40.00000000");
  assert.equal(result.biggestGain.percent, "36.3636");
  assert.equal(result.biggestLoss.amount, "-10.00000000");
  assert.equal(result.biggestLoss.percent, "-20.0000");
});

test("cotação parcial considera somente custo e valor dos ativos cotados", () => {
  const result = insights(
    [position("TEST3", "10", "100"), position("CDB", "1", "300", "RENDA_FIXA")],
    [quote("TEST3", "12")],
  );
  assert.equal(result.status, "PARTIAL");
  assert.equal(result.openCostBasis, "400.00000000");
  assert.equal(result.quotedCostBasis, "100.00000000");
  assert.equal(result.quotedMarketValue, "120.00000000");
  assert.equal(result.unrealizedPnl, "20.00000000");
  assert.equal(result.unrealizedPnlPercent, "20.0000");
  assert.equal(result.coverage.costPercent, "25.0000");
  assert.deepEqual(result.coverage.unpricedTickers, ["CDB"]);
  assert.equal(result.concentration.ticker, "CDB");
  assert.equal(result.concentration.weightPercent, "75.0000");
  assert.equal(result.positions[0].marketValue, null);
  assert.deepEqual(result.allocation, [
    {
      assetType: "RENDA_FIXA",
      costBasis: "300.00000000",
      weightPercent: "75.0000",
    },
    { assetType: "ACAO", costBasis: "100.00000000", weightPercent: "25.0000" },
  ]);
});

test("cotações inválidas, indisponíveis ou em outra moeda não causam prejuízo falso", () => {
  for (const invalid of [
    quote("TEST3", null),
    quote("TEST3", "0"),
    quote("TEST3", "-1"),
    quote("TEST3", "NaN"),
    quote("TEST3", "100", { currency: "USD" }),
    quote("TEST3", "100", { unavailable: true }),
  ]) {
    const result = insights([position("TEST3", "10", "100")], [invalid]);
    assert.equal(result.status, "UNPRICED");
    assert.equal(result.quotedMarketValue, null);
    assert.equal(result.unrealizedPnl, null);
    assert.equal(result.biggestLoss, null);
    assert.equal(result.coverage.costPercent, "0.0000");
  }
});

test("quantidade fracionada mantém precisão decimal e sinal do resultado", () => {
  const result = insights(
    [position("TEST3", "0.10000000", "0.03000000")],
    [quote("TEST3", "0.20000000")],
  );
  assert.equal(result.quotedMarketValue, "0.02000000");
  assert.equal(result.unrealizedPnl, "-0.01000000");
  assert.equal(result.unrealizedPnlPercent, "-33.3333");
  assert.equal(result.biggestGain, null);
  assert.equal(result.biggestLoss.amount, "-0.01000000");
});

test("datas são do preço informado pelo mercado, sem inventar história diária", () => {
  const result = insights(
    [
      position("TEST3", "1", "10"),
      position("TEST4", "1", "10"),
      position("TEST5", "1", "10"),
    ],
    [
      quote("TEST3", "12", { stale: true, marketTime: "2026-10-05T15:00:00Z" }),
      quote("TEST4", "10", { marketTime: "2026-10-06T16:00:00Z" }),
      quote("TEST5", "11", { marketTime: null, checkedAt: asOf }),
    ],
  );
  assert.equal(result.coverage.stalePositionCount, 1);
  assert.deepEqual(result.quoteRange, {
    oldest: "2026-10-05T15:00:00.000Z",
    newest: "2026-10-06T16:00:00.000Z",
  });
  assert.equal(Object.hasOwn(result, "dailyChange"), false);
  assert.equal(Object.hasOwn(result, "history"), false);
  assert.equal(result.positions[2].unrealizedPnlPercent, "10.0000");
  assert.deepEqual(
    insights(
      [position("TEST3", "1", "10")],
      [quote("TEST3", "12", { marketTime: "inválido", checkedAt: asOf })],
    ).quoteRange,
    { oldest: null, newest: null },
  );
});

test("custo zero não divide por zero e helpers preservam as entradas", () => {
  const positions = [position("TEST3", "0.00000001", "0.00000000")];
  const quotes = [quote("TEST3", "0.00000001")];
  const beforePositions = structuredClone(positions);
  const beforeQuotes = structuredClone(quotes);
  const result = insights(positions, quotes);
  assert.equal(result.unrealizedPnl, "0.00000000");
  assert.equal(result.unrealizedPnlPercent, null);
  assert.equal(result.concentration.weightPercent, null);
  assert.equal(result.biggestGain, null);
  assert.equal(result.biggestLoss, null);
  assert.deepEqual(positions, beforePositions);
  assert.deepEqual(quotes, beforeQuotes);
});
