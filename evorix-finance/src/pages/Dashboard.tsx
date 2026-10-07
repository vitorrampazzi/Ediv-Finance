import { useCallback, useEffect, useState } from "react";
import { ArrowRight, BookOpen, CircleAlert, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/authContext";
import { apiRequest } from "../lib/api";
import type { PortfolioData } from "../lib/portfolio";
import { formatQuantity } from "../lib/portfolio";
import { formatMoney, units } from "../lib/finance";
import { formatPercent } from "../lib/portfolioInsights";
import { PortfolioPulse } from "../components/PortfolioPulse";
import { OrbitCoins } from "../components/OrbitCoins";

export function Dashboard() {
  const { user } = useAuth();
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [declaredAmount, setDeclaredAmount] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback((signal?: AbortSignal) => {
    return Promise.allSettled([
      apiRequest<PortfolioData>("/api/portfolio", { signal }),
      apiRequest<{ declaredInvestedAmount: string | null }>(
        "/api/portfolio/preferences",
        { signal },
      ),
    ])
      .then(([data, preferences]) => {
        if (signal?.aborted) return;
        if (data.status === "rejected") throw data.reason;
        setError("");
        setPortfolio(data.value);
        setDeclaredAmount(
          preferences.status === "fulfilled"
            ? preferences.value.declaredInvestedAmount
            : null,
        );
      })
      .catch((reason: unknown) => {
        if (!signal?.aborted)
          setError(
            reason instanceof Error
              ? reason.message
              : "Não foi possível carregar sua carteira.",
          );
      })
      .finally(() => {
        if (!signal?.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      });
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);
  const firstName = user?.name.trim().split(/\s+/)[0] || "";
  return (
    <div className="mx-auto max-w-7xl space-y-10">
      <header className="flex items-start justify-between gap-5">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[.2em] text-evo-accent">
            Sua carteira, com contexto
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            {firstName
              ? firstName + ", esta é a sua visão geral."
              : "Esta é a sua visão geral."}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-evo-textSec">
            Os números vêm dos seus registros. A leitura conecta resultado,
            concentração e aprendizado.
          </p>
        </div>
        <div className="hidden shrink-0 sm:block" aria-hidden="true">
          <OrbitCoins variant="wealth" size="sm" />
        </div>
      </header>
      {error && (
        <p role="alert" className="notice-error flex items-start gap-2">
          <CircleAlert size={17} className="shrink-0" />
          {error}
        </p>
      )}
      <PortfolioPulse
        insights={portfolio?.insights}
        loading={loading}
        failed={Boolean(error)}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          void load();
        }}
      />
      {declaredAmount !== null && !error && (
        <p className="border-l-2 border-evo-border pl-4 text-xs leading-relaxed text-evo-textSec">
          Você informou um total investido de{" "}
          <strong className="font-medium text-evo-textMain">
            {formatMoney(declaredAmount)}
          </strong>{" "}
          no perfil. Essa declaração é separada dos custos e preços calculados
          pelas operações.
        </p>
      )}
      <section
        className="grid gap-6 border-y border-evo-border py-7 lg:grid-cols-[1fr_auto] lg:items-center"
        aria-labelledby="research-next-step"
      >
        <div>
          <p className="text-xs uppercase tracking-[.18em] text-evo-accent">
            Da carteira para o conhecimento
          </p>
          <h2 id="research-next-step" className="mt-3 text-xl font-semibold">
            Um preço sozinho não explica uma empresa.
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-evo-textSec">
            Estude as premissas, o horizonte e os riscos das pesquisas. Os
            exemplos continuam identificados quando são fictícios.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link className="action" to="/app/ranking">
            Explorar ranking <ArrowRight size={16} />
          </Link>
          <Link className="action-secondary" to="/app/aprender">
            <BookOpen size={16} /> Continuar aprendendo
          </Link>
        </div>
      </section>
      <section aria-labelledby="positions-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[.18em] text-evo-textSec">
              Seus registros
            </p>
            <h2 id="positions-heading" className="mt-2 text-xl font-semibold">
              Posições da carteira
            </h2>
          </div>
          <Link
            className="inline-flex min-h-11 items-center gap-2 text-sm text-evo-accent"
            to="/app/carteira"
          >
            Gerenciar carteira <ArrowRight size={16} />
          </Link>
        </div>
        <div className="mt-5 overflow-x-auto border-y border-evo-border">
          <table className="w-full min-w-[650px] text-left text-sm">
            <caption className="sr-only">
              Quantidade, custo, valor de mercado estimado e resultado não
              realizado por ativo
            </caption>
            <thead>
              <tr className="border-b border-evo-border text-xs font-normal text-evo-textSec">
                {[
                  "Ativo",
                  "Quantidade",
                  "Custo registrado",
                  "Valor estimado",
                  "Variação frente ao custo",
                ].map((label, index) => (
                  <th
                    key={label}
                    scope="col"
                    className={
                      "py-4 pr-4 font-medium " +
                      (index ? "text-right" : "text-left")
                    }
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-evo-border">
              {loading || error || !portfolio?.positions.length ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-10 text-center text-sm text-evo-textSec"
                  >
                    {loading
                      ? "Carregando posições…"
                      : error
                        ? "Posições indisponíveis agora."
                        : "Você ainda não tem posições abertas nos registros."}
                  </td>
                </tr>
              ) : (
                portfolio.positions.map((position) => {
                  const insight = portfolio.insights?.positions.find(
                    (item) => item.ticker === position.ticker,
                  );
                  return (
                    <tr key={position.ticker}>
                      <th
                        scope="row"
                        className="max-w-48 py-5 pr-4 font-medium"
                      >
                        <span>{position.ticker}</span>
                        <span className="mt-1 block truncate text-xs font-normal text-evo-textSec">
                          {position.assetName}
                        </span>
                      </th>
                      <td className="py-5 pr-4 text-right font-numbers text-xs">
                        {formatQuantity(position.quantity)}
                      </td>
                      <td className="py-5 pr-4 text-right font-numbers text-xs">
                        {formatMoney(position.costBasis)}
                      </td>
                      <td className="py-5 pr-4 text-right font-numbers text-xs">
                        {position.marketValue !== null
                          ? formatMoney(position.marketValue)
                          : "Sem cotação"}
                      </td>
                      <td
                        className={
                          "py-5 pr-4 text-right font-numbers text-xs " +
                          (position.unrealizedPnl === null
                            ? "text-evo-textSec"
                            : units(position.unrealizedPnl) >= 0n
                              ? "text-evo-green"
                              : "text-evo-red")
                        }
                      >
                        {position.unrealizedPnl !== null
                          ? formatMoney(position.unrealizedPnl)
                          : "—"}
                        <span className="mt-1 block text-[11px] text-evo-textSec">
                          {formatPercent(
                            insight?.unrealizedPnlPercent ?? null,
                            true,
                          )}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-evo-textSec">
          Quantidade registrada × preço recebido. Os horários e a
          disponibilidade seguem o provedor; não é saldo de corretora nem
          recomendação de investimento.
        </p>
      </section>
      <div className="flex flex-wrap gap-4 text-sm">
        <Link
          to="/app/perfil"
          className="inline-flex min-h-11 items-center text-evo-textSec underline"
        >
          Informar total investido
        </Link>
        <button
          onClick={() => {
            setRefreshing(true);
            void load();
          }}
          disabled={refreshing}
          className="inline-flex min-h-11 items-center gap-2 text-evo-textSec disabled:opacity-50"
        >
          <RefreshCw size={14} /> Atualizar leitura
        </button>
      </div>
    </div>
  );
}
