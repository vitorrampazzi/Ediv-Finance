import { dividendColumns } from "../dividend-analysis.mjs";
import {
  ImportError,
  normalizeHeader,
  localizedDecimal,
} from "./spreadsheet.js";

const labels = dividendColumns.map(({ label }) => normalizeHeader(label));
const metrics = dividendColumns.slice(3);
const text = (value) => String(value ?? "").trim();

function isDividendRows(rows) {
  const headers = (rows[0] || []).map(normalizeHeader);
  return (
    headers.some((header) => labels.slice(3).includes(header)) ||
    ["empresa", "codigo", "atuacao"].every((header) => headers.includes(header))
  );
}

export function parseDividendRows(rows, sourceFileName = null) {
  if (!isDividendRows(rows)) return null;
  const headers = rows[0].map(normalizeHeader);
  if (new Set(headers).size !== headers.length)
    throw new ImportError("Há cabeçalhos repetidos na análise de dividendos.");
  if (
    headers.length !== labels.length ||
    headers.some((header) => !labels.includes(header))
  )
    throw new ImportError(
      "Use exatamente as 21 colunas da análise de dividendos, sem campos desconhecidos.",
    );
  if (rows.length < 2 || rows.length > 301)
    throw new ImportError("Inclua o cabeçalho e de 1 a 300 ativos.");
  const indexes = Object.fromEntries(
    dividendColumns.map(({ key }, index) => [
      key,
      headers.indexOf(labels[index]),
    ]),
  );
  const seen = new Set();
  return rows
    .slice(1)
    .filter((row) => row.some((cell) => text(cell)))
    .map((row, index) => {
      if (row.length > headers.length)
        throw new ImportError(
          "Há valores sem cabeçalho na linha " + (index + 2),
        );
      const get = (key) => text(row[indexes[key]]);
      const ticker = get("ticker").toUpperCase();
      const companyName = get("companyName");
      const sector = get("sector");
      if (!/^[A-Z0-9][A-Z0-9._-]{0,15}$/.test(ticker) || seen.has(ticker))
        throw new ImportError(
          "Ticker inválido ou repetido na linha " + (index + 2),
        );
      seen.add(ticker);
      if (!companyName || companyName.length > 160 || sector.length > 120)
        throw new ImportError(
          "Confira empresa e atuação na linha " + (index + 2),
        );
      const dividendAnalysis = Object.fromEntries(
        metrics.map(({ key, format }) => {
          const value = get(key);
          if (!value) return [key, null];
          if (format === "text") {
            if (value.length > 500)
              throw new ImportError("Texto muito longo: " + key);
          } else if (format === "date") {
            const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
              ? new Date(value + "T00:00:00Z")
              : null;
            if (
              !date ||
              !Number.isFinite(date.getTime()) ||
              date.toISOString().slice(0, 10) !== value
            )
              throw new ImportError("Use data ISO válida (AAAA-MM-DD): " + key);
          } else if (
            value.length > 100 ||
            !/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(value) ||
            !Number.isFinite(Number(value))
          ) {
            throw new ImportError(
              "Use número bruto decimal, com percentuais em fração e sem símbolos: " +
                key,
            );
          }
          return [key, value];
        }),
      );
      return {
        rank: index + 1,
        ticker,
        companyName,
        sector: sector || null,
        expectedReturnPercent: null,
        targetPrice: null,
        horizonMonths: null,
        thesis: null,
        risks: null,
        dividendAnalysis,
        referencePeriod: dividendAnalysis.updatedOn,
        dataSource: sourceFileName ? text(sourceFileName).slice(0, 500) : null,
      };
    });
}

export function parseDividendWorkbook(sheets, sourceFileName = null) {
  if (!sheets.some(({ data }) => isDividendRows(data))) return null;
  const names = sheets.map(({ sheet }) => normalizeHeader(sheet));
  if (
    sheets.length !== 2 ||
    new Set(names).size !== 2 ||
    !names.includes("ranking") ||
    !names.includes("informacoes_completas")
  )
    throw new ImportError(
      "A análise exige as duas abas Ranking e Informações Completas, sem abas extras.",
    );
  const ranking = parseDividendRows(
    sheets[names.indexOf("ranking")].data,
    sourceFileName,
  );
  const complete = parseDividendRows(
    sheets[names.indexOf("informacoes_completas")].data,
    sourceFileName,
  );
  if (!ranking?.length || !complete || ranking.length !== complete.length)
    throw new ImportError(
      "As duas abas devem conter os mesmos ativos e as 21 colunas.",
    );
  const byTicker = new Map(complete.map((entry) => [entry.ticker, entry]));
  for (const entry of ranking) {
    const other = byTicker.get(entry.ticker);
    if (
      !other ||
      entry.companyName !== other.companyName ||
      entry.sector !== other.sector ||
      JSON.stringify(entry.dividendAnalysis) !==
        JSON.stringify(other.dividendAnalysis)
    )
      throw new ImportError(
        "Dados conflitantes entre as abas para " + entry.ticker,
      );
  }
  return ranking;
}

export function parseRankingUpload(upload, sourceFileName = null) {
  if (Array.isArray(upload))
    return parseDividendRows(upload, sourceFileName) ?? parseRows(upload);
  return (
    parseDividendWorkbook(upload.sheets, sourceFileName) ??
    parseRows(upload.sheets[0]?.data || [])
  );
}

