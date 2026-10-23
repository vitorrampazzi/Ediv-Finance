import test from "node:test";
import assert from "node:assert/strict";
import { publicRanking } from "../server/public-ranking.js";
import { dividendColumns } from "../dividend-analysis.mjs";

test("publicação pública não expõe metadados, texto privado ou campos desconhecidos", () => {
  const privateFields = {
    authorName: "PRIVATE_AUTHOR",
    sourceFileName: "PRIVATE_FILE",
    professionalRegistration: "PRIVATE_DOCUMENT",
    thesis: "PRIVATE_THESIS",
    risks: "PRIVATE_RISK",
    dataSource: "PRIVATE_SOURCE",
    canManage: true,
    history: ["PRIVATE_HISTORY"],
    draft: "PRIVATE_DRAFT",
  };
  const result = publicRanking({
    id: "9007199254740993",
    title: "Ranking oficial",
    created_at: "2026-10-20",
    ...privateFields,
    entries_json: [
      {
        rank: 1,
        ticker: "REAL3",
        companyName: "Empresa real",
        sector: "Setor",
        ...privateFields,
        dividendAnalysis: {
          expectedPayout: "1.06",
          estimatedGrossDividendYield: "0.115",
          totalShares: "104995666.67",
          netDebtToEbitda: "-2.5",
          referencePrice: "0",
          unknown: "PRIVATE_UNKNOWN",
          authorName: "PRIVATE_AUTHOR",
        },
      },
    ],
  });
  assert.deepEqual(Object.keys(result), [
    "id",
    "title",
    "updatedAt",
    "totalEntries",
    "entries",
  ]);
  assert.deepEqual(Object.keys(result.entries[0]), [
    "rank",
    "ticker",
    "companyName",
    "sector",
    "dividendAnalysis",
  ]);
  assert.deepEqual(
    Object.keys(result.entries[0].dividendAnalysis),
    dividendColumns.slice(3).map(({ key }) => key),
  );
  assert.equal(JSON.stringify(result).includes("PRIVATE_"), false);
  assert.equal(result.id, "9007199254740993");
  for (const [key, value] of Object.entries({
    expectedPayout: "1.06",
    estimatedGrossDividendYield: "0.115",
    totalShares: "104995666.67",
    netDebtToEbitda: "-2.5",
    referencePrice: "0",
  }))
    assert.equal(result.entries[0].dividendAnalysis[key], value);
  assert.equal(result.entries[0].dividendAnalysis.updatedOn, null);
});

test("ordena por rank sem truncar nem modificar a publicação e aceita JSON do banco", () => {
  const entries = Array.from({ length: 90 }, (_, index) => ({
    rank: 90 - index,
    ticker: "REAL" + index,
    companyName: "Empresa" + index,
    sector: null,
    dividendAnalysis: { marketValue: "46038142480.980003" },
  }));
  const before = structuredClone(entries);
  const result = publicRanking({
    id: 1,
    title: "Oficial",
    created_at: null,
    entries_json: entries,
  });
  assert.equal(result.totalEntries, 90);
  assert.deepEqual(
    result.entries.map(({ rank }) => rank),
    Array.from({ length: 90 }, (_, i) => i + 1),
  );
  assert.equal(
    result.entries[0].dividendAnalysis.marketValue,
    "46038142480.980003",
  );
  assert.deepEqual(entries, before);
  assert.deepEqual(
    publicRanking({
      id: 1,
      title: "Oficial",
      created_at: null,
      entries_json: JSON.stringify(entries),
    }),
    result,
  );
});

test("sem publicação retorna vazio honesto, sem demonstração ou registros legados", () => {
  assert.deepEqual(publicRanking(undefined), {
    id: null,
    title: "Ranking de dividendos",
    updatedAt: null,
    totalEntries: 0,
    entries: [],
  });
});

test("métricas ausentes ou de tipo indevido viram null sem incluir objetos privados", () => {
  const result = publicRanking({
    id: 1,
    entries_json: [
      {
        rank: 1,
        ticker: "REAL3",
        companyName: "Real",
        dividendAnalysis: {
          marketValue: { secret: "PRIVATE" },
          expectedPayout: 1.06,
        },
      },
    ],
  });
  assert.equal(result.entries[0].sector, null);
  assert.ok(
    Object.values(result.entries[0].dividendAnalysis).every(
      (value) => value === null,
    ),
  );
});
