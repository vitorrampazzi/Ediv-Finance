import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, BarChart3, BriefcaseBusiness, CircleAlert, Clock3, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../lib/api';

type Quote = { symbol: string; name: string; currency: string; price: string | null; change: string | null; changePercent: string | null; marketTime: string | null; source: string; stale?: boolean; unavailable?: boolean };
const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const dateTime = (value: string | null) => value ? new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Horário indisponível';

export function Home() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    setError('');
    try {
      const result = await apiRequest<{ quotes: Quote[] }>('/api/market/quotes?symbols=PETR4,ITUB4,VALE3,MGLU3');
      setQuotes(result.quotes);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível carregar as cotações agora.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    apiRequest<{ quotes: Quote[] }>('/api/market/quotes?symbols=PETR4,ITUB4,VALE3,MGLU3')
      .then(result => setQuotes(result.quotes))
      .catch(reason => setError(reason instanceof Error ? reason.message : 'Não foi possível carregar as cotações agora.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-evo-bgMain text-evo-textMain">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 md:px-8">
        <Link to="/" className="flex items-center gap-3" aria-label="Evorix Finance, página inicial">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-evo-blueMain to-evo-green font-bold text-white">E</span>
          <span className="font-semibold tracking-tight">Evorix Finance</span>
        </Link>
        <nav aria-label="Acesso à conta" className="flex items-center gap-3">
          <Link to="/entrar" className="rounded-lg px-4 py-2.5 text-sm font-medium text-evo-textSec hover:text-evo-textMain">Entrar</Link>
          <Link to="/cadastro" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-evo-blueMain px-4 text-sm font-semibold text-white hover:bg-evo-blueSec">Criar conta <ArrowRight size={16} aria-hidden="true" /></Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-10 px-5 pb-14 pt-10 md:grid-cols-[1.1fr_.9fr] md:px-8 md:pb-20 md:pt-16">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-evo-blueMain/20 bg-evo-blueMain/10 px-3 py-1.5 text-xs font-medium text-evo-blueMain"><Sparkles size={14} aria-hidden="true" /> Organize sua vida financeira</span>
          <h1 className="mt-6 max-w-2xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">Entenda seus investimentos com mais clareza.</h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-evo-textSec">Explore cotações da bolsa sem criar conta. Quando quiser, crie seu acesso para registrar operações e acompanhar sua carteira.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/cadastro" className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-evo-blueMain px-5 font-semibold text-white hover:bg-evo-blueSec">Criar minha conta <ArrowRight size={17} aria-hidden="true" /></Link>
            <a href="#mercado" className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-evo-border px-5 font-semibold text-evo-textMain hover:bg-evo-card"><BarChart3 size={17} aria-hidden="true" /> Ver mercado</a>
          </div>
          <p className="mt-4 text-xs text-evo-textSec">Cadastro gratuito para experimentar. Não conectamos corretoras nem movimentamos dinheiro.</p>
        </div>
        <div className="rounded-2xl border border-evo-border bg-evo-card p-6 shadow-xl md:p-8">
          <div className="flex items-start gap-4"><span className="rounded-xl bg-evo-green/10 p-3 text-evo-green"><BriefcaseBusiness size={22} aria-hidden="true" /></span><div><h2 className="font-semibold">Sua carteira, do seu jeito</h2><p className="mt-2 text-sm leading-relaxed text-evo-textSec">Informe operações e custos para acompanhar posições estimadas. Você controla e pode corrigir os registros.</p></div></div>
          <div className="my-6 border-t border-evo-border" />
          <div className="flex items-start gap-4"><span className="rounded-xl bg-evo-blueMain/10 p-3 text-evo-blueMain"><ShieldCheck size={22} aria-hidden="true" /></span><div><h2 className="font-semibold">Transparência sobre os números</h2><p className="mt-2 text-sm leading-relaxed text-evo-textSec">Cotação, horário e fonte aparecem junto dos valores. Um total que você informar fica identificado como declaração pessoal.</p></div></div>
        </div>
      </section>

      <section id="mercado" className="scroll-mt-6 border-y border-evo-border bg-evo-bgSec/70">
        <div className="mx-auto max-w-7xl px-5 py-12 md:px-8 md:py-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><p className="text-xs font-semibold uppercase tracking-[.18em] text-evo-blueMain">Mercado brasileiro</p><h2 className="mt-2 text-2xl font-bold">Cotações para explorar</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-evo-textSec">Dados fornecidos pela brapi.dev; podem ter atraso e podem ficar indisponíveis. Confira horário e fonte antes de tomar qualquer decisão.</p></div>
            <button type="button" disabled={loading} onClick={() => { setLoading(true); void refresh(); }} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-evo-border px-3 text-sm text-evo-textMain hover:bg-evo-card disabled:opacity-60"><RefreshCw size={15} aria-hidden="true" className={loading ? 'animate-spin' : ''} /> Atualizar</button>
          </div>
          {error && <p role="alert" className="mt-5 flex items-center gap-2 rounded-lg border border-evo-red/20 bg-evo-red/5 p-3 text-sm text-evo-red"><CircleAlert size={17} />{error}</p>}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {(loading && !quotes.length ? ['PETR4', 'ITUB4', 'VALE3', 'MGLU3'].map(symbol => ({ symbol, name: 'Carregando cotação…', currency: 'BRL', price: null, change: null, changePercent: null, marketTime: null, source: 'brapi.dev', stale: false, unavailable: false } satisfies Quote)) : quotes).map((quote: Quote) => {
              const variation = Number(quote.changePercent);
              return <article key={quote.symbol} className="rounded-xl border border-evo-border bg-evo-card p-5">
                <div className="flex items-start justify-between gap-3"><div><h3 className="font-bold">{quote.symbol}</h3><p className="mt-1 line-clamp-1 text-xs text-evo-textSec">{quote.name}</p></div><span className="rounded bg-evo-bgMain px-2 py-1 text-[10px] text-evo-textSec">B3</span></div>
                <p className="mt-5 font-numbers text-2xl font-semibold">{quote.price ? currency.format(Number(quote.price)) : '—'}</p>
                <p className={`mt-1 text-sm font-medium ${Number.isFinite(variation) ? variation >= 0 ? 'text-evo-green' : 'text-evo-red' : 'text-evo-textSec'}`}>{quote.changePercent ? `${variation > 0 ? '+' : ''}${variation.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}% no dia` : quote.unavailable ? 'Cotação indisponível' : 'Variação indisponível'}</p>
                <p className="mt-4 border-t border-evo-border pt-3 text-[11px] text-evo-textSec"><Clock3 size={12} className="mr-1 inline" aria-hidden="true" />{dateTime(quote.marketTime)}{quote.stale ? ' · dado em cache/indisponível' : ''}</p>
              </article>;
            })}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-evo-textSec">Fonte: brapi.dev. Cotações gratuitas podem ter atraso aproximado de 30 minutos. Conteúdo informativo, sem recomendação de compra ou venda.</p>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-xs text-evo-textSec md:px-8"><span>© {new Date().getFullYear()} Evorix Finance</span><span>Organização financeira pessoal; não é corretora ou consultoria de investimentos.</span></footer>
    </main>
  );
}
