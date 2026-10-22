import test from "node:test";
import assert from "node:assert/strict";
import { zipSync, strToU8 } from "fflate";
import { dividendColumns, formatDividendValue } from "../dividend-analysis.mjs";
import {
  parseDividendRows,
  parseDividendWorkbook,
  parseRankingUpload,
} from "../server/dividend-import.js";
import { readUpload, ImportError, csvDownload } from "../server/spreadsheet.js";
import { compareResearch } from "../server/research-diff.js";

const headers = dividendColumns.map(({ label }) => label);
function row(overrides = {}) {
  const values = {
    companyName: "Empresa real de teste",
    ticker: "TEST3",
    sector: "Setor de teste",
    totalShares: "9007199254740993",
    marketValue: "1000000000.123456789",
    estimatedNetIncome: "-2500000.75",
    projectedPE: "-10.25",
    averagePE10Years: "0",
    peDeviation: "-0.115",
    earningsCagr5Years: "0.123456789123456789",
    netDebtToEbitda: "-2.5",
    estimatedEps: "0",
    expectedPayout: "1.75",
    projectedGrossDividendPerShare: "2.50",
    estimatedGrossDividendYield: "0.115",
    referencePrice: "22.15",
    ceilingPrice: "36.71",
    safetyMargin: "-0.5",
    announcementFrequency: "Trimestral",
    announcementMonths: "Março, junho, setembro, dezembro",
    updatedOn: "2026-10-20",
    ...overrides,
  };
  return dividendColumns.map(({ key }) => values[key]);
}
const sheets = (ranking, complete = ranking) => [
  { sheet: "Ranking", data: [headers, ...ranking] },
  { sheet: "Informações Completas", data: [headers, ...complete] },
];

test("novo formato mantém precisão, frações, negativos, zero e ausência sem inventar potencial", () => {
  const [entry] = parseDividendRows(
    [headers, row({ estimatedEps: null, sector: "" })],
    "origem.xlsx",
  );
  assert.equal(entry.dividendAnalysis.totalShares, "9007199254740993");
  assert.equal(entry.dividendAnalysis.marketValue, "1000000000.123456789");
  assert.equal(entry.dividendAnalysis.estimatedNetIncome, "-2500000.75");
  assert.equal(entry.dividendAnalysis.averagePE10Years, "0");
  assert.equal(entry.dividendAnalysis.estimatedEps, null);
  assert.equal(entry.dividendAnalysis.expectedPayout, "1.75");
  assert.equal(entry.dividendAnalysis.estimatedGrossDividendYield, "0.115");
  assert.equal(entry.sector, null);
  assert.equal(entry.referencePeriod, "2026-10-20");
  assert.equal(entry.dataSource, "origem.xlsx");
  for (const key of [
    "expectedReturnPercent",
    "targetPrice",
    "horizonMonths",
    "thesis",
    "risks",
  ])
    assert.equal(entry[key], null);
  assert.equal(formatDividendValue("0.115", "percent"), "11,50%");
  assert.equal(formatDividendValue("1.75", "percent"), "175,00%");
  assert.equal(formatDividendValue("-0.5", "percentInteger"), "-50%");
  assert.equal(formatDividendValue("0", "number"), "0");
  assert.equal(formatDividendValue(null, "number"), "Não informado");
});

test("join usa ticker e mantém ordem Ranking mesmo se detalhe estiver reordenado", () => {
  const first = row(),
    second = row({ ticker: "NEXT4", companyName: "Segunda empresa" });
  const result = parseDividendWorkbook(
    sheets([first, second], [second, first]),
  );
  assert.deepEqual(
    result.map(({ ticker, rank }) => [ticker, rank]),
    [
      ["TEST3", 1],
      ["NEXT4", 2],
    ],
  );
  assert.equal(result[0].dataSource, null);
});

test("duas abas rejeitam conflitos, ticker faltante/duplicado, aba ausente e extra", () => {
  for (const input of [
    sheets([row()], [row({ referencePrice: "23" })]),
    sheets([row()], [row({ ticker: "OTHER3" })]),
    sheets([row(), row()]),
    sheets([row()]).slice(0, 1),
    [...sheets([row()]), { sheet: "Extra", data: [] }],
    [sheets([row()])[0], sheets([row()])[0]],
  ])
    assert.throws(() => parseDividendWorkbook(input), ImportError);
});

test("cabeçalhos repetidos, desconhecidos, ausentes e linhas com campo extra são erros", () => {
  const duplicate = [...headers];
  duplicate[4] = headers[3];
  const unknown = [...headers];
  unknown[4] = "Outro indicador";
  for (const data of [
    [duplicate, row()],
    [unknown, row()],
    [headers.slice(0, -1), row()],
    [headers, [...row(), "valor ignorado"]],
  ])
    assert.throws(() => parseDividendRows(data), ImportError);
});

test("valores inválidos e percentuais ambíguos não são reinterpretados", () => {
  for (const overrides of [
    { expectedPayout: "115%" },
    { referencePrice: "R$ 23" },
    { estimatedEps: "1,5" },
    { referencePrice: "NaN" },
    { referencePrice: "1e9999" },
    { referencePrice: "=1+2" },
    { projectedPE: "N/A" },
    { updatedOn: "2026-02-30" },
    { updatedOn: "20/10/2026" },
    { ticker: "" },
    { companyName: "" },
  ])
    assert.throws(
      () => parseDividendRows([headers, row(overrides)]),
      ImportError,
    );
});

