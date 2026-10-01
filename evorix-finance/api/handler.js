import { app } from '../server/app.js';

export default function handler(req, res) {
  const incomingUrl = new URL(req.url || '/', 'https://vercel.internal');
  const apiPath = incomingUrl.searchParams.get('__path');

  if (apiPath) {
    incomingUrl.searchParams.delete('__path');
    const query = incomingUrl.searchParams.toString();
    req.url = `/api/${apiPath.replace(/^\/+/, '')}${query ? `?${query}` : ''}`;
  }

  return app(req, res);
}
