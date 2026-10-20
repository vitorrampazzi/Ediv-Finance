import { app } from '../server/app.js';

export default function handler(req, res) {
  const incomingUrl = new URL(req.url || '/', 'https://vercel.internal');
  const apiPath = incomingUrl.searchParams.get('__path');

  // Rewrite metadata can also arrive in the URL, not only req.query.
  incomingUrl.searchParams.delete('__path');
  incomingUrl.searchParams.delete('vercelPath');
  const path = apiPath ? `/api/${apiPath.replace(/^\/+/, '')}` : incomingUrl.pathname;
  req.url = `${path}${incomingUrl.search}`;

  // Let Express parse the URL instead of Vercel's cached rewrite query.
  delete req.query;
  return app(req, res);
}
