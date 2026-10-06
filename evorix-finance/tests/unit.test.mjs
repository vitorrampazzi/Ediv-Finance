import test from "node:test";
import assert from "node:assert/strict";
import { ledger, toUnits, fromUnits, multiplyUnits } from "../server/ledger.js";
import { hasPermission, permissionsForRole } from "../server/permissions.js";
import { compareResearch } from "../server/research-diff.js";
import {
  parseCsv,
  localizedDecimal,
  csvDownload,
} from "../server/spreadsheet.js";
const tx = (
  side,
  quantity,
  price,
  date = "2026-01-01",
  fees = "0",
  ticker = "TEST3",
) => ({
  id: side + date,
  side,
  ticker,
  asset_name: ticker,
  asset_type: "ACAO",
  quantity,
  unit_price: price,
  fees,
  traded_at: date + " 12:00:00.000",
});
test("decimais mantêm oito casas sem ponto flutuante", () => {
  assert.equal(fromUnits(toUnits("0.1") + toUnits("0.2")), "0.30000000");
  assert.equal(
    fromUnits(multiplyUnits(toUnits("0.01"), toUnits("0.03"))),
    "0.00030000",
  );
  assert.equal(fromUnits(toUnits("-123.45")), "-123.45000000");
});
test("custo inclui taxas e venda parcial realiza apenas o resultado correspondente", () => {
  const result = ledger([
    tx("BUY", "10", "10", "2026-01-01", "2"),
    tx("SELL", "4", "12", "2026-01-02", "1"),
  ]);
  assert.equal(result.positions[0].quantity, "6.00000000");
  assert.equal(result.positions[0].costBasis, "61.20000000");
  assert.equal(result.summary.realizedPnl, "6.20000000");
});
test("venda integral zera custo e posição", () => {
  const r = ledger([
    tx("BUY", "3", "0.1"),
    tx("SELL", "3", "0.2", "2026-01-02"),
  ]);
  assert.equal(r.positions.length, 0);
  assert.equal(r.summary.realizedPnl, "0.30000000");
});
test("venda sem posição e venda retroativa são rejeitadas", () => {
  assert.throws(() => ledger([tx("SELL", "1", "10")]), /negativa/);
  assert.throws(
    () =>
      ledger([
        tx("BUY", "10", "10", "2026-01-03"),
        tx("SELL", "1", "12", "2026-01-01"),
      ]),
    /negativa/,
  );
});
test("ordem de entrada não altera a cronologia", () => {
  const rows = [tx("BUY", "10", "10"), tx("SELL", "2", "12", "2026-01-02")];
  assert.deepEqual(ledger(rows), ledger([...rows].reverse()));
});
test("anúncios não são somados aos proventos recebidos", () => {
  const result = ledger(
    [],
    [
      {
        ticker: "TEST3",
        kind: "DIVIDEND",
        amount: "5",
        status: "ANNOUNCED",
        occurred_at: "2026-02-01",
      },
      {
        ticker: "TEST3",
        kind: "JCP",
        amount: "3.5",
        status: "RECEIVED",
        occurred_at: "2026-02-02",
      },
    ],
  );
  assert.equal(result.summary.receivedIncome, "3.50000000");
});
test("desdobramento preserva custo e modifica preço médio", () => {
  const r = ledger(
    [tx("BUY", "10", "20")],
    [
      {
        ticker: "TEST3",
        kind: "SPLIT",
        factor: "2",
        status: "RECEIVED",
        occurred_at: "2026-01-02",
      },
    ],
  );
  assert.equal(r.positions[0].quantity, "20.00000000");
  assert.equal(r.positions[0].costBasis, "200.00000000");
  assert.equal(r.positions[0].averageCost, "10.00000000");
});
test("bonificação adiciona custo atribuído e exige posição", () => {
  const event = {
    ticker: "TEST3",
    kind: "BONUS",
    factor: "1.1",
    amount: "5",
    status: "RECEIVED",
    occurred_at: "2026-01-02",
  };
  assert.equal(
    ledger([tx("BUY", "10", "20")], [event]).positions[0].costBasis,
    "205.00000000",
  );
  assert.throws(() => ledger([], [event]), /Não há posição/);
});
test("classes conflitantes para posição aberta são rejeitadas", () =>
  assert.throws(
    () =>
      ledger([
        tx("BUY", "1", "10"),
        { ...tx("BUY", "1", "10", "2026-01-02"), asset_type: "FII" },
      ]),
    /classes diferentes/,
  ));
test("somente Analista e Administrador gerenciam atendimento e pesquisa", () => {
  for (const role of ["USER", "ANALYST", "ADMIN"]) {
    assert.equal(hasPermission({ role }, "support:manage"), role !== "USER");
    assert.equal(hasPermission({ role }, "rankings:write"), role !== "USER");
    assert.equal(hasPermission({ role }, "users:manage"), role === "ADMIN");
  }
});
test("conta bloqueada, visitante e perfil desconhecido não recebem privilégios", () => {
  assert.equal(
    hasPermission({ role: "ADMIN", blocked: true }, "users:manage"),
    false,
  );
  assert.equal(hasPermission(null, "rankings:write"), false);
  assert.deepEqual(permissionsForRole("INVALID"), []);
  assert.deepEqual(permissionsForRole("__proto__"), []);
  assert.equal(hasPermission({ role: "constructor" }, "users:manage"), false);
  const p = permissionsForRole("USER");
  p.push("users:manage");
  assert.equal(hasPermission({ role: "USER" }, "users:manage"), false);
});
test("comparação identifica adição, remoção, preço e risco alterados", () => {
  const r = compareResearch(
    [
      { ticker: "A3", companyName: "A", targetPrice: "10", risks: "Antigo" },
      { ticker: "B3" },
    ],
    [
      { ticker: "A3", companyName: "A", targetPrice: "11", risks: "Novo" },
      { ticker: "C3" },
    ],
  );
  assert.equal(r.added[0].ticker, "C3");
  assert.equal(r.removed[0].ticker, "B3");
  assert.deepEqual(r.changed[0].fields, ["targetPrice", "risks"]);
  assert.equal(r.changed[0].before.targetPrice, "10");
});
test("comparar não modifica publicações e normaliza campos ausentes", () => {
  const a = [{ ticker: "A3", thesis: null }];
  const b = [{ ticker: "A3", thesis: "" }];
  assert.equal(compareResearch(a, b).unchanged, 1);
  assert.deepEqual(a, [{ ticker: "A3", thesis: null }]);
});
test("CSV aceita BOM, decimal local, aspas e texto multilinha", () => {
  assert.deepEqual(
    parseCsv('\uFEFFticker;texto\r\nTEST3;"Linha 1\nLinha ""2"""'),
    [
      ["ticker", "texto"],
      ["TEST3", 'Linha 1\nLinha "2"'],
    ],
  );
  assert.equal(Number(localizedDecimal("12,5")), 12.5);
  assert.throws(() => parseCsv('a,b\n"sem fechamento'), /aspas/);
});
test("exportação CSV neutraliza fórmulas em textos", () => {
  const rows = parseCsv(
    csvDownload([
      [
        '=HYPERLINK("https://outside.test")',
        "+CMD",
        "@SOMA(A1)",
        "-texto",
        "-12.5",
      ],
    ]),
  );
  assert.ok(rows[0].slice(0, 4).every((value) => value.startsWith("'")));
  assert.equal(rows[0][4], "-12.5");
});
