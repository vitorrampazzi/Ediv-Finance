import test from "node:test";
import assert from "node:assert/strict";
import { publicRanking } from "../server/public-ranking.js";
const metricKeys = [
  "estimatedGrossDividendYield",
  "projectedPE",
  "safetyMargin",
];

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
          safetyMargin: "0.41",
          projectedPE: "8.6999999999999993",
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
    "dividendAnalysis",
  ]);
  assert.deepEqual(Object.keys(result.entries[0].dividendAnalysis), metricKeys);
  assert.equal(JSON.stringify(result).includes("PRIVATE_"), false);
  assert.equal(result.id, "9007199254740993");
  for (const [key, value] of Object.entries({
    safetyMargin: "0.41",
    projectedPE: "8.6999999999999993",
    estimatedGrossDividendYield: "0.115",
  }))
    assert.equal(result.entries[0].dividendAnalysis[key], value);
  assert.equal(result.entries[0].dividendAnalysis.updatedOn, undefined);
});

test("limita a três por rank sem modificar a publicação e aceita JSON do banco", () => {
  const entries = Array.from({ length: 90 }, (_, index) => ({
    rank: 90 - index,
    ticker: "REAL" + index,
    companyName: "Empresa" + index,
    sector: null,
    dividendAnalysis: {
      projectedPE: "8.6999999999999993",
      marketValue: "PRIVATE_METRIC",
    },
  }));
  const before = structuredClone(entries);
  const result = publicRanking({
    id: 1,
    title: "Oficial",
    created_at: null,
    entries_json: entries,
  });
  assert.equal(result.totalEntries, 3);
  assert.deepEqual(
    result.entries.map(({ rank }) => rank),
    [1, 2, 3],
  );
  assert.equal(
    result.entries[0].dividendAnalysis.projectedPE,
    "8.6999999999999993",
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
          projectedPE: { secret: "PRIVATE" },
          safetyMargin: 1.06,
        },
      },
    ],
  });
  assert.equal(result.entries[0].sector, undefined);
  assert.ok(
    Object.values(result.entries[0].dividendAnalysis).every(
      (value) => value === null,
    ),
  );
});
