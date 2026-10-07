import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Search,
  Star,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "../components/Card";
import { OrbitCoins } from "../components/OrbitCoins";
import { useAuth } from "../context/authContext";
import { useFavoritos } from "../hooks/useFavoritos";
import { useMarketAssets } from "../hooks/useMarketAssets";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const assetTypes = [
  { value: "stock", label: "Ações e units" },
  { value: "fund", label: "Fundos e ETFs" },
  { value: "bdr", label: "BDRs" },
  { value: "all", label: "Todos os ativos" },
];

export function Analises({ publicView = false }: { publicView?: boolean }) {
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [type, setType] = useState("stock");
  const [sortBy, setSortBy] = useState("volume");
  const [page, setPage] = useState(1);
  const { assets, total, requestedAt, loading, error } = useMarketAssets({
    search: searchQuery,
    type,
    sortBy,
    page,
    limit: 24,
  });
  const { user } = useAuth();
  const { toggleFavorito, isFavorito, error: favoriteError } = useFavoritos();
  const pages = Math.max(1, Math.ceil(total / 24));

  useEffect(() => {
    const timeout = window.setTimeout(() => setSearchQuery(search), 300);
    return () => window.clearTimeout(timeout);
  }, [search]);

  return (
    <section
      className={`mx-auto max-w-7xl space-y-6 ${publicView ? "px-5 py-6 md:px-8 md:py-10" : ""}`}
    >
      <div
        className={
          publicView
            ? "relative flex flex-col items-start justify-between gap-4 overflow-hidden rounded-xl border border-evo-border bg-evo-card p-5 sm:flex-row sm:items-center sm:p-6"
            : "relative flex items-start justify-between gap-5 border-b border-evo-border pb-8 sm:pb-10"
        }
      >
        {publicView && (
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-evo-green/5 via-transparent to-evo-accent/5"
            aria-hidden="true"
          />
        )}
        <div className="relative z-10 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[.18em] text-evo-accent">
            {publicView ? "Mercado brasileiro" : "Caderno de mercado / B3"}
          </p>
          <h1
            className={
              publicView
                ? "mt-2 text-2xl font-bold tracking-tight text-evo-textMain"
                : "mt-3 text-3xl font-semibold leading-tight tracking-[-.04em] text-evo-textMain sm:text-5xl"
            }
          >
            {publicView
              ? "Ativos negociados na B3"
              : "O mercado, em perspectiva."}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-evo-textSec">
            Pesquise ações, units, fundos, ETFs e BDRs. Os preços são
            informativos e não representam execução de ordens nem recomendação
            de investimento.
          </p>
        </div>
        <div
          className={`relative z-10 shrink-0 ${publicView ? "self-end sm:self-center" : "self-start opacity-80"}`}
        >
          <OrbitCoins variant="real" size="sm" />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(16rem,1fr)_auto_auto]">
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
        <label className="sr-only" htmlFor="asset-type">
          Tipo de ativo
        </label>
        <select
          id="asset-type"
          value={type}
          onChange={(event) => {
            setType(event.target.value);
            setPage(1);
          }}
          className="min-h-11 rounded-lg border border-evo-border bg-evo-bgSec px-3 text-sm text-evo-textMain"
        >
          {assetTypes.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
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
        <p
          role="alert"
          className="rounded-lg border border-evo-red/20 bg-evo-red/5 p-3 text-sm text-evo-red"
        >
          {error}
        </p>
      )}
      {favoriteError && (
        <p
          role="alert"
          className="rounded-lg border border-evo-red/20 bg-evo-red/5 p-3 text-sm text-evo-red"
        >
          {favoriteError}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-evo-textSec">
        <span>
          {loading
            ? "Carregando ativos…"
            : `${total.toLocaleString("pt-BR")} ativos encontrados`}
        </span>
        {requestedAt && (
          <span className="text-xs">
            Consulta ao provedor:{" "}
            {new Date(requestedAt).toLocaleString("pt-BR")}
          </span>
        )}
      </div>

      {publicView ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {assets.map((asset) => {
            const percentage =
              asset.changePercent === null ? null : Number(asset.changePercent);
            const favorite = isFavorito(asset.symbol);
            return (
              <Card
                key={asset.symbol}
                glow="none"
                className="relative flex flex-col gap-4"
              >
                {user ? (
                  <button
                    type="button"
                    aria-label={
                      favorite
                        ? `Remover ${asset.symbol} dos favoritos`
                        : `Adicionar ${asset.symbol} aos favoritos`
                    }
                    aria-pressed={favorite}
                    onClick={() => void toggleFavorito(asset.symbol)}
                    className={`absolute right-4 top-4 rounded p-1 ${favorite ? "text-yellow-400" : "text-evo-textSec hover:text-yellow-400"}`}
                  >
                    <Star size={18} fill={favorite ? "currentColor" : "none"} />
                  </button>
                ) : (
                  <Link
                    to="/entrar"
                    title="Entre para salvar nos favoritos"
                    className="absolute right-4 top-4 rounded p-1 text-evo-textSec"
                  >
                    <Star size={18} />
                  </Link>
                )}
                <div className="pr-8">
                  <h2 className="font-bold text-evo-textMain">
                    {asset.symbol}
                  </h2>
                  <p className="mt-1 line-clamp-2 min-h-8 text-xs text-evo-textSec">
                    {asset.name}
                  </p>
                </div>
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <span className="block text-[11px] text-evo-textSec">
                      Preço informado
                    </span>
                    <strong className="font-numbers text-xl">
                      {money.format(Number(asset.price))}
                    </strong>
                  </div>
                  <p
                    className={`flex items-center gap-1 text-sm font-medium ${percentage === null ? "text-evo-textSec" : percentage >= 0 ? "text-evo-green" : "text-evo-red"}`}
                  >
                    {percentage === null ? (
                      "—"
                    ) : (
                      <>
                        {percentage >= 0 ? (
                          <ArrowUp size={14} />
                        ) : (
                          <ArrowDown size={14} />
                        )}
                        {percentage > 0 ? "+" : ""}
                        {percentage.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                        %
                      </>
                    )}
                  </p>
                </div>
                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-evo-border pt-3 text-[11px] text-evo-textSec">
                  <span>{asset.sector || asset.subType || "B3"}</span>
                  <span>
                    {asset.volume
                      ? `Volume ${Number(asset.volume).toLocaleString("pt-BR")}`
                      : "Volume indisponível"}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div aria-busy={loading}>
          <div
            aria-hidden="true"
            className="hidden grid-cols-[minmax(0,1.3fr)_minmax(8rem,.8fr)_minmax(7rem,.6fr)_minmax(8rem,.8fr)_3rem] gap-5 border-b border-evo-border pb-3 text-[11px] font-medium uppercase tracking-[.13em] text-evo-textSec md:grid"
          >
            <span>Ativo / setor</span>
            <span className="text-right">Preço informado</span>
            <span className="text-right">Variação</span>
            <span className="text-right">Volume informado</span>
            <span className="sr-only">Favorito</span>
          </div>
          <ul
            aria-label="Ativos encontrados"
            className="divide-y divide-evo-border border-b border-evo-border"
          >
            {assets.map((asset) => {
              const percentage =
                asset.changePercent === null
                  ? null
                  : Number(asset.changePercent);
              const favorite = isFavorito(asset.symbol);
              return (
                <li
                  key={asset.symbol}
                  className="grid grid-cols-[minmax(0,1fr)_auto_2.75rem] items-center gap-x-3 gap-y-3 py-5 transition-colors hover:bg-evo-bgSec/30 md:grid-cols-[minmax(0,1.3fr)_minmax(8rem,.8fr)_minmax(7rem,.6fr)_minmax(8rem,.8fr)_3rem] md:gap-x-5 md:py-6"
                >
                  <div className="col-start-1 row-start-1 min-w-0">
                    <h2 className="text-base font-semibold tracking-tight text-evo-textMain">
                      {asset.symbol}
                    </h2>
                    <p
                      className="mt-1 truncate text-xs text-evo-textSec"
                      title={asset.name}
                    >
                      {asset.name}
                    </p>
                    <p className="mt-1 hidden text-[11px] text-evo-textSec/75 md:block">
                      {asset.sector || asset.subType || "B3"}
                    </p>
                  </div>
                  <p className="col-start-2 row-start-1 text-right">
                    <span className="sr-only">Preço informado: </span>
                    <strong className="font-numbers text-base font-medium text-evo-textMain sm:text-lg">
                      {money.format(Number(asset.price))}
                    </strong>
                  </p>
                  <p
                    className={`col-start-2 row-start-2 flex items-center justify-end gap-1 whitespace-nowrap font-numbers text-xs font-medium md:col-start-3 md:row-start-1 md:text-sm ${percentage === null ? "text-evo-textSec" : percentage >= 0 ? "text-evo-green" : "text-evo-red"}`}
                  >
                    <span className="sr-only">Variação informada: </span>
                    {percentage === null ? (
                      "Indisponível"
                    ) : (
                      <>
                        {percentage >= 0 ? (
                          <ArrowUp size={14} aria-hidden="true" />
                        ) : (
                          <ArrowDown size={14} aria-hidden="true" />
                        )}
                        {percentage > 0 ? "+" : ""}
                        {percentage.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                        %
                      </>
                    )}
                  </p>
                  <p className="col-start-1 row-start-2 text-[11px] text-evo-textSec md:col-start-4 md:row-start-1 md:text-right md:text-xs">
                    <span className="md:hidden">Volume </span>
                    <span className="sr-only hidden md:inline">
                      Volume informado:{" "}
                    </span>
                    {asset.volume !== null
                      ? Number(asset.volume).toLocaleString("pt-BR")
                      : "indisponível"}
                  </p>
                  <div className="col-start-3 row-start-1 flex justify-end md:col-start-5">
                    {user ? (
                      <button
                        type="button"
                        aria-label={
                          favorite
                            ? `Remover ${asset.symbol} dos favoritos`
                            : `Adicionar ${asset.symbol} aos favoritos`
                        }
                        aria-pressed={favorite}
                        onClick={() => void toggleFavorito(asset.symbol)}
                        className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-full transition-colors hover:bg-evo-bgSec ${favorite ? "text-yellow-400" : "text-evo-textSec hover:text-yellow-400"}`}
                      >
                        <Star
                          size={18}
                          fill={favorite ? "currentColor" : "none"}
                          aria-hidden="true"
                        />
                      </button>
                    ) : (
                      <Link
                        to="/entrar"
                        aria-label={`Entre para salvar ${asset.symbol} nos favoritos`}
                        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-evo-textSec hover:bg-evo-bgSec"
                      >
                        <Star size={18} aria-hidden="true" />
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {!loading && assets.length === 0 && !error && (
        <p className="border-y border-evo-border py-10 text-sm text-evo-textSec">
          Nenhum ativo corresponde à sua busca.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-evo-border pt-4">
        <p className="max-w-3xl text-xs leading-relaxed text-evo-textSec">
          Fonte: brapi.dev. Os preços podem ter atraso ou indisponibilidade.
          “Consulta ao provedor” indica quando a lista foi consultada; não
          garante o horário exato da negociação.
        </p>
        <nav
          aria-label="Paginação dos ativos"
          className="flex items-center gap-2"
        >
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-evo-border px-3 text-sm text-evo-textMain disabled:opacity-40"
          >
            <ArrowLeft size={15} /> Anterior
          </button>
          <span className="text-xs text-evo-textSec">
            Página {page} de {pages}
          </span>
          <button
            type="button"
            disabled={page >= pages || loading}
            onClick={() => setPage((current) => Math.min(pages, current + 1))}
            className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-evo-border px-3 text-sm text-evo-textMain disabled:opacity-40"
          >
            Próxima <ArrowRight size={15} />
          </button>
        </nav>
      </div>
    </section>
  );
}
