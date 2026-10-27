// This isolated visual preview never opens a database or accepts account writes.
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({error: 'Prévia visual somente para leitura.'});
  }
  const url = new URL(req.url || '/', 'https://preview.invalid');
  const rewritten = url.searchParams.get('__path');
  const path = rewritten ? '/api/' + rewritten.replace(/^\/+/, '') : url.pathname;
  if (path === '/api/auth/me') return res.status(401).json({error: 'Prévia visual sem sessão de conta.'});
  if (path === '/api/auth/availability') return res.json({available: true, challenge: {required: false}});
  if (path === '/api/rankings/public') {
    try {
      const response = await fetch('https://escoladodividendo.com.br/api/rankings/public', {signal: AbortSignal.timeout(12000)});
      if (!response.ok) throw new Error('Public ranking unavailable');
      return res.json(await response.json());
    } catch {
      return res.status(503).json({error: 'Ranking temporariamente indisponível nesta prévia.'});
    }
  }
  return res.status(404).json({error: 'Área indisponível nesta prévia visual.'});
}
