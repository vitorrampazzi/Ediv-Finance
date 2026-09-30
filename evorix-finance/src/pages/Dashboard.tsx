import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, ArrowRight, BriefcaseBusiness, CircleAlert, DollarSign, RefreshCw, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../components/Card';
import { OrbitCoins } from '../components/OrbitCoins';
import { apiRequest } from '../lib/api';

type Quote = { symbol: string; name: string; currency: string; price: string | null; change: string | null; changePercent: string | null; marketTime: string | null; source: string; stale?: boolean; unavailable?: boolean };
type Position = { ticker: string; assetName: string; assetType: string; quantity: string; costBasis: string; averageCost: string; quote: Quote | null; currentPrice: string | null; marketValue: string | null; unrealizedPnl: string | null };
type DashboardData = { positions: Position[]; transactions: { id: string }[] };
const integerFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const scale = 100_000_000n;
function decimalUnits(value: string) {
  const negative = value.startsWith('-');
  const [whole, fraction = ''] = (negative ? value.slice(1) : value).split('.');
  const units = BigInt(whole || '0') * scale + BigInt(fraction.padEnd(8, '0').slice(0, 8));
  return negative ? -units : units;
}
function moneyFromUnits(units: bigint) {
  const negative = units < 0n;
  const absolute = negative ? -units : units;
  const cents = (absolute + 500_000n) / 1_000_000n;
  return `R$ ${negative ? '-' : ''}${integerFormat.format(cents / 100n)},${String(cents % 100n).padStart(2, '0')}`;
}
function money(value: string | null) {
  return value === null ? '—' : moneyFromUnits(decimalUnits(value));
}
function sumFinancialUnits(values: Array<string | null>) {
  return values.filter((value): value is string => value !== null).reduce((total, value) => total + decimalUnits(value), 0n);
}
function sumFinancialValues(values: Array<string | null>) {
  return moneyFromUnits(sumFinancialUnits(values));
}

