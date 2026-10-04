import { randomUUID } from 'node:crypto';
import express, { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { config } from './config.js';
import { pool } from './database.js';
import { currentUser, requireAuthenticatedUser } from './auth.js';

const router = Router();
const MAX_ROWS = 300;
const MAX_CSV_BYTES = 256 * 1024;
const rankingUploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Muitos uploads em pouco tempo. Aguarde alguns minutos e tente de novo.' },
});
class CsvImportError extends Error {}
const allowedHeaderAliases = {
  ticker: ['ticker', 'symbol', 'ativo', 'codigo'],
  companyName: ['empresa', 'company', 'company_name', 'nome', 'companhia'],
  expectedReturnPercent: ['potencial_percentual', 'potencial', 'upside_percent', 'expected_return_percent', 'retorno_estimado_percentual'],
  targetPrice: ['preco_alvo', 'target_price', 'preco_objetivo'],
  horizonMonths: ['horizonte_meses', 'prazo_meses', 'horizon_months'],
  thesis: ['tese', 'justificativa', 'observacao', 'rationale', 'thesis'],
};

function normalizeHeader(value) {
  return value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function parseDelimitedText(text) {
  const firstLine = text.split(/\r?\n/, 1)[0] || '';
  const delimiter = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ',';
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') { field += '"'; index += 1; }
      else if (character === '"') quoted = false;
      else field += character;
    } else if (character === '"' && field.length === 0) quoted = true;
    else if (character === delimiter) { row.push(field); field = ''; }
    else if (character === '\n') {
      row.push(field.replace(/\r$/, ''));
      if (row.some(cell => cell.trim())) rows.push(row);
      row = [];
      field = '';
    } else field += character;
  }
  if (quoted) throw new CsvImportError('O CSV tem aspas sem fechamento. Salve a planilha novamente como CSV UTF-8.');
  row.push(field.replace(/\r$/, ''));
  if (row.some(cell => cell.trim())) rows.push(row);
  return rows;
}

function parseLocalizedNumber(value, label, { optional = false, integer = false } = {}) {
  const source = value.trim().replace(/^(R\$|US\$|\$)\s*/i, '').replace(/%$/, '').replace(/\s/g, '');
  if (!source && optional) return null;
  if (!source) throw new CsvImportError(`Preencha o campo ${label} em todas as linhas.`);
  let normalized = source;
  const comma = normalized.lastIndexOf(',');
  const dot = normalized.lastIndexOf('.');
  if (comma >= 0 && dot >= 0) {
    const decimalSeparator = comma > dot ? ',' : '.';
    const thousandsSeparator = decimalSeparator === ',' ? '.' : ',';
    normalized = normalized.split(thousandsSeparator).join('');
    if (decimalSeparator === ',') normalized = normalized.replace(',', '.');
  } else if (comma >= 0) normalized = normalized.replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) throw new CsvImportError(`O campo ${label} contém um número inválido.`);
  const number = Number(normalized);
  if (!Number.isFinite(number) || (integer && !Number.isInteger(number))) throw new CsvImportError(`O campo ${label} deve ser ${integer ? 'um número inteiro' : 'um número válido'}.`);
  return number;
}

