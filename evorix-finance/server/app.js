import express from 'express';
import helmet from 'helmet';
import { authRouter } from './auth.js';
import { config } from './config.js';
import { pool } from './database.js';

const app = express();
const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);

app.disable('x-powered-by');
if (config.trustProxy) app.set('trust proxy', 1);
app.use(helmet());
app.use(express.json({ limit: '16kb', type: 'application/json' }));
app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

app.use('/api', (req, res, next) => {
  if (safeMethods.has(req.method)) return next();

  const origin = req.get('origin');
  if (!origin || origin !== config.appOrigin || req.get('sec-fetch-site') === 'cross-site') {
    return res.status(403).json({ error: 'Origem da solicitação não permitida.' });
  }
  return next();
});

app.get('/api/health', async (_req, res) => {
  await pool.execute('SELECT 1');
  return res.status(200).json({ status: 'ok' });
});

app.use('/api/auth', authRouter);

app.use('/api', (_req, res) => res.status(404).json({ error: 'Rota de API não encontrada.' }));

app.use((error, _req, res, _next) => {
  console.error('API request failed:', error.code || error.name || 'unknown error');
  if (res.headersSent) return;
  if (error.type === 'entity.too.large') return res.status(413).json({ error: 'A solicitação excede o tamanho permitido.' });
  if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'O conteúdo enviado não é um JSON válido.' });
  return res.status(500).json({ error: 'Não foi possível concluir a solicitação. Tente novamente.' });
});

export { app };
