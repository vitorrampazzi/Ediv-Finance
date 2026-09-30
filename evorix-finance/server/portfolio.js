import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { requireAuthenticatedUser } from './auth.js';
import { pool } from './database.js';
import { getMarketQuotes } from './market.js';

const router = Router();
const SCALE = 100_000_000n;
const decimalPattern = /^\d{1,12}(?:\.\d{1,8})?$/;
const assetTypes = ['ACAO', 'FII', 'ETF', 'RENDA_FIXA', 'CRYPTO', 'OUTRO'];

function toUnits(value) {
  const [whole, fraction = ''] = String(value).split('.');
  return BigInt(whole) * SCALE + BigInt(fraction.padEnd(8, '0'));
}

function fromUnits(value) {
  const sign = value < 0n ? '-' : '';
  const absolute = value < 0n ? -value : value;
  return `${sign}${absolute / SCALE}.${String(absolute % SCALE).padStart(8, '0')}`;
}

function multiplyUnits(left, right) {
  return (left * right + SCALE / 2n) / SCALE;
}

const decimalString = z.string().regex(decimalPattern);
const transactionSchema = z.object({
  side: z.enum(['BUY', 'SELL']),
  ticker: z.string().trim().toUpperCase().regex(/^[A-Z0-9.-]{1,16}$/),
  assetName: z.string().trim().min(1).max(120),
  assetType: z.enum(assetTypes),
  quantity: decimalString,
  unitPrice: decimalString,
  fees: decimalString.optional().default('0'),
  tradedAt: z.string().date().optional(),
});

function parseTransaction(body) {
  const parsed = transactionSchema.safeParse(body);
  if (!parsed.success) return null;
  try {
    const data = parsed.data;
    const quantity = toUnits(data.quantity);
    const unitPrice = toUnits(data.unitPrice);
    const fees = toUnits(data.fees);
    if (quantity <= 0n || unitPrice <= 0n || fees < 0n) return null;
    return { ...data, quantity, unitPrice, fees };
  } catch {
    return null;
  }
}

function calculatePositions(rows) {
  const positions = new Map();
  for (const row of rows) {
    const current = positions.get(row.ticker) || {
      ticker: row.ticker,
      assetName: row.asset_name,
      assetType: row.asset_type,
      quantity: 0n,
      costBasis: 0n,
    };
    const quantity = toUnits(row.quantity);
    const price = toUnits(row.unit_price);
    const fees = toUnits(row.fees);
    current.assetName = row.asset_name;
    current.assetType = row.asset_type;
    if (row.side === 'BUY') {
      current.costBasis += multiplyUnits(quantity, price) + fees;
      current.quantity += quantity;
    } else {
      const reduction = current.quantity > 0n
        ? (current.costBasis * quantity + current.quantity / 2n) / current.quantity
        : 0n;
      current.quantity -= quantity;
      current.costBasis = current.quantity === 0n ? 0n : current.costBasis - reduction;
    }
    positions.set(row.ticker, current);
  }
  return [...positions.values()]
    .filter(position => position.quantity > 0n)
    .map(position => ({
      ticker: position.ticker,
      assetName: position.assetName,
      assetType: position.assetType,
      quantity: fromUnits(position.quantity),
      costBasis: fromUnits(position.costBasis),
      averageCost: fromUnits((position.costBasis * SCALE + position.quantity / 2n) / position.quantity),
    }));
}

router.use(requireAuthenticatedUser);

router.get('/', async (req, res) => {
  const userId = req.authenticatedUser.id;
  const [transactions] = await pool.execute(
    `SELECT id, side, ticker, asset_name, asset_type, quantity, unit_price, fees, traded_at
     FROM portfolio_transactions WHERE user_id = ? ORDER BY traded_at ASC, created_at ASC, id ASC`,
    [userId],
  );
  const positions = calculatePositions(transactions);
  const marketable = positions.filter(position => ['ACAO', 'FII', 'ETF'].includes(position.assetType)).slice(0, 8);
  const quotes = await getMarketQuotes(marketable.map(position => position.ticker));
  const quotesBySymbol = new Map(quotes.map(quote => [quote.symbol, quote]));
  const enrichedPositions = positions.map(position => {
    const quote = quotesBySymbol.get(position.ticker);
    const currentPrice = quote?.price && Number.isFinite(Number(quote.price)) ? toUnits(quote.price) : null;
    const quantity = toUnits(position.quantity);
    const marketValue = currentPrice === null ? null : fromUnits(multiplyUnits(quantity, currentPrice));
    const unrealizedPnl = marketValue === null ? null : fromUnits(toUnits(marketValue) - toUnits(position.costBasis));
    return { ...position, quote: quote || null, currentPrice: currentPrice === null ? null : fromUnits(currentPrice), marketValue, unrealizedPnl };
  });
  const history = [...transactions].reverse().slice(0, 100).map(row => ({
    id: row.id,
    side: row.side,
    ticker: row.ticker,
    assetName: row.asset_name,
    assetType: row.asset_type,
    quantity: row.quantity,
    unitPrice: row.unit_price,
    fees: row.fees,
    tradedAt: row.traded_at,
  }));
  return res.json({ positions: enrichedPositions, transactions: history, transactionHistoryTruncated: transactions.length > 100 });
});