const aliases = {
  ticker: ["ticker", "symbol", "ativo", "codigo"],
  companyName: ["empresa", "company", "company_name", "nome"],
  expectedReturnPercent: [
    "potencial_percentual",
    "potencial",
    "upside_percent",
    "expected_return_percent",
  ],
  targetPrice: ["preco_alvo", "target_price"],
  horizonMonths: ["horizonte_meses", "prazo_meses", "horizonte"],
  thesis: ["tese", "justificativa", "observacao"],
  risks: ["riscos", "risco"],
  sector: ["setor", "sector"],
  balanceSheet: ["balanco_patrimonial", "balanco", "balance_sheet"],
  incomeStatement: [
    "dre",
    "demonstracao_do_resultado_do_exercicio",
    "dre_demonstracao_do_resultado_do_exercicio",
    "income_statement",
  ],
  cashFlow: ["fluxo_de_caixa", "fluxo_caixa", "cash_flow"],
  companyInformation: [
    "informacoes_da_empresa",
    "informacoes_cadastrais_da_empresa",
    "informacoes_cadastraveis_da_empresa",
    "dados_cadastrais",
    "company_information",
  ],
  netDebt: ["divida_liquida", "informacoes_de_divida_liquida", "net_debt"],
  statistics: [
    "estatisticas",
    "estatistica",
    "informacoes_de_estatistica",
    "statistics",
  ],
  referencePeriod: [
    "periodo_referencia",
    "periodo_de_referencia",
    "reference_period",
  ],
  dataSource: ["fonte_dados", "fonte_dos_dados", "fonte", "data_source"],
};
const fundamentalKeys = [
  "balanceSheet",
  "incomeStatement",
  "cashFlow",
  "companyInformation",
  "netDebt",
  "statistics",
];
function parseRows(rows) {
  const labels = rows.flat().map(normalizeHeader);
  if (
    labels.includes("acoes_para_pesquisa") &&
    labels.includes("modulos_indispensaveis")
  )
    throw new ImportError(
      "Este arquivo lista ações e módulos para pesquisa, mas não contém os dados de uma publicação. Use o modelo de ranking e preencha uma ação por linha.",
    );
  if (rows.length < 2 || rows.length > 301)
    throw new ImportError("Inclua o cabeçalho e de 1 a 300 ativos.");
  const headers = rows[0].map(normalizeHeader);
  for (const names of Object.values(aliases)) {
    if (headers.filter((header) => names.includes(header)).length > 1)
      throw new ImportError(
        "Há colunas repetidas para o mesmo campo: " + names[0],
      );
  }
  const indexes = Object.fromEntries(
    Object.entries(aliases).map(([key, names]) => [
      key,
      headers.findIndex((h) => names.includes(h)),
    ]),
  );
  if (
    ["ticker", "companyName", "expectedReturnPercent"].some(
      (key) => indexes[key] < 0,
    )
  )
    throw new ImportError(
      "Colunas obrigatórias: ticker, empresa, potencial_percentual.",
    );
  const seen = new Set();
  return rows
    .slice(1)
    .filter((row) => row.some((cell) => String(cell).trim()))
    .map((row, i) => {
      const get = (key) => String(row[indexes[key]] ?? "").trim();
      const ticker = get("ticker").toUpperCase();
      const companyName = get("companyName");
      if (!/^[A-Z0-9][A-Z0-9._-]{0,15}$/.test(ticker) || seen.has(ticker))
        throw new ImportError(
          "Ticker inválido ou repetido na linha " + (i + 2),
        );
      seen.add(ticker);
      if (!companyName || companyName.length > 160)
        throw new ImportError("Confira a empresa na linha " + (i + 2));
      const expectedReturnPercent = localizedDecimal(
        get("expectedReturnPercent"),
      );
      if (
        Number(expectedReturnPercent) < -100 ||
        Number(expectedReturnPercent) > 1000
      )
        throw new ImportError("Potencial deve ficar entre -100% e 1000%.");
      const targetPrice = get("targetPrice")
        ? localizedDecimal(get("targetPrice"))
        : null;
      if (
        targetPrice !== null &&
        (Number(targetPrice) <= 0 || Number(targetPrice) > 1e9)
      )
        throw new ImportError("Preço-alvo inválido.");
      const horizonMonths = get("horizonMonths")
        ? Number(localizedDecimal(get("horizonMonths")))
        : null;
      if (
        horizonMonths !== null &&
        (!Number.isInteger(horizonMonths) ||
          horizonMonths < 1 ||
          horizonMonths > 120)
      )
        throw new ImportError("Horizonte deve ser de 1 a 120 meses.");
      const thesis = get("thesis");
      const risks = get("risks");
      const sector = get("sector");
      if (thesis.length > 2000 || risks.length > 2000 || sector.length > 120)
        throw new ImportError("Texto muito longo na linha " + (i + 2));
      const fundamentals = Object.fromEntries(
        fundamentalKeys.map((key) => {
          const value = get(key);
          if (value.length > 5000)
            throw new ImportError(
              "Cada módulo aceita até 5.000 caracteres. Confira a linha " +
                (i + 2),
            );
          return [key, value || null];
        }),
      );
      const referencePeriod = get("referencePeriod");
      const dataSource = get("dataSource");
      if (referencePeriod.length > 120 || dataSource.length > 500)
        throw new ImportError(
          "Período ou fonte muito longos na linha " + (i + 2),
        );
      return {
        rank: i + 1,
        ticker,
        companyName,
        expectedReturnPercent,
        targetPrice,
        horizonMonths,
        thesis: thesis || null,
        risks: risks || null,
        sector: sector || null,
        ...fundamentals,
        referencePeriod: referencePeriod || null,
        dataSource: dataSource || null,
      };
    });
}
