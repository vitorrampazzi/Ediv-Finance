import { dividendColumns } from "../dividend-analysis.mjs";
import {
  ImportError,
  normalizeHeader,
  localizedDecimal,
} from "./spreadsheet.js";

const labels = dividendColumns.map(({ label }) => normalizeHeader(label));
const metrics = dividendColumns.slice(3);
const text = (value) => String(value ?? "").trim();

// Optional yearly history (docs/HOME-E-GRAFICOS-2026-11-10.md). Each cell holds
// "ANO: valor" pairs; the result lives next to dividendAnalysis as
// annualHistory: { netIncome: [{ year, value }] | null, payout: [...] | null }
// or null when both cells are empty. Neither column is a ranking column.
export const annualHistoryColumns = [
  { key: "netIncome", label: "Lucro líquido anual" },
  { key: "payout", label: "Payout anual" },
];
const historyHeaders = annualHistoryColumns.map(({ label }) =>
  normalizeHeader(label),
);
const historyFirstYear = 1990;
const historyMaxYears = 30;
const historyMaxCell = 1500;

// Reais in pt-BR (dot for thousands, comma for cents) or plain digits with an
// optional decimal part. A lone "." between three-digit groups is a thousands
// separator. Never a percentage.
function netIncomeValue(raw, where) {
  const value = raw.replace(/^R\$\s*/i, "").replace(/\s/g, "");
  let decimal;
  if (/^-?\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(value))
    decimal = value.replace(/\./g, "").replace(",", ".");
  else if (/^-?\d+(?:[.,]\d+)?$/.test(value)) decimal = value.replace(",", ".");
  else
    throw new ImportError(
      "Lucro líquido anual inválido " +
        where +
        ": use reais como 2.345.678.900,00 ou 2345678900.",
    );
  if (Math.abs(Number(decimal)) > 1e15)
    throw new ImportError("Lucro líquido anual fora do limite " + where + ".");
  return decimal;
}

// Percent with or without "%", kept as a fraction with six decimals.
function payoutValue(raw, where) {
  const value = raw.replace(/\s/g, "").replace(/%$/, "");
  if (!/^-?\d+(?:[.,]\d+)?$/.test(value))
    throw new ImportError(
      "Payout anual inválido " + where + ": use porcentagem como 45,2 ou 45,2%.",
    );
  const percent = Number(value.replace(",", "."));
  if (percent < -1000 || percent > 1000)
    throw new ImportError(
      "Payout anual deve ficar entre -1000% e 1000% " + where + ".",
    );
  const fraction = (percent / 100).toFixed(6);
  return fraction === "-0.000000" ? "0.000000" : fraction;
}

const historyValue = { netIncome: netIncomeValue, payout: payoutValue };

function parseAnnualSeries(cell, key, line) {
  const label = annualHistoryColumns.find((column) => column.key === key).label;
  const where = "na linha " + line;
  if (!cell) return null;
  if (cell.length > historyMaxCell)
    throw new ImportError(label + " muito longo " + where + ".");
  const pairs = cell
    .split(/;|\r?\n/)
    .map((pair) => pair.trim())
    .filter(Boolean);
  if (pairs.length > historyMaxYears)
    throw new ImportError(
      "Use até " + historyMaxYears + " anos em " + label + " " + where + ".",
    );
  const currentYear = new Date().getFullYear();
  const years = new Set();
  const items = pairs.map((pair) => {
    const match = /^(\d{4})\s*[:=]\s*(\S.*)$/.exec(pair);
    if (!match)
      throw new ImportError(
        label +
          " " +
          where +
          ": use pares ANO: valor separados por ponto e vírgula ou quebra de linha.",
      );
    const year = Number(match[1]);
    if (year < historyFirstYear || year > currentYear)
      throw new ImportError(
        label +
          " " +
          where +
          ": ano " +
          match[1] +
          " fora de " +
          historyFirstYear +
          " a " +
          currentYear +
          ".",
      );
    if (years.has(year))
      throw new ImportError(
        label + " " + where + ": ano " + year + " repetido.",
      );
    years.add(year);
    return { year, value: historyValue[key](match[2].trim(), where) };
  });
  return items.length ? items.sort((a, b) => a.year - b.year) : null;
}

export function parseAnnualHistory(cells, line) {
  const history = Object.fromEntries(
    annualHistoryColumns.map(({ key }) => [
      key,
      parseAnnualSeries(text(cells[key]), key, line),
    ]),
  );
  return Object.values(history).every((series) => series === null)
    ? null
    : history;
}

// Each series may be filled in only one of the two sheets; when both sheets
// bring the same series, they must match. Returns undefined on a conflict.
function mergeHistory(a, b) {
  if (!a || !b) return a ?? b ?? null;
  const merged = {};
  for (const { key } of annualHistoryColumns) {
    if (a[key] && b[key] && JSON.stringify(a[key]) !== JSON.stringify(b[key]))
      return undefined;
    merged[key] = a[key] ?? b[key] ?? null;
  }
  return merged;
}

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
    labels.some((label) => !headers.includes(label)) ||
    headers.some(
      (header) => !labels.includes(header) && !historyHeaders.includes(header),
    )
  )
    throw new ImportError(
      "Use exatamente as 21 colunas da análise de dividendos, sem campos desconhecidos. As únicas colunas extras aceitas são Lucro líquido anual e Payout anual, opcionais.",
    );
  if (rows.length < 2 || rows.length > 301)
    throw new ImportError("Inclua o cabeçalho e de 1 a 300 ativos.");
  const indexes = Object.fromEntries(
    dividendColumns.map(({ key }, index) => [
      key,
      headers.indexOf(labels[index]),
    ]),
  );
  const historyIndexes = Object.fromEntries(
    annualHistoryColumns.map(({ key }, index) => [
      key,
      headers.indexOf(historyHeaders[index]),
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
      const annualHistory = parseAnnualHistory(
        Object.fromEntries(
          annualHistoryColumns.map(({ key }) => [
            key,
            historyIndexes[key] < 0 ? "" : row[historyIndexes[key]],
          ]),
        ),
        index + 2,
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
        annualHistory,
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
    const annualHistory = other
      ? mergeHistory(entry.annualHistory, other.annualHistory)
      : undefined;
    if (
      !other ||
      entry.companyName !== other.companyName ||
      entry.sector !== other.sector ||
      JSON.stringify(entry.dividendAnalysis) !==
        JSON.stringify(other.dividendAnalysis) ||
      annualHistory === undefined
    )
      throw new ImportError(
        "Dados conflitantes entre as abas para " + entry.ticker,
      );
    entry.annualHistory = annualHistory;
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
  netIncomeHistory: ["lucro_liquido_anual"],
  payoutHistory: ["payout_anual"],
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
      // More cells than headers means a cell was split (for example a ";"
      // list without quotes in a ";" CSV): refuse it instead of shifting values
      // into other columns.
      if (row.length > headers.length)
        throw new ImportError(
          "Há valores sem cabeçalho na linha " +
            (i + 2) +
            ". Se uma célula tem vários valores separados por ponto e vírgula, coloque-a entre aspas.",
        );
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
      const annualHistory = parseAnnualHistory(
        { netIncome: get("netIncomeHistory"), payout: get("payoutHistory") },
        i + 2,
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
        annualHistory,
      };
    });
}
