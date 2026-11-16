import { Router } from 'express';
import { z } from 'zod';
import { requireAuthenticatedUser } from './auth.js';
import { pool } from './database.js';
import { accountLimits, accountLimitMessages, exceedsAccountLimit } from './account-limits.js';

const router = Router();
const tickerSchema = z.string().regex(/^[A-Z0-9.-]{1,16}$/);
router.use(requireAuthenticatedUser);

router.get('/', async (req, res) => {
  const [rows] = await pool.execute('SELECT ticker FROM user_favorites WHERE user_id = ? ORDER BY created_at DESC', [req.authenticatedUser.id]);
  return res.json({ tickers: rows.map(row => row.ticker) });
});

router.put('/:ticker', async (req, res) => {
  const ticker = tickerSchema.safeParse(req.params.ticker.toUpperCase());
  if (!ticker.success) return res.status(400).json({ error: 'Ticker inválido.' });
  // The ticker rule accepts any code, so the list needs its own ceiling. Two
  // simultaneous requests may pass it by one row; the goal is bounded storage.
  const [rows] = await pool.execute('SELECT COUNT(*) AS total, COALESCE(SUM(ticker = ?), 0) AS present FROM user_favorites WHERE user_id = ?', [ticker.data, req.authenticatedUser.id]);
  if (!Number(rows[0].present) && exceedsAccountLimit(rows[0].total, 1, accountLimits.favorites))
    return res.status(409).json({ error: accountLimitMessages.favorites });
  await pool.execute('INSERT IGNORE INTO user_favorites (user_id, ticker) VALUES (?, ?)', [req.authenticatedUser.id, ticker.data]);
  return res.status(204).end();
});

router.delete('/:ticker', async (req, res) => {
  const ticker = tickerSchema.safeParse(req.params.ticker.toUpperCase());
  if (!ticker.success) return res.status(400).json({ error: 'Ticker inválido.' });
  await pool.execute('DELETE FROM user_favorites WHERE user_id = ? AND ticker = ?', [req.authenticatedUser.id, ticker.data]);
  return res.status(204).end();
});

export { router as favoritesRouter };
