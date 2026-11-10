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

// Optional yearly history (docs/HOME-E-GRAFICOS-2026-11-10.md).
const historyRows = (netIncome, payout, extraHeaders = []) => [
  [...headers, "Lucro líquido anual", "Payout anual", ...extraHeaders],
  [...row(), netIncome, payout],
];

test("colunas opcionais de lucro e payout anuais viram annualHistory ordenado", () => {
  const [entry] = parseDividendRows(
    historyRows(
      "2024: 2.345.678.900,00; 2022 = -1500000\n2023: 2345678900",
      "2023: 45,2%;2024:-12\n2022 = 0",
    ),
  );
  assert.deepEqual(entry.annualHistory, {
    netIncome: [
      { year: 2022, value: "-1500000" },
      { year: 2023, value: "2345678900" },
      { year: 2024, value: "2345678900.00" },
    ],
    payout: [
      { year: 2022, value: "0.000000" },
      { year: 2023, value: "0.452000" },
      { year: 2024, value: "-0.120000" },
    ],
  });
  assert.equal(entry.dividendAnalysis.expectedPayout, "1.75");
  assert.ok(
    Object.keys(entry).indexOf("annualHistory") ===
      Object.keys(entry).indexOf("dividendAnalysis") + 1,
  );
});

test("colunas opcionais aceitam qualquer posição, nomes normalizados e uma só delas", () => {
  const values = row();
  const [entry] = parseDividendRows([
    ["payout_anual", ...headers.slice(0, 5), "LUCRO LIQUIDO ANUAL", ...headers.slice(5)],
    ["2024: 1000", ...values.slice(0, 5), "2024: 1,5", ...values.slice(5)],
  ]);
  assert.deepEqual(entry.annualHistory.payout, [{ year: 2024, value: "10.000000" }]);
  assert.deepEqual(entry.annualHistory.netIncome, [{ year: 2024, value: "1.5" }]);
  const [onlyPayout] = parseDividendRows([
    [...headers, "Payout anual"],
    [...row(), "2025: 33,3"],
  ]);
  assert.deepEqual(onlyPayout.annualHistory, {
    netIncome: null,
    payout: [{ year: 2025, value: "0.333000" }],
  });
});

test("sem as colunas opcionais ou com células vazias, annualHistory é null", () => {
  assert.equal(parseDividendRows([headers, row()])[0].annualHistory, null);
  assert.equal(parseDividendRows(historyRows("", " "))[0].annualHistory, null);
  const [partial] = parseDividendRows(historyRows("2024: 10", ""));
  assert.deepEqual(partial.annualHistory, {
    netIncome: [{ year: 2024, value: "10" }],
    payout: null,
  });
});

test("erros do histórico anual indicam a linha e não reinterpretam valores", () => {
  const thisYear = new Date().getFullYear();
  const many = Array.from({ length: 31 }, (_, i) => `${1990 + i}: 1`).join(";");
  const thirty = Array.from({ length: 30 }, (_, i) => `${1990 + i}: 1`).join(";");
  assert.equal(
    parseDividendRows(historyRows(thirty, ""))[0].annualHistory.netIncome.length,
    30,
  );
  for (const [netIncome, payout, message] of [
    ["2024: 1; 2024: 2", "", /ano 2024 repetido/],
    ["1989: 1", "", /fora de 1990/],
    ["", `${thisYear + 1}: 10`, /fora de 1990/],
    [many, "", /até 30 anos/],
    ["2024 1", "", /pares ANO: valor/],
    ["24: 1", "", /pares ANO: valor/],
    ["2024:", "", /pares ANO: valor/],
    ["2024: 1e3", "", /Lucro líquido anual inválido/],
    ["2024: 1,234.5", "", /Lucro líquido anual inválido/],
    ["2024: =1+2", "", /Lucro líquido anual inválido/],
    ["2024: 2000000000000000", "", /fora do limite/],
    ["", "2024: 1000,01%", /entre -1000% e 1000%/],
    ["", "2024: -1001", /entre -1000% e 1000%/],
    ["", "2024: 0.45x", /Payout anual inválido/],
    ["", "2024: 45%%", /Payout anual inválido/],
  ])
    assert.throws(
      () => parseDividendRows(historyRows(netIncome, payout)),
      (error) =>
        error instanceof ImportError &&
        /linha 2/.test(error.message) &&
        message.test(error.message),
    );
});

