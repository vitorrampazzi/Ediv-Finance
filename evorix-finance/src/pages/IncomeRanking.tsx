import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { ArrowDownToLine, ArrowUpRight, CircleAlert, FileSpreadsheet, TrendingUp, Upload } from 'lucide-react';
import { Card } from '../components/Card';

type RankingEntry = {
  rank: number;
  ticker: string;
  companyName: string;
  expectedReturnPercent: string;
  targetPrice: string | null;
  horizonMonths: number | null;
  thesis: string | null;
};

type RankingResponse = {
  entries: RankingEntry[];
  updatedAt: string | null;
  sourceFileName: string | null;
  canManage: boolean;
};

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function IncomeRanking() {
  const [ranking, setRanking] = useState<RankingResponse>({ entries: [], updatedAt: null, sourceFileName: null, canManage: false });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadRanking = async (signal?: AbortSignal) => {
    try {
      const response = await fetch('/api/rankings', { credentials: 'same-origin', headers: { Accept: 'application/json' }, signal });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Não foi possível carregar o ranking.');
      setRanking(result as RankingResponse);
    } catch (reason) {
      if (reason instanceof Error && reason.name === 'AbortError') return;
      setError(reason instanceof Error ? reason.message : 'Não foi possível carregar o ranking.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/rankings', { credentials: 'same-origin', headers: { Accept: 'application/json' }, signal: controller.signal })
      .then(async response => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Não foi possível carregar o ranking.');
        return result as RankingResponse;
      })
      .then(result => setRanking(result))
      .catch(reason => {
        if (reason instanceof Error && reason.name === 'AbortError') return;
        setError(reason instanceof Error ? reason.message : 'Não foi possível carregar o ranking.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const chooseFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
    setError('');
    setMessage('');
  };

  const uploadFile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFile) return;
    if (!selectedFile.name.toLocaleLowerCase('pt-BR').endsWith('.csv')) {
      setError('Exporte a planilha do Excel no formato CSV UTF-8 para importar.');
      return;
    }
    setUploading(true);
    setError('');
    setMessage('');
    try {
      const csv = await selectedFile.text();
      const response = await fetch('/api/rankings', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { Accept: 'application/json', 'Content-Type': 'text/csv', 'X-File-Name': selectedFile.name },
        body: csv,
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Não foi possível publicar o arquivo.');
      setMessage(result.message || 'Ranking atualizado.');
      setSelectedFile(null);
      const input = document.getElementById('ranking-csv') as HTMLInputElement | null;
      if (input) input.value = '';
      await loadRanking();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível publicar o arquivo.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-5 md:px-8 md:py-10">
      <section className="relative overflow-hidden rounded-2xl border border-evo-border bg-evo-card p-5 sm:p-7">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-evo-green/10 via-transparent to-evo-accent/10" aria-hidden="true" />
        <div className="relative flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[.18em] text-evo-accent">Ediv Finance</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Renda e projeções</h1>
            <p className="mt-3 text-sm leading-relaxed text-evo-textSec">Acompanhe a lista de ativos e os cenários compartilhados pelo assessor. A posição indica a ordem do arquivo mais recente; não é uma promessa de valorização.</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-evo-green/20 bg-evo-green/10 px-3 py-2 text-xs font-medium text-evo-green"><TrendingUp size={15} aria-hidden="true" /> Atualizado pelo assessor</span>
        </div>
      </section>

      {error && <p role="alert" className="flex items-start gap-2 rounded-lg border border-evo-red/20 bg-evo-red/5 p-3 text-sm text-evo-red"><CircleAlert size={17} className="mt-0.5 shrink-0" aria-hidden="true" />{error}</p>}
      {message && <p role="status" className="rounded-lg border border-evo-green/20 bg-evo-green/5 p-3 text-sm text-evo-green">{message}</p>}

      {ranking.canManage && <Card glow="none" className="border-evo-accent/20">
        <div className="flex items-start gap-3">
          <span className="rounded-lg bg-evo-accent/10 p-2 text-evo-accent"><FileSpreadsheet size={19} aria-hidden="true" /></span>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">Publicar planilha do assessor</h2>
            <p className="mt-1 text-sm leading-relaxed text-evo-textSec">No Excel, use “Salvar como” e escolha CSV UTF-8. A publicação substitui a lista atual depois que o arquivo inteiro for validado.</p>
            <a href="/ediv-ranking-modelo.csv" download className="mt-2 inline-flex min-h-9 items-center gap-2 text-sm font-medium text-evo-accent hover:text-evo-accent"><ArrowDownToLine size={15} aria-hidden="true" /> Baixar modelo CSV</a>
            <form onSubmit={event => void uploadFile(event)} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <label htmlFor="ranking-csv" className="mb-1.5 block text-sm font-medium">Arquivo CSV (até 300 ativos)</label>
                <input id="ranking-csv" type="file" accept=".csv,text/csv" onChange={chooseFile} className="block min-h-11 w-full rounded-lg border border-evo-border bg-evo-bgMain px-3 py-2 text-sm text-evo-textSec file:mr-3 file:rounded-md file:border-0 file:bg-evo-card file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-evo-textMain" />
              </div>
              <button type="submit" disabled={!selectedFile || uploading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-evo-primary px-4 font-semibold text-white transition hover:bg-evo-primaryHover disabled:cursor-not-allowed disabled:opacity-50"><Upload size={16} aria-hidden="true" />{uploading ? 'Publicando…' : 'Publicar ranking'}</button>
            </form>
          </div>
        </div>
      </Card>}

      <section aria-label="Lista de ativos do assessor" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h2 className="text-xl font-semibold">Ranking atual</h2><p className="mt-1 text-sm text-evo-textSec">Potencial e preço-alvo, quando informados, são dados recebidos na planilha.</p></div>
          {ranking.updatedAt && <p className="text-xs text-evo-textSec">Importado em {new Date(ranking.updatedAt.replace(' ', 'T') + (ranking.updatedAt.endsWith('Z') ? '' : 'Z')).toLocaleString('pt-BR')}</p>}
        </div>

        {loading ? <Card glow="none" className="text-sm text-evo-textSec">Carregando ranking…</Card> : ranking.entries.length === 0 ? <Card glow="none" className="flex flex-col items-center gap-3 py-12 text-center">
          <FileSpreadsheet size={36} strokeWidth={1.5} className="text-evo-textSec" aria-hidden="true" />
          <h3 className="text-lg font-semibold">Ainda não há uma planilha publicada</h3>
          <p className="max-w-lg text-sm leading-relaxed text-evo-textSec">Quando o assessor enviar a primeira lista, os ativos, os cenários e as justificativas aparecerão aqui. Nenhuma projeção de exemplo foi inventada.</p>
        </Card> : <div className="grid gap-3">
          {ranking.entries.map(entry => <Card key={entry.ticker} glow="none" className="min-w-0 p-0">
            <article className="grid gap-4 p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-evo-green/20 bg-evo-green/10 font-numbers text-sm font-bold text-evo-green">{entry.rank}</span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1"><h3 className="font-bold">{entry.ticker}</h3><span className="text-sm text-evo-textSec">{entry.companyName}</span></div>
                {entry.thesis && <p className="mt-2 break-words text-sm leading-relaxed text-evo-textSec">{entry.thesis}</p>}
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-3 border-t border-evo-border pt-3 sm:justify-end sm:border-0 sm:pt-0">
                <div><p className="text-[11px] text-evo-textSec">Potencial informado</p><p className="mt-0.5 font-numbers text-lg font-semibold text-evo-green">{Number(entry.expectedReturnPercent).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%</p></div>
                {entry.targetPrice && <div><p className="text-[11px] text-evo-textSec">Preço-alvo informado</p><p className="mt-0.5 font-numbers text-sm font-semibold">{currency.format(Number(entry.targetPrice))}</p></div>}
                {entry.horizonMonths && <div><p className="text-[11px] text-evo-textSec">Horizonte informado</p><p className="mt-0.5 text-sm font-semibold">{entry.horizonMonths} {entry.horizonMonths === 1 ? 'mês' : 'meses'}</p></div>}
              </div>
            </article>
          </Card>)}
        </div>}
      </section>

      {ranking.sourceFileName && <p className="text-xs text-evo-textSec">Planilha de origem: {ranking.sourceFileName}</p>}
      <aside className="rounded-xl border border-yellow-500/20 bg-yellow-500/[0.04] p-4 text-xs leading-relaxed text-evo-textSec">
        <p className="font-semibold text-evo-textMain">Leia antes de tomar qualquer decisão</p>
        <p className="mt-1">Os dados desta lista são fornecidos pelo assessor e reproduzidos conforme a planilha enviada. A Ediv Finance não verifica nem garante os cenários ou retornos indicados. Preços e projeções podem estar desatualizados ou incorretos; rentabilidade passada ou estimada não garante resultados futuros. Avalie riscos, custos, horizonte e sua situação com um profissional habilitado.</p>
      </aside>

      <a href="https://app.agf.com.br/investimento/renda" target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-1.5 text-sm text-evo-textSec hover:text-evo-textMain">Referência de organização de renda <ArrowUpRight size={15} aria-hidden="true" /></a>
    </main>
  );
}
