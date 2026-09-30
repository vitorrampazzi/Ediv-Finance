import { useMemo, useState } from 'react';
import { Activity, ArrowDown, ArrowUp, Clock3, Star } from 'lucide-react';
import { Card } from '../components/Card';
import { useFavoritos } from '../hooks/useFavoritos';
import { useMarketQuotes } from '../hooks/useMarketQuotes';

const watchlist = ['PETR4', 'ITUB4', 'VALE3', 'MGLU3'];
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export const Analises = () => {
  const [sort, setSort] = useState<'ticker' | 'change'>('ticker');
  const { quotes, loading, error: quoteError } = useMarketQuotes(watchlist);
  const { toggleFavorito, isFavorito, error: favoriteError } = useFavoritos();
  const ordered = useMemo(() => [...quotes].sort((a, b) => sort === 'ticker'
    ? a.symbol.localeCompare(b.symbol)
    : Number(b.changePercent ?? Number.NEGATIVE_INFINITY) - Number(a.changePercent ?? Number.NEGATIVE_INFINITY)), [quotes, sort]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="rounded-xl border border-evo-border bg-evo-card p-6">
        <p className="text-xs font-semibold uppercase tracking-[.18em] text-evo-blueMain">Mercado brasileiro</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-evo-textMain">Cotações e ativos</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-evo-textSec">Consulte o último preço e a variação diária dos ativos selecionados. Não mostramos notas de qualidade ou recomendações de compra e venda.</p>
      </div>

      {(quoteError || favoriteError) && <p role="alert" className="rounded-lg border border-evo-red/20 bg-evo-red/5 p-3 text-sm text-evo-red">{quoteError || favoriteError}</p>}
      <div className="flex flex-wrap items-center gap-2" aria-label="Ordenação das cotações">
        <span className="mr-1 text-sm text-evo-textSec">Ordenar:</span>
        <button type="button" aria-pressed={sort === 'ticker'} onClick={() => setSort('ticker')} className={`min-h-10 rounded-lg border px-3 text-sm ${sort === 'ticker' ? 'border-evo-blueMain/40 bg-evo-blueMain/10 text-evo-blueMain' : 'border-evo-border text-evo-textSec'}`}>Ticker</button>
        <button type="button" aria-pressed={sort === 'change'} onClick={() => setSort('change')} className={`min-h-10 rounded-lg border px-3 text-sm ${sort === 'change' ? 'border-evo-blueMain/40 bg-evo-blueMain/10 text-evo-blueMain' : 'border-evo-border text-evo-textSec'}`}>Variação diária</button>
      </div>

      {loading && <p role="status" className="text-sm text-evo-textSec">Buscando cotações…</p>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {ordered.map(quote => {
          const percentage = quote.changePercent === null ? null : Number(quote.changePercent);
          const favorite = isFavorito(quote.symbol);
          return <Card key={quote.symbol} glow="none" className="relative flex flex-col gap-4">
            <button type="button" aria-label={favorite ? `Remover ${quote.symbol} dos favoritos` : `Adicionar ${quote.symbol} aos favoritos`} aria-pressed={favorite} onClick={() => void toggleFavorito(quote.symbol)} className={`absolute right-4 top-4 rounded p-1 ${favorite ? 'text-yellow-400' : 'text-evo-textSec hover:text-yellow-400'}`}><Star size={18} fill={favorite ? 'currentColor' : 'none'} /></button>
            <div><h2 className="font-bold">{quote.symbol}</h2><p className="mt-1 max-w-[85%] truncate text-xs text-evo-textSec">{quote.name}</p></div>
            <div><p className="font-numbers text-2xl font-semibold">{quote.price ? money.format(Number(quote.price)) : '—'}</p><p className={`mt-1 flex items-center gap-1 text-sm font-medium ${percentage === null ? 'text-evo-textSec' : percentage >= 0 ? 'text-evo-green' : 'text-evo-red'}`}>{percentage === null ? 'Variação indisponível' : <>{percentage >= 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}{percentage > 0 ? '+' : ''}{percentage.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}% no dia</>}</p></div>
            <p className="mt-auto border-t border-evo-border pt-3 text-[11px] text-evo-textSec"><Clock3 size={12} className="mr-1 inline" />{quote.marketTime ? new Date(quote.marketTime).toLocaleString('pt-BR') : 'Horário não disponível'}{quote.stale ? ' · cotação em cache' : ''}</p>
          </Card>;
        })}
      </div>
      {!loading && ordered.length === 0 && <Card glow="none" className="text-sm text-evo-textSec">Nenhuma cotação disponível no momento.</Card>}
      <p className="flex items-start gap-2 text-xs leading-relaxed text-evo-textSec"><Activity size={15} className="mt-0.5 shrink-0" />Fonte: brapi.dev. O atraso depende do plano e pode ser de aproximadamente 30 minutos no gratuito. Preços informativos; não representam execução de ordens nem recomendação de investimento.</p>
    </div>
  );
};