test("quantidades fracionárias da fonte e artefatos decimais permanecem brutos", () => {
  const values = [
    ["BRBI11", "104995666.67"],
    ["SAPR11", "302241103.80000001"],
  ];
  const entries = parseDividendWorkbook(
    sheets(
      values.map(([ticker, totalShares]) =>
        row({
          ticker,
          totalShares,
          marketValue: "46038142480.980003",
          projectedPE: "8.6999999999999993",
        }),
      ),
    ),
  );
  assert.deepEqual(
    entries.map((entry) => [entry.ticker, entry.dividendAnalysis.totalShares]),
    values,
  );
  for (const entry of entries) {
    assert.equal(entry.dividendAnalysis.marketValue, "46038142480.980003");
    assert.equal(entry.dividendAnalysis.projectedPE, "8.6999999999999993");
  }
});

test("CSV das21 colunas é recuperável com frações explícitas; legado continua igual", async () => {
  const csvRequest = (csv) => ({ body: Buffer.from(csv), is: () => false });
  const data = await readUpload(
    csvRequest(csvDownload([headers, row({ peDeviation: "-0.115" })])),
  );
  assert.equal(
    parseRankingUpload(data)[0].dividendAnalysis.peDeviation,
    "-0.115",
  );
  const legacy = await readUpload(
    csvRequest(
      "ticker;empresa;potencial_percentual;preco_alvo;horizonte_meses\nOLD3;Empresa anterior;-12,5%;R$ 25,10;12",
    ),
  );
  const entry = parseRankingUpload(legacy)[0];
  assert.equal(entry.expectedReturnPercent, "-12.5");
  assert.equal(entry.targetPrice, "25.10");
  assert.equal(entry.horizonMonths, 12);
  assert.equal(entry.thesis, null);
  assert.equal(entry.dividendAnalysis, undefined);
  assert.equal(parseDividendRows(legacy), null);
  assert.equal(
    parseDividendWorkbook([{ sheet: "Primeira", data: legacy }]),
    null,
  );
  assert.equal(
    parseRankingUpload({ sheets: [{ sheet: "Primeira", data: legacy }] })[0]
      .ticker,
    "OLD3",
  );
  assert.throws(
    () =>
      parseRankingUpload([
        ["ticker", "empresa"],
        ["OLD3", "Nome"],
      ]),
    ImportError,
  );
});

test("histórico detecta mudança dentro da análise sem diferenças por ordem das chaves", () => {
  const [before] = parseDividendRows([headers, row()]);
  const after = structuredClone(before);
  after.dividendAnalysis.expectedPayout = "1.8";
  assert.deepEqual(compareResearch([before], [after]).changed[0].fields, [
    "dividendAnalysis",
  ]);
  after.dividendAnalysis = Object.fromEntries(
    Object.entries(before.dividendAnalysis).reverse(),
  );
  assert.equal(compareResearch([before], [after]).changed.length, 0);
  delete after.dividendAnalysis;
  assert.deepEqual(compareResearch([before], [after]).changed[0].fields, [
    "dividendAnalysis",
  ]);
});

function xlsx(tabs) {
  const xml = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  const files = {
    "[Content_Types].xml":
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>',
    "xl/workbook.xml": `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${tabs.map(({ sheet }, i) => `<sheet name="${xml(sheet)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>`,
    "xl/_rels/workbook.xml.rels": `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${tabs.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}</Relationships>`,
  };
  tabs.forEach(({ data }, i) => {
    const cell = (value, column, rowIndex) => {
      const ref = `${String.fromCharCode(65 + column)}${rowIndex + 1}`;
      const numeric =
        rowIndex > 0 &&
        !["text", "date"].includes(dividendColumns[column].format);
      return numeric
        ? `<c r="${ref}"><v>${xml(value)}</v></c>`
        : `<c r="${ref}" t="inlineStr"><is><t>${xml(value)}</t></is></c>`;
    };
    files[`xl/worksheets/sheet${i + 1}.xml`] =
      `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${data.map((values, r) => `<row r="${r + 1}">${values.map((value, c) => cell(value, c, r)).join("")}</row>`).join("")}</sheetData></worksheet>`;
  });
  return Buffer.from(
    zipSync(
      Object.fromEntries(
        Object.entries(files).map(([name, value]) => [name, strToU8(value)]),
      ),
    ),
  );
}

test("leitura XLSX conserva ambas as abas e mantém leitura simples dos outros importadores", async () => {
  const request = { body: xlsx(sheets([row()])), is: () => true };
  const upload = await readUpload(request, { allSheets: true });
  assert.deepEqual(
    upload.sheets.map(({ sheet }) => sheet),
    ["Ranking", "Informações Completas"],
  );
  assert.equal(
    parseRankingUpload(upload)[0].dividendAnalysis.expectedPayout,
    "1.75",
  );
  assert.equal(
    parseRankingUpload(upload)[0].dividendAnalysis.totalShares,
    "9007199254740993",
  );
  assert.equal(
    parseRankingUpload(upload)[0].dividendAnalysis.marketValue,
    "1000000000.123456789",
  );
  assert.deepEqual(await readUpload(request), [headers, row()]);
  const conflict = await readUpload(
    {
      body: xlsx(sheets([row()], [row({ expectedPayout: "2" })])),
      is: () => true,
    },
    { allSheets: true },
  );
  assert.throws(() => parseRankingUpload(conflict), /conflitantes/);
});

test("limites de upload e descompactação continuam ativos", async () => {
  await assert.rejects(
    readUpload({ body: Buffer.alloc(1048577), is: () => false }),
    /1 MB/,
  );
  const oversized = Buffer.from(
    zipSync({ "huge.xml": new Uint8Array(5000001) }),
  );
  await assert.rejects(
    readUpload({ body: oversized, is: () => true }, { allSheets: true }),
    /descompactada/,
  );
});