function validateCsv(text) {
  if (typeof text !== 'string' || !text.trim()) throw new CsvImportError('O arquivo está vazio.');
  if (Buffer.byteLength(text, 'utf8') > MAX_CSV_BYTES) throw new CsvImportError('O arquivo ultrapassa o limite de 256 KB. Divida a lista e tente novamente.');
  const rows = parseDelimitedText(text.replace(/^\uFEFF/, ''));
  if (rows.length < 2) throw new CsvImportError('Inclua os títulos das colunas e pelo menos uma ação.');
  if (rows.length - 1 > MAX_ROWS) throw new CsvImportError(`O arquivo pode ter no máximo ${MAX_ROWS} ações.`);

  const headers = rows[0].map(normalizeHeader);
  const indexes = {};
  for (const [field, aliases] of Object.entries(allowedHeaderAliases)) {
    indexes[field] = headers.findIndex(header => aliases.includes(header));
  }
  for (const required of ['ticker', 'companyName', 'expectedReturnPercent']) {
    if (indexes[required] === -1) throw new CsvImportError('Colunas obrigatórias: ticker, empresa e potencial_percentual. Confira o modelo CSV.');
  }

  const seenTickers = new Set();
  return rows.slice(1).map((cells, index) => {
    const value = field => indexes[field] >= 0 ? (cells[indexes[field]] || '').trim() : '';
    const ticker = value('ticker').toUpperCase();
    const companyName = value('companyName');
    if (!/^[A-Z0-9][A-Z0-9._-]{0,15}$/.test(ticker)) throw new CsvImportError(`Ticker inválido na linha ${index + 2}.`);
    if (seenTickers.has(ticker)) throw new CsvImportError(`O ticker ${ticker} aparece mais de uma vez no arquivo.`);
    seenTickers.add(ticker);
    if (!companyName || companyName.length > 160) throw new CsvImportError(`Informe o nome da empresa (até 160 caracteres) na linha ${index + 2}.`);

    const expectedReturnPercent = parseLocalizedNumber(value('expectedReturnPercent'), 'potencial percentual');
    if (expectedReturnPercent < 0 || expectedReturnPercent > 1000) throw new CsvImportError(`O potencial da linha ${index + 2} deve ficar entre 0% e 1000%.`);
    const targetPrice = parseLocalizedNumber(value('targetPrice'), 'preço-alvo', { optional: true });
    if (targetPrice !== null && (targetPrice <= 0 || targetPrice > 1_000_000_000)) throw new CsvImportError(`Preço-alvo inválido na linha ${index + 2}.`);
    const horizonMonths = parseLocalizedNumber(value('horizonMonths'), 'horizonte em meses', { optional: true, integer: true });
    if (horizonMonths !== null && (horizonMonths < 1 || horizonMonths > 120)) throw new CsvImportError(`O horizonte da linha ${index + 2} deve ser de 1 a 120 meses.`);
    const thesis = value('thesis');
    if (thesis.length > 2000) throw new CsvImportError(`A tese da linha ${index + 2} excede 2.000 caracteres.`);

    return { ticker, companyName, expectedReturnPercent, targetPrice, horizonMonths, thesis: thesis || null };
  });
}

function canManageRankings(email) {
  return Boolean(email && config.rankingAdminEmails.includes(email.toLowerCase()));
}

router.get('/', async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT rank_position, ticker, company_name, expected_return_percent, target_price,
            horizon_months, thesis, source_file_name, created_at
     FROM income_ranking_entries ORDER BY rank_position ASC`,
  );
  const latest = rows[0];
  const user = await currentUser(req);

  return res.status(200).json({
    entries: rows.map(row => ({
      rank: Number(row.rank_position), ticker: row.ticker, companyName: row.company_name,
      expectedReturnPercent: String(row.expected_return_percent), targetPrice: row.target_price === null ? null : String(row.target_price),
      horizonMonths: row.horizon_months === null ? null : Number(row.horizon_months), thesis: row.thesis,
    })),
    updatedAt: latest?.created_at || null,
    sourceFileName: latest?.source_file_name || null,
    canManage: canManageRankings(user?.email),
  });
});

router.post('/', rankingUploadLimiter, express.text({ type: ['text/csv', 'application/csv'], limit: MAX_CSV_BYTES }), requireAuthenticatedUser, async (req, res, next) => {
  try {
    if (!canManageRankings(req.authenticatedUser.email)) return res.status(403).json({ error: 'Sua conta não tem permissão para publicar o ranking.' });
    const csv = typeof req.body === 'string' ? req.body : '';
    const rows = validateCsv(csv);
    const originalFileName = String(req.get('x-file-name') || 'ranking-corretor.csv');
    const fileName = originalFileName.replace(/[\u0000-\u001f<>:"/\\|?*]/g, '_').trim().slice(-255) || 'ranking-corretor.csv';
    const batchId = randomUUID();
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute('DELETE FROM income_ranking_entries');
      const placeholders = rows.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
      const values = rows.flatMap((item, index) => [
        randomUUID(), batchId, index + 1, item.ticker, item.companyName, item.expectedReturnPercent,
        item.targetPrice, item.horizonMonths, item.thesis, fileName, req.authenticatedUser.id,
      ]);
      await connection.execute(
        `INSERT INTO income_ranking_entries
           (id, batch_id, rank_position, ticker, company_name, expected_return_percent, target_price,
            horizon_months, thesis, source_file_name, imported_by)
         VALUES ${placeholders}`,
        values,
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    return res.status(200).json({ message: `Ranking atualizado com ${rows.length} ativos.` });
  } catch (error) {
    if (error instanceof CsvImportError) {
      return res.status(400).json({ error: error.message });
    }
    return next(error);
  }
});

export const rankingRouter = router;
