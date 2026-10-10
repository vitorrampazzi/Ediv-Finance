import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Search } from "lucide-react";
import { MarketAssetList } from "../components/MarketAssetList";
import { OrbitCoins } from "../components/OrbitCoins";
import { useMarketAssets } from "../hooks/useMarketAssets";
import { PageState } from "../components/PageState";

export function Analises({ publicView = false }: { publicView?: boolean }) {
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("volume");
  const [page, setPage] = useState(1);
  const { assets, total, requestedAt, loading, error, retry } = useMarketAssets(
    {
      search: searchQuery,
      type: "stock",
      sortBy,
      page,
      limit: 24,
    },
  );
  const pages = Math.max(1, Math.ceil(total / 24));

  useEffect(() => {
    const timeout = window.setTimeout(() => setSearchQuery(search), 300);
    return () => window.clearTimeout(timeout);
  }, [search]);

  return (
    <section
      className={`mx-auto max-w-7xl space-y-6 ${publicView ? "px-5 py-6 md:px-8 md:py-10" : ""}`}
    >
      <div className="page-intro relative flex flex-col items-start justify-between gap-5 sm:flex-row">
        <div className="relative z-10 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[.18em] text-evo-accent">
            Caderno de mercado / B3
          </p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-[-.04em] text-evo-textMain sm:text-5xl">
            O mercado, em perspectiva.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-evo-textSec">
            Pesquise ações ordinárias, preferenciais e units de empresas
            brasileiras. Os preços são informativos e não representam execução
            de ordens nem recomendação de investimento.
          </p>
        </div>
        <div className="relative z-10 shrink-0 self-end sm:self-start">
          <OrbitCoins variant="real" size="sm" />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(16rem,1fr)_auto]">
        <label className="flex min-h-11 items-center gap-2 rounded-lg border border-evo-border bg-evo-bgSec px-3">
          <Search size={17} className="text-evo-textSec" aria-hidden="true" />
          <span className="sr-only">Buscar ticker, empresa ou setor</span>
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Buscar ticker, empresa ou setor"
            className="w-full bg-transparent text-sm text-evo-textMain outline-none placeholder:text-evo-textSec"
          />
        </label>
        <label className="sr-only" htmlFor="asset-sort">
          Ordenação
        </label>
        <select
          id="asset-sort"
          value={sortBy}
          onChange={(event) => {
            setSortBy(event.target.value);
            setPage(1);
          }}
          className="min-h-11 rounded-lg border border-evo-border bg-evo-bgSec px-3 text-sm text-evo-textMain"
        >
          <option value="volume">Maior volume</option>
          <option value="market_cap">Maior valor de mercado</option>
          <option value="change">Maior variação</option>
          <option value="name">Ordem alfabética</option>
        </select>
      </div>

      {error && (
        <PageState
          kind="error"
          title="A lista de ações não pôde ser carregada"
          description={error}
          actionLabel="Tentar novamente"
          onAction={retry}
        />
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-evo-textSec">
        <span role="status">
          {loading
            ? "Carregando ações…"
            : error
              ? "Resultados indisponíveis"
              : `${total.toLocaleString("pt-BR")} ações encontradas`}
        </span>
        {requestedAt && (
          <span className="text-xs">
            Consulta ao provedor:{" "}
            {new Date(requestedAt).toLocaleString("pt-BR")}
          </span>
        )}
      </div>

      <MarketAssetList assets={assets} loading={loading} />
      {!loading && assets.length === 0 && !error && (
        <PageState
          kind="empty"
          title={
            searchQuery
              ? "Nenhuma ação corresponde à busca"
              : "O catálogo está indisponível no momento"
          }
          description={
            searchQuery
              ? "Experimente o código da ação ou parte do nome da empresa. Você também pode voltar ao catálogo completo."
              : "Você pode tentar carregar novamente ou continuar estudando as pesquisas e aulas."
          }
          actionLabel={searchQuery ? "Limpar busca" : "Carregar novamente"}
          onAction={
            searchQuery
              ? () => {
                  setSearch("");
                  setSearchQuery("");
                  setPage(1);
                }
              : retry
          }
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-evo-border pt-4">
        <p className="max-w-3xl text-xs leading-relaxed text-evo-textSec">
          Fonte: brapi.dev. “Consulta ao provedor” indica quando a lista foi
          consultada; não garante o horário exato da negociação.
        </p>
        <nav
          aria-label="Paginação das ações"
          className="flex items-center gap-2"
        >
          <button
            type="button"
            disabled={page <= 1 || loading || Boolean(error)}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-evo-border px-3 text-sm text-evo-textMain disabled:opacity-40"
          >
            <ArrowLeft size={15} aria-hidden="true" /> Anterior
          </button>
          <span className="text-xs text-evo-textSec">
            Página {page}
            {!loading && !error ? ` de ${pages}` : ""}
          </span>
          <button
            type="button"
            disabled={page >= pages || loading || Boolean(error)}
            onClick={() => setPage((current) => Math.min(pages, current + 1))}
            className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-evo-border px-3 text-sm text-evo-textMain disabled:opacity-40"
          >
            Próxima <ArrowRight size={15} aria-hidden="true" />
          </button>
        </nav>
      </div>
    </section>
  );
}
