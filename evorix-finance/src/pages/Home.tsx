import { ArrowDown, ArrowRight, ArrowUp, BarChart3, BriefcaseBusiness, CircleAlert, Headset, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMarketAssets } from '../hooks/useMarketAssets';

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function Home() {
  const { assets, loading, error, requestedAt } = useMarketAssets({ search: '', type: 'stock', sortBy: 'volume', page: 1, limit: 8 });

  return (
    <main className="min-h-screen bg-evo-bgMain text-evo-textMain">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 md:px-8">
        <Link to="/" className="flex items-center gap-3" aria-label="Evorix Finance, página inicial">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-evo-blueMain to-evo-green font-bold text-white">E</span>
          <span className="hidden font-semibold tracking-tight sm:inline">Evorix Finance</span>
        </Link>
        <nav aria-label="Acesso à conta" className="flex items-center gap-3">
          <Link to="/assessoria" aria-label="Conheça a assessoria" className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-evo-textSec hover:bg-evo-card hover:text-evo-textMain sm:h-auto sm:w-auto sm:px-3 sm:py-2.5"><Headset size={18} aria-hidden="true" /><span className="sr-only sm:not-sr-only sm:ml-2 sm:text-sm sm:font-medium">Assessoria</span></Link>
          <Link to="/mercado" className="hidden rounded-lg px-4 py-2.5 text-sm font-medium text-evo-textSec hover:text-evo-textMain sm:block">Mercado</Link>
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
            <Link to="/mercado" className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-evo-border px-5 font-semibold text-evo-textMain hover:bg-evo-card"><BarChart3 size={17} aria-hidden="true" /> Ver mercado</Link>
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
          <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-evo-blueMain">Mercado brasileiro</p><h2 className="mt-2 text-2xl font-bold">Ações mais negociadas</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-evo-textSec">Uma amostra dos ativos com maior volume disponível no provedor.</p></div><Link to="/mercado" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-evo-border px-3 text-sm text-evo-textMain hover:bg-evo-card">Explorar ativos <ArrowRight size={15} /></Link></div>
          {error && <p role="alert" className="mt-5 flex items-center gap-2 rounded-lg border border-evo-red/20 bg-evo-red/5 p-3 text-sm text-evo-red"><CircleAlert size={17} />{error}</p>}
          {loading && <p role="status" className="mt-5 text-sm text-evo-textSec">Carregando ativos do mercado…</p>}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {assets.map(asset => { const variation = asset.changePercent === null ? null : Number(asset.changePercent); return <article key={asset.symbol} className="rounded-xl border border-evo-border bg-evo-card p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold">{asset.symbol}</h3><p className="mt-1 line-clamp-1 text-xs text-evo-textSec">{asset.name}</p></div><span className="rounded bg-evo-bgMain px-2 py-1 text-[10px] text-evo-textSec">B3</span></div><p className="mt-5 font-numbers text-2xl font-semibold">{currency.format(Number(asset.price))}</p><p className={`mt-1 flex items-center gap-1 text-sm font-medium ${variation === null ? 'text-evo-textSec' : variation >= 0 ? 'text-evo-green' : 'text-evo-red'}`}>{variation === null ? 'Variação indisponível' : <>{variation >= 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}{variation > 0 ? '+' : ''}{variation.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</>}</p><p className="mt-4 border-t border-evo-border pt-3 text-[11px] text-evo-textSec">{asset.sector || 'B3'}</p></article>; })}
          </div>
          {requestedAt && <p className="mt-4 text-xs text-evo-textSec">Consulta ao provedor: {new Date(requestedAt).toLocaleString('pt-BR')}. O horário é da consulta, não necessariamente da negociação.</p>}
          <p className="mt-2 text-xs leading-relaxed text-evo-textSec">Fonte: brapi.dev. Preços podem ter atraso ou indisponibilidade. Conteúdo informativo, sem recomendação de compra ou venda.</p>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-xs text-evo-textSec md:px-8"><span>© {new Date().getFullYear()} Evorix Finance</span><span>Organização financeira pessoal; não é corretora ou consultoria de investimentos.</span></footer>
    </main>
  );
}
