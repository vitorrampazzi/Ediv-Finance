import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { pool } from "./database.js";
import { requireAuthenticatedUser } from "./auth.js";
import { MysqlLimitStore } from "./limit-store.js";
import {
  hasPermission,
  lockActiveUser,
  lockAccessControl,
} from "./permissions.js";
import { compareResearch, readEntries } from "./research-diff.js";
import {
  fileBody,
  readUpload,
  normalizeHeader,
  localizedDecimal,
  ImportError,
} from "./spreadsheet.js";

const router = Router();
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  store: new MysqlLimitStore("ranking-upload"),
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Muitas importações. Aguarde alguns minutos." },
});
export const canManageRankings = (user) =>
  hasPermission(user, "rankings:write");
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
function publication(row) {
  return {
    id: String(row.id),
    title: row.title,
    authorName: row.author_name,
    professionalCategory: row.professional_category,
    professionalRegistration: row.professional_registration,
    sourceFileName: row.source_file_name,
    updatedAt: row.created_at,
    entries: (typeof row.entries_json === "string"
      ? JSON.parse(row.entries_json)
      : row.entries_json
    ).sort((a, b) => a.rank - b.rank),
  };
}
router.get("/compare", requireAuthenticatedUser, async (req, res) => {
  const { from, to } = req.query;
  if (
    typeof from !== "string" ||
    typeof to !== "string" ||
    !/^\d{1,20}$/.test(String(from)) ||
    !/^\d{1,20}$/.test(String(to)) ||
    BigInt(from) >= BigInt(to)
  )
    return res
      .status(400)
      .json({ error: "Selecione uma versão anterior e uma mais recente." });
  const [rows] = await pool.execute(
    "SELECT * FROM ranking_publications WHERE id IN (?,?)",
    [from, to],
  );
  const before = rows.find((row) => String(row.id) === from);
  const after = rows.find((row) => String(row.id) === to);
  if (!before || !after)
    return res.status(404).json({ error: "Publicação não encontrada." });
  res.json({
    from: publication(before),
    to: publication(after),
    ...compareResearch(
      readEntries(before.entries_json),
      readEntries(after.entries_json),
    ),
  });
});
router.get("/", requireAuthenticatedUser, async (req, res) => {
  const user = req.authenticatedUser;
  const id = req.query.publication;
  if (id && (typeof id !== "string" || !/^\d{1,20}$/.test(id)))
    return res.status(400).json({ error: "Publicação inválida." });
  const [rows] = await pool.execute(
    id
      ? "SELECT * FROM ranking_publications WHERE id = ?"
      : "SELECT * FROM ranking_publications ORDER BY id DESC LIMIT 1",
    id ? [id] : [],
  );
  const [history] = await pool.execute(
    "SELECT id, title, author_name, created_at FROM ranking_publications ORDER BY id DESC LIMIT 50",
  );
  let data = rows[0]
    ? publication(rows[0])
    : {
        id: null,
        title: "Ranking de cenários",
        authorName: null,
        professionalCategory: null,
        professionalRegistration: null,
        updatedAt: null,
        sourceFileName: null,
        entries: [],
      };
  if (!rows[0] && id)
    return res.status(404).json({ error: "Publicação não encontrada." });
  if (!rows[0] && !id) {
    const [legacy] = await pool.execute(
      "SELECT * FROM income_ranking_entries ORDER BY rank_position",
    );
    data = {
      ...data,
      updatedAt: legacy[0]?.created_at || null,
      sourceFileName: legacy[0]?.source_file_name || null,
      entries: legacy.map((row) => ({
        rank: row.rank_position,
        ticker: row.ticker,
        companyName: row.company_name,
        expectedReturnPercent: String(row.expected_return_percent),
        targetPrice: row.target_price,
        horizonMonths: row.horizon_months,
        thesis: row.thesis,
        risks: null,
        sector: null,
      })),
    };
  }
  return res.json({
    ...data,
    access: "full",
    totalEntries: data.entries.length,
    canManage: canManageRankings(user),
    history: history.map((row) => ({
      id: String(row.id),
      title: row.title,
      authorName: row.author_name,
      createdAt: row.created_at,
    })),
  });
});
async function manage(req, res, next) {
  if (!canManageRankings(req.authenticatedUser))
    return res
      .status(403)
      .json({ error: "Sua conta não pode publicar análises." });
  return next();
}
router.post(
  ["/preview", "/"],
  requireAuthenticatedUser,
  manage,
  limiter,
  fileBody,
  async (req, res, next) => {
    try {
      const entries = parseRows(await readUpload(req));
      if (!entries.length) throw new ImportError("A planilha não tem ativos.");
      if (req.path === "/preview")
        return res.json({ entries, count: entries.length });
      let metadata;
      try {
        metadata = JSON.parse(
          decodeURIComponent(req.get("x-publication-meta") || "%7B%7D"),
        );
      } catch {
        throw new ImportError("Os dados da publicação estão inválidos.");
      }
      if (!metadata || typeof metadata !== "object" || Array.isArray(metadata))
        throw new ImportError("Dados da publicação inválidos.");
      const text = (value, max) => {
        const output = typeof value === "string" ? value.trim() : "";
        if (output.length > max)
          throw new ImportError("Os dados da publicação excedem o limite.");
        return output || null;
      };
      const fileName = decodeURIComponent(
        req.get("x-file-name") || "ranking.csv",
      )
        .replace(/[\x00-\x1f<>:"/\\|?*]/g, "_")
        .slice(-255);
      const connection = await pool.getConnection();
      let result;
      try {
        await connection.beginTransaction();
        await lockAccessControl(connection);
        if (
          !canManageRankings(
            await lockActiveUser(connection, req.authenticatedUser.id),
          )
        ) {
          await connection.rollback();
          return res.status(403).json({
            error: "Seu acesso à publicação foi alterado. Entre novamente.",
          });
        }
        const [previous] = await connection.execute(
          "SELECT entries_json FROM ranking_publications ORDER BY id DESC LIMIT 1",
        );
        [result] = await connection.execute(
          "INSERT INTO ranking_publications (title, author_name, professional_category, professional_registration, source_file_name, entries_json, imported_by) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [
            text(metadata.title, 160) || "Ranking de cenários",
            text(metadata.authorName, 120),
            text(metadata.professionalCategory, 120),
            text(metadata.professionalRegistration, 120),
            fileName,
            JSON.stringify(entries),
            req.authenticatedUser.id,
          ],
        );
        const changes = compareResearch(
          readEntries(previous[0]?.entries_json),
          entries,
        );
        const tickers = [
          ...new Set(
            [...changes.added, ...changes.removed, ...changes.changed].map(
              (entry) => entry.ticker,
            ),
          ),
        ];
        await connection.execute(
          "INSERT INTO ranking_changes(publication_id,changed_tickers) VALUES(?,?)",
          [String(result.insertId), JSON.stringify(tickers)],
        );
        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
      return res.status(201).json({
        message: "Publicação salva. O histórico anterior foi preservado.",
        publicationId: String(result.insertId),
      });
    } catch (error) {
      if (error instanceof ImportError || error instanceof URIError)
        return res.status(400).json({ error: error.message });
      return next(error);
    }
  },
);
export { router as rankingRouter };