router.post('/transactions', async (req, res) => {
  const transaction = parseTransaction(req.body);
  if (!transaction) return res.status(400).json({ error: 'Confira os dados da operação. Quantidade e preço devem ser positivos.' });

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    // Locking the owner row serializes operations for one account, so two concurrent
    // sales cannot both pass the available-quantity check.
    await connection.execute('SELECT id FROM users WHERE id = ? FOR UPDATE', [req.authenticatedUser.id]);
    const [rows] = await connection.execute(
      `SELECT side, quantity, traded_at, created_at FROM portfolio_transactions
       WHERE user_id = ? AND ticker = ? ORDER BY traded_at ASC, created_at ASC, id ASC`,
      [req.authenticatedUser.id, transaction.ticker],
    );
    const createdAt = new Date().toISOString().slice(0, 23).replace('T', ' ');
    const tradedAt = transaction.tradedAt ? `${transaction.tradedAt} 23:59:59.999` : createdAt;
    const chronological = [...rows, { side: transaction.side, quantity: fromUnits(transaction.quantity), traded_at: tradedAt, created_at: createdAt }]
      .sort((left, right) => String(left.traded_at).localeCompare(String(right.traded_at)) || String(left.created_at).localeCompare(String(right.created_at)));
    let runningQuantity = 0n;
    let oversold = false;
    for (const row of chronological) {
      const quantity = toUnits(row.quantity);
      runningQuantity += row.side === 'BUY' ? quantity : -quantity;
      if (runningQuantity < 0n) { oversold = true; break; }
    }
    if (oversold) {
      await connection.rollback();
      return res.status(409).json({ error: 'A venda deixa a posição registrada negativa na data informada.' });
    }

    await connection.execute(
      `INSERT INTO portfolio_transactions
       (id, user_id, side, ticker, asset_name, asset_type, quantity, unit_price, fees, traded_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, UTC_TIMESTAMP(3)))`,
      [randomUUID(), req.authenticatedUser.id, transaction.side, transaction.ticker, transaction.assetName,
        transaction.assetType, fromUnits(transaction.quantity), fromUnits(transaction.unitPrice),
        fromUnits(transaction.fees), tradedAt],
    );
    await connection.commit();
    return res.status(201).json({ message: 'Operação registrada.' });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

router.get('/preferences', async (req, res) => {
  const [[rows], [financialRows]] = await Promise.all([
    pool.execute('SELECT risk_profile, email_notifications, whatsapp_notifications FROM user_preferences WHERE user_id = ? LIMIT 1', [req.authenticatedUser.id]),
    pool.execute('SELECT declared_invested_amount FROM user_financial_summaries WHERE user_id = ? LIMIT 1', [req.authenticatedUser.id]),
  ]);
  const preference = rows[0];
  return res.json({
    riskProfile: preference?.risk_profile || null,
    emailNotifications: Boolean(preference?.email_notifications),
    whatsappNotifications: Boolean(preference?.whatsapp_notifications),
    declaredInvestedAmount: financialRows[0]?.declared_invested_amount ?? null,
  });
});

router.put('/preferences', async (req, res) => {
  const schema = z.object({
    riskProfile: z.enum(['CONSERVADOR', 'MODERADO', 'ARROJADO']).nullable(),
    emailNotifications: z.boolean(),
    whatsappNotifications: z.boolean(),
    declaredInvestedAmount: z.string().regex(/^\d{1,16}(?:\.\d{1,2})?$/).nullable().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Preferências inválidas.' });
  const preference = parsed.data;
  await pool.execute(
    `INSERT INTO user_preferences (user_id, risk_profile, email_notifications, whatsapp_notifications)
     VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE risk_profile = VALUES(risk_profile),
     email_notifications = VALUES(email_notifications), whatsapp_notifications = VALUES(whatsapp_notifications)`,
    [req.authenticatedUser.id, preference.riskProfile, preference.emailNotifications, preference.whatsappNotifications],
  );
  if (Object.hasOwn(preference, 'declaredInvestedAmount')) {
    await pool.execute(
      `INSERT INTO user_financial_summaries (user_id, declared_invested_amount) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE declared_invested_amount = VALUES(declared_invested_amount)`,
      [req.authenticatedUser.id, preference.declaredInvestedAmount],
    );
  }
  return res.json({ message: 'Preferências salvas.' });
});

export { router as portfolioRouter };