test("coluna desconhecida ou opcional repetida continua rejeitada", () => {
  assert.throws(
    () => parseDividendRows(historyRows("", "", ["Lucro trimestral"])),
    /Lucro líquido anual e Payout anual, opcionais/,
  );
  assert.throws(
    () =>
      parseDividendRows([
        [...headers, "Payout anual", "payout_anual"],
        [...row(), "", ""],
      ]),
    /repetidos/,
  );
});

test("abas completam o histórico uma da outra e conflitos de série são rejeitados", () => {
  const withHistory = (netIncome, payout) => [
    { sheet: "Ranking", data: historyRows(netIncome, payout) },
    { sheet: "Informações Completas", data: [headers, row()] },
  ];
  assert.deepEqual(
    parseDividendWorkbook(withHistory("2024: 5", ""))[0].annualHistory,
    { netIncome: [{ year: 2024, value: "5" }], payout: null },
  );
  const split = parseDividendWorkbook([
    { sheet: "Ranking", data: historyRows("2024: 5", "") },
    { sheet: "Informações Completas", data: historyRows("", "2024: 50") },
  ]);
  assert.deepEqual(split[0].annualHistory, {
    netIncome: [{ year: 2024, value: "5" }],
    payout: [{ year: 2024, value: "0.500000" }],
  });
  assert.throws(
    () =>
      parseDividendWorkbook([
        { sheet: "Ranking", data: historyRows("2024: 5", "") },
        { sheet: "Informações Completas", data: historyRows("2024: 6", "") },
      ]),
    /conflitantes/,
  );
});

test("CSV do modelo legado com as duas colunas e células de várias linhas", async () => {
  const csv =
    "ticker;empresa;potencial_percentual;lucro_liquido_anual;payout_anual\r\n" +
    'OLD3;Empresa anterior;10;"2023: 1.000,50\n2024: -20";"2024: 45,2%"\r\n' +
    "NEW3;Outra empresa;5;;\r\n";
  const data = await readUpload({ body: Buffer.from(csv), is: () => false });
  const [first, second] = parseRankingUpload(data);
  assert.deepEqual(first.annualHistory, {
    netIncome: [
      { year: 2023, value: "1000.50" },
      { year: 2024, value: "-20" },
    ],
    payout: [{ year: 2024, value: "0.452000" }],
  });
  assert.equal(second.annualHistory, null);
});

test("CSV legado recusa célula partida em vez de mudar valores de coluna", async () => {
  // "2022: 50; 2023: 60" without quotes splits into two cells in a ";" CSV.
  const csv =
    "ticker;empresa;potencial_percentual;lucro_liquido_anual;payout_anual\r\n" +
    "OLD3;Empresa anterior;10;2022: 50; 2023: 60;\r\n";
  const data = await readUpload({ body: Buffer.from(csv), is: () => false });
  assert.throws(
    () => parseRankingUpload(data),
    (error) =>
      error instanceof ImportError &&
      /valores sem cabeçalho na linha 2/.test(error.message) &&
      /entre aspas/.test(error.message),
  );
});

test("histórico de mudanças detecta annualHistory sem acusar publicações antigas", () => {
  const [before] = parseDividendRows(historyRows("2024: 5", ""));
  const after = structuredClone(before);
  assert.equal(compareResearch([before], [after]).changed.length, 0);
  after.annualHistory.netIncome[0].value = "6";
  assert.deepEqual(compareResearch([before], [after]).changed[0].fields, [
    "annualHistory",
  ]);
  const old = structuredClone(before);
  delete old.annualHistory;
  const [empty] = parseDividendRows([headers, row()]);
  assert.equal(compareResearch([old], [empty]).changed.length, 0);
  after.annualHistory = { payout: null, netIncome: before.annualHistory.netIncome };
  assert.equal(compareResearch([before], [after]).changed.length, 0);
});
