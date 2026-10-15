import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Search, X } from "lucide-react";
import { MarketAssetList } from "../components/MarketAssetList";
import { OrbitCoins } from "../components/OrbitCoins";
import { useMarketAssets } from "../hooks/useMarketAssets";
import { PageState } from "../components/PageState";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

const pageSize = 24;
const sortOptions = ["volume", "market_cap", "change", "name"] as const;
type SortOrder = (typeof sortOptions)[number];

function readSearch(value: string | null) {
  return Array.from(value ?? "")
    .filter(
      (character) =>
        character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127,
    )
    .join("")
    .slice(0, 80)
    .trim();
}

function readSort(value: string | null): SortOrder {
  return sortOptions.includes(value as SortOrder)
    ? (value as SortOrder)
    : "volume";
}

function readPage(value: string | null) {
  if (!value || !/^\d{1,3}$/.test(value)) return 1;
  const page = Number(value);
  return page >= 1 && page <= 500 ? page : 1;
}

export function Analises({ publicView = false }: { publicView?: boolean }) {
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const searchQuery = readSearch(params.get("busca"));
  const sortBy = readSort(params.get("ordem"));
  const page = readPage(params.get("pagina"));
  const [draft, setDraft] = useState({ key: location.key, value: searchQuery });
  const resultsRef = useRef<HTMLDivElement>(null);

  // Restore navigated filters before committing the next input frame, without remounting it.
  if (draft.key !== location.key) {
    setDraft({ key: location.key, value: searchQuery });
  }
  const { assets, total, requestedAt, loading, error, retry } = useMarketAssets(
    {
      search: searchQuery,
      type: "stock",
      sortBy,
      page,
      limit: pageSize,
    },
  );
  const pages = Math.max(1, Math.ceil(total / pageSize));

  const changeFilters = useCallback(
    (search: string, order: SortOrder, nextPage: number, replace = false) => {
      const next = new URLSearchParams(params);
      if (search) next.set("busca", search);
      else next.delete("busca");
      if (order !== "volume") next.set("ordem", order);
      else next.delete("ordem");
      if (nextPage > 1) next.set("pagina", String(nextPage));
      else next.delete("pagina");
      if (next.toString() !== params.toString()) {
        navigate(
          {
            search: next.size ? `?${next.toString()}` : "",
            hash: location.hash,
          },
          { replace, preventScrollReset: true },
        );
      }
    },
    [params, navigate, location.hash],
  );

  useEffect(() => {
    const search = readSearch(draft.value);
    if (draft.key !== location.key || search === searchQuery) return;
    const timeout = window.setTimeout(
      () => changeFilters(search, sortBy, 1),
      350,
    );
    return () => window.clearTimeout(timeout);
  }, [draft, location.key, searchQuery, sortBy, changeFilters]);

  useEffect(() => {
    if (!loading && !error && page > pages) {
      changeFilters(searchQuery, sortBy, pages, true);
    }
  }, [loading, error, page, pages, searchQuery, sortBy, changeFilters]);

  const clearSearch = () => {
    setDraft({ key: location.key, value: "" });
    changeFilters("", sortBy, 1);
  };
  const changePage = (nextPage: number) => {
    changeFilters(searchQuery, sortBy, nextPage);
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    resultsRef.current?.scrollIntoView({
      behavior: reducedMotion ? "instant" : "smooth",
      block: "start",
    });
  };
  const requestedDate = requestedAt ? new Date(requestedAt) : null;
  const validRequestedDate =
    requestedDate && !Number.isNaN(requestedDate.getTime());

  return (
    <section
      className={`market-page mx-auto max-w-7xl space-y-6 ${publicView ? "px-5 py-6 md:px-8 md:py-10" : ""}`}
    >
      <div className="section-masthead relative flex items-start justify-between gap-3 sm:gap-5">
        <div className="relative z-10 min-w-0">
          <p className="edition-label">Mercado · B3</p>
          <h1 className="display-title mt-3 text-3xl text-evo-textMain sm:text-5xl">
            Análises de ações
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-evo-textSec">
            Busque uma empresa pelo nome ou pelo código da ação.
          </p>
        </div>
        <div className="relative z-10 shrink-0 self-start">
          <OrbitCoins variant="real" size="sm" />
        </div>
      </div>

      <div className="market-query-bar grid gap-3 md:grid-cols-[minmax(16rem,1fr)_auto]">
        <div className="flex min-h-12 items-center gap-2 rounded-lg border border-evo-border bg-evo-bgSec px-3 focus-within:border-evo-accent">
          <Search
            size={17}
            className="shrink-0 text-evo-textSec"
            aria-hidden="true"
          />
          <label className="sr-only" htmlFor="asset-search">
            Buscar ticker, empresa ou setor
          </label>
          <input
            id="asset-search"
            type="search"
            autoComplete="off"
            spellCheck={false}
            maxLength={80}
            value={draft.value}
            onChange={(event) => {
              setDraft({ key: location.key, value: event.target.value });
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter")
                changeFilters(readSearch(draft.value), sortBy, 1);
              if (event.key === "Escape") clearSearch();
            }}
            placeholder="Buscar ticker, empresa ou setor"
            className="min-h-11 min-w-0 flex-1 bg-transparent text-base text-evo-textMain outline-none placeholder:text-evo-textSec [&::-webkit-search-cancel-button]:appearance-none md:text-sm"
            aria-controls="market-results"
          />
          {draft.value && (
            <button
              type="button"
              onClick={clearSearch}
              aria-label="Limpar busca"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-evo-textSec hover:text-evo-textMain focus-visible:outline-2 focus-visible:outline-evo-accent"
            >
              <X size={17} aria-hidden="true" />
            </button>
          )}
        </div>
        <label className="sr-only" htmlFor="asset-sort">
          Ordenação
        </label>
        <select
          id="asset-sort"
          value={sortBy}
          onChange={(event) => {
            changeFilters(
              readSearch(draft.value),
              readSort(event.target.value),
              1,
            );
          }}
          className="min-h-12 min-w-0 rounded-lg border border-evo-border bg-evo-bgSec px-3 text-base text-evo-textMain focus-visible:outline-2 focus-visible:outline-evo-accent md:text-sm"
          aria-controls="market-results"
        >
          <option value="volume">Maior volume</option>
          <option value="market_cap">Maior valor de mercado</option>
          <option value="change">Maior variação</option>
          <option value="name">Ordem alfabética</option>
        </select>
      </div>

      <div
        ref={resultsRef}
        id="market-results"
        className="scroll-mt-24 space-y-4"
      >
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
          <span role="status" aria-live="polite" aria-atomic="true">
            {loading
              ? "Carregando ações…"
              : error
                ? "Resultados indisponíveis"
                : `${total.toLocaleString("pt-BR")} ações encontradas`}
          </span>
          {validRequestedDate && (
            <time
              dateTime={requestedDate.toISOString()}
              className="text-xs"
              title={requestedDate.toLocaleString("pt-BR")}
            >
              Consulta:{" "}
              {requestedDate.toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </time>
          )}
        </div>

        {!error && (
          <MarketAssetList
            assets={assets}
            loading={loading}
            metric={sortBy === "market_cap" ? "marketCap" : "volume"}
          />
        )}
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
                ? "Experimente o código da ação ou parte do nome da empresa."
                : "Tente carregar novamente em alguns instantes."
            }
            actionLabel={searchQuery ? "Limpar busca" : "Carregar novamente"}
            onAction={searchQuery ? clearSearch : retry}
          />
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-evo-border pt-4">
        <p className="max-w-3xl text-xs leading-relaxed text-evo-textSec">
          Fonte: brapi.dev.
        </p>
        <nav
          aria-label="Paginação das ações"
          className="flex w-full items-center justify-between gap-2 sm:w-auto"
        >
          <button
            type="button"
            disabled={page <= 1 || loading || Boolean(error)}
            onClick={() => changePage(Math.max(1, page - 1))}
            className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-evo-border px-3 text-sm text-evo-textMain disabled:opacity-40"
          >
            <ArrowLeft size={15} aria-hidden="true" /> Anterior
          </button>
          <span
            className="whitespace-nowrap text-xs text-evo-textSec"
            aria-current="page"
          >
            Página {page}
            {!loading && !error ? ` de ${pages}` : ""}
          </span>
          <button
            type="button"
            disabled={page >= pages || loading || Boolean(error)}
            onClick={() => changePage(Math.min(pages, page + 1))}
            className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-evo-border px-3 text-sm text-evo-textMain disabled:opacity-40"
          >
            Próxima <ArrowRight size={15} aria-hidden="true" />
          </button>
        </nav>
      </div>
    </section>
  );
}