export const Dashboard = () => {
  const [portfolio, setPortfolio] = useState<DashboardData>({ positions: [], transactions: [] });
  const [declaredAmount, setDeclaredAmount] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const [portfolioData, preferences] = await Promise.all([
        apiRequest<DashboardData>('/api/portfolio'),
        apiRequest<{ declaredInvestedAmount: string | null }>('/api/portfolio/preferences'),
      ]);
      setPortfolio(portfolioData);
      setDeclaredAmount(preferences.declaredInvestedAmount);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível carregar seus dados.');
    } finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => {
    Promise.all([
      apiRequest<DashboardData>('/api/portfolio'),
      apiRequest<{ declaredInvestedAmount: string | null }>('/api/portfolio/preferences'),
    ])
      .then(([portfolioData, preferences]) => { setPortfolio(portfolioData); setDeclaredAmount(preferences.declaredInvestedAmount); })
      .catch(reason => setError(reason instanceof Error ? reason.message : 'Não foi possível carregar seus dados.'))
      .finally(() => setLoading(false));
  }, []);

  const totals = useMemo(() => {
    const priced = portfolio.positions.filter(position => position.marketValue !== null);
    return {
      cost: sumFinancialValues(portfolio.positions.map(position => position.costBasis)),
      market: sumFinancialValues(priced.map(position => position.marketValue)),
      pnl: sumFinancialValues(priced.map(position => position.unrealizedPnl)),
      pnlUnits: sumFinancialUnits(priced.map(position => position.unrealizedPnl)),
      priced: priced.length,
      unpriced: portfolio.positions.length - priced.length,
    };
  }, [portfolio.positions]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="relative flex items-center justify-between overflow-hidden rounded-xl border border-evo-border bg-evo-card p-6 shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-r from-evo-blueMain/5 to-transparent pointer-events-none" />
        <div className="relative z-10"><p className="text-sm text-evo-textSec">Seu espaço financeiro</p><h2 className="mt-1 text-2xl font-bold text-evo-textMain">Visão geral</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-evo-textSec">Aqui você acompanha os registros da sua carteira e as estimativas baseadas nas cotações disponíveis.</p></div>
        <div className="hidden shrink-0 md:block" aria-hidden="true"><OrbitCoins variant="wealth" size="hero" /></div>
      </div>

      {error && <p role="alert" className="flex items-center gap-2 rounded-lg border border-evo-red/20 bg-evo-red/5 p-3 text-sm text-evo-red"><CircleAlert size={17} />{error}</p>}

      <section aria-label="Resumo financeiro" className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card glow="none" className="relative flex min-h-36 flex-col gap-2 overflow-hidden"><DollarSign className="absolute -right-2 -top-2 text-evo-blueMain/10" size={76} aria-hidden="true" /><span className="z-10 text-sm font-medium text-evo-textSec">Valor de mercado estimado</span><strong className="z-10 font-numbers text-2xl font-bold">{loading ? 'Carregando…' : totals.market}</strong><span className="z-10 text-xs text-evo-textSec">{totals.priced} de {portfolio.positions.length} posições com cotação disponível</span></Card>
        <Card glow="none" className="relative flex min-h-36 flex-col gap-2 overflow-hidden"><BriefcaseBusiness className="absolute -right-2 -top-2 text-evo-green/10" size={76} aria-hidden="true" /><span className="z-10 text-sm font-medium text-evo-textSec">Custo registrado</span><strong className="z-10 font-numbers text-2xl font-bold">{loading ? 'Carregando…' : totals.cost}</strong><span className="z-10 text-xs text-evo-textSec">Calculado a partir das compras e vendas que você registrou</span></Card>
        <Card glow="none" className="relative flex min-h-36 flex-col gap-2 overflow-hidden"><TrendingUp className="absolute -right-2 -top-2 text-evo-blueMain/10" size={76} aria-hidden="true" /><span className="z-10 text-sm font-medium text-evo-textSec">Variação não realizada estimada</span><strong className={`z-10 font-numbers text-2xl font-bold ${totals.pnlUnits >= 0n ? 'text-evo-green' : 'text-evo-red'}`}>{loading ? 'Carregando…' : totals.pnl}</strong><span className="z-10 text-xs text-evo-textSec">Somente posições com preço recebido</span></Card>
      </section>

      {declaredAmount !== null && <p className="rounded-lg border border-evo-border bg-evo-card px-4 py-3 text-sm text-evo-textSec">Total investido informado por você: <strong className="font-numbers text-evo-textMain">{money(declaredAmount)}</strong>. É uma declaração pessoal, separada da estimativa das posições cadastradas.</p>}

      {totals.unpriced > 0 && !loading && <p className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-4 py-3 text-sm leading-relaxed text-yellow-200">Não há cotação disponível para {totals.unpriced} posição(ões). Elas não entram no valor de mercado estimado. Cotações podem ter atraso, estar fora do horário de negociação ou não estar disponíveis para todos os ativos.</p>}

      <Card glow="none" className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-evo-border p-5"><div><h3 className="font-semibold">Posições da carteira</h3><p className="mt-1 text-sm text-evo-textSec">Estimativa de mercado = quantidade registrada × última cotação recebida.</p></div><button type="button" disabled={refreshing} onClick={() => { setRefreshing(true); void load(); }} aria-label="Atualizar carteira e cotações" className="rounded-lg p-2 text-evo-textSec hover:bg-white/5 hover:text-evo-textMain disabled:opacity-60"><RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} /></button></div>
        <div className="overflow-x-auto"><table className="w-full text-left"><caption className="sr-only">Posições com custo registrado e cotação de mercado quando disponível</caption><thead><tr className="border-b border-white/5 bg-white/[0.02] text-xs uppercase tracking-wider text-evo-textSec"><th scope="col" className="p-4">Ativo</th><th scope="col" className="p-4 text-right">Quantidade</th><th scope="col" className="p-4 text-right">Último preço</th><th scope="col" className="p-4 text-right">Valor estimado</th><th scope="col" className="p-4 text-right">Variação estimada</th></tr></thead><tbody className="divide-y divide-white/5">
          {loading ? <tr><td colSpan={5} className="p-8 text-center text-sm text-evo-textSec">Carregando posições…</td></tr> : portfolio.positions.length === 0 ? <tr><td colSpan={5} className="p-8 text-center text-sm text-evo-textSec">Você ainda não registrou ativos. Cadastre uma compra para começar a acompanhar sua carteira.</td></tr> : portfolio.positions.map(position => <tr key={position.ticker}><th scope="row" className="p-4 font-medium text-evo-textMain"><span>{position.ticker}</span><span className="block text-xs font-normal text-evo-textSec">{position.assetName}</span></th><td className="p-4 text-right text-evo-textMain">{Number(position.quantity).toLocaleString('pt-BR', { maximumFractionDigits: 8 })}</td><td className="p-4 text-right text-evo-textSec">{position.currentPrice ? money(position.currentPrice) : 'Indisponível'}</td><td className="p-4 text-right font-medium text-evo-textMain">{position.marketValue ? money(position.marketValue) : '—'}</td><td className={`p-4 text-right font-medium ${decimalUnits(position.unrealizedPnl ?? '0') >= 0n ? 'text-evo-green' : 'text-evo-red'}`}>{position.unrealizedPnl ? money(position.unrealizedPnl) : '—'}</td></tr>)}
        </tbody></table></div>
        {portfolio.positions.some(position => position.quote) && <p className="border-t border-evo-border px-5 py-3 text-xs text-evo-textSec"><Activity size={13} className="mr-1 inline" aria-hidden="true" />Fonte: brapi.dev · preços e horários seguem os dados disponibilizados pelo provedor e podem estar atrasados.</p>}
      </Card>

      <div className="flex flex-wrap gap-3"><Link to="/app/carteira" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-evo-blueMain px-4 font-semibold text-white hover:bg-evo-blueSec">Gerenciar carteira <ArrowRight size={16} /></Link><Link to="/app/perfil" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-evo-border px-4 font-semibold text-evo-textMain hover:bg-evo-card">Informar total investido</Link><Link to="/" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-evo-border px-4 text-evo-textSec hover:bg-evo-card"><Activity size={16} /> Explorar mercado</Link></div>
      <p className="text-xs leading-relaxed text-evo-textSec">Valores estimados para acompanhamento pessoal. Preços podem estar atrasados ou ausentes. A estimativa não considera impostos, taxas futuras ou eventos corporativos e não é saldo de corretora nem recomendação de investimento.</p>
    </div>
  );
};
