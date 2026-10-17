import { useRankingPublication } from "../hooks/useRankingPublication";
import { useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import {
  ArrowUpRight,
  BookOpen,
  FileSpreadsheet,
  Search,
  Upload,
  RotateCcw,
  X,
} from "lucide-react";
import { Card } from "../components/Card";
import { RankingFundamentals } from "../components/RankingFundamentals";
import { CompanyLogo } from "../components/CompanyLogo";
import type { Entry } from "../lib/ranking";
import { ApiError } from "../lib/api";
import { useAuth } from "../context/authContext";
import { rankingDemoEntries } from "../lib/rankingDemo";
import { RankingAccessLanding } from "../components/RankingAccessLanding";
import { OrbitCoins } from "../components/OrbitCoins";
import { MobileDisclosure } from "../components/MobileDisclosure";
import { ResearchEditor } from "../components/ResearchEditor";
import { PublicationReview } from "../components/PublicationReview";
import { getResearchCoverage } from "../lib/researchCoverage";
import { userCan } from "../lib/permissions";
import {
  CompanyComparison,
  VersionComparison,
} from "../components/ResearchTools";
import "./income-ranking.css";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const noEntries: Entry[] = [];
const rankingFilterKeys = ["busca", "setor", "prazo", "ordem"] as const;
type RankingFilterKey = (typeof rankingFilterKeys)[number];
const date = (value: string) =>
  new Date(
    value.replace(" ", "T") + (value.endsWith("Z") ? "" : "Z"),
  ).toLocaleString("pt-BR");
const input =
  "min-h-11 w-full rounded-lg border border-evo-border bg-evo-bgMain px-3 text-base sm:text-sm";
const button =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-evo-primary px-4 text-sm font-semibold text-white hover:bg-evo-primaryHover disabled:opacity-50";
export function IncomeRanking() {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <p role="status" className="p-8 text-center text-sm text-evo-textSec">
        Verificando seu acesso ao ranking…
      </p>
    );
  if (!user) return <RankingAccessLanding />;
  return <MemberIncomeRanking key={user.id + ":" + user.role} />;
}

function MemberIncomeRanking() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const { user, refreshSession } = useAuth();
  const publication = /^\d{1,20}$/.test(searchParams.get("publication") || "")
    ? searchParams.get("publication") || ""
    : "";
  const {
    ranking,
    loading,
    error,
    setError,
    load,
    applyRanking,
    setLoading,
    setLoadedFor,
    requestKey,
    current,
  } = useRankingPublication(publication);
  const [message, setMessage] = useState("");
  const search = (searchParams.get("busca") || "").slice(0, 80);
  const requestedSector = (searchParams.get("setor") || "").slice(0, 120);
  const requestedHorizon = searchParams.get("prazo") || "";
  const horizon = ["6", "12", "24"].includes(requestedHorizon)
    ? requestedHorizon
    : "";
  const requestedSort = searchParams.get("ordem") || "rank";
  const sort = ["rank", "potential", "name"].includes(requestedSort)
    ? requestedSort
    : "rank";
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Entry[]>([]);
  const [busy, setBusy] = useState(false);
  const [metadata, setMetadata] = useState({
    title: "",
    authorName: "",
    professionalCategory: "",
    professionalRegistration: "",
  });
  const displayMode = searchParams.get("visual");
  const showingDemo =
    displayMode === "demo" ||
    (displayMode !== "real" &&
      !loading &&
      !error &&
      !publication &&
      ranking.entries.length === 0);
  const sourceEntries: Entry[] = showingDemo
    ? rankingDemoEntries
    : current
      ? ranking.entries
      : noEntries;
  const totalEntries = showingDemo
    ? rankingDemoEntries.length
    : current
      ? (ranking.totalEntries ?? ranking.entries.length)
      : 0;
  const changeView = (mode: "demo" | "real", resetPublication = false) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      rankingFilterKeys.forEach((key) => next.delete(key));
      next.set("visual", mode);
      if (resetPublication) next.delete("publication");
      return next;
    });
  };
  const sectors = [
    ...new Set(
      sourceEntries.map((e) => e.sector).filter((s): s is string => Boolean(s)),
    ),
  ].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const sector = sectors.includes(requestedSector) ? requestedSector : "";
  const researchLink = (ticker: string) => {
    const params = new URLSearchParams(searchParams);
    rankingFilterKeys.forEach((key) => params.delete(key));
    if (search.trim()) params.set("busca", search.trim());
    if (sector) params.set("setor", sector);
    if (horizon) params.set("prazo", horizon);
    if (sort !== "rank") params.set("ordem", sort);
    params.set("visual", showingDemo ? "demo" : "real");
    if (showingDemo) params.delete("publication");
    else if (ranking.id || publication)
      params.set("publication", ranking.id || publication);
    const base = location.pathname.startsWith("/app/")
      ? "/app/ranking/acao/"
      : "/ranking/acao/";
    return base + encodeURIComponent(ticker) + "?" + params.toString();
  };
  const changeFilter = (key: RankingFilterKey, value: string) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (!value || (key === "ordem" && value === "rank")) next.delete(key);
        else next.set(key, value);
        return next;
      },
      { replace: true, preventScrollReset: true },
    );
  };
  const hasFilters = Boolean(search.trim() || sector || horizon);
  const clearFilters = () => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        rankingFilterKeys.forEach((key) => next.delete(key));
        return next;
      },
      { replace: true, preventScrollReset: true },
    );
  };
  const activeFilters: { key: RankingFilterKey; label: string }[] = [
    ...(search.trim()
      ? [{ key: "busca" as const, label: `Busca: ${search.trim()}` }]
      : []),
    ...(sector ? [{ key: "setor" as const, label: `Setor: ${sector}` }] : []),
    ...(horizon
      ? [{ key: "prazo" as const, label: `Até ${horizon} meses` }]
      : []),
    ...(sort !== "rank"
      ? [
          {
            key: "ordem" as const,
            label:
              sort === "name"
                ? "Nome da empresa"
                : showingDemo
                  ? "Maior potencial simulado"
                  : "Maior potencial informado",
          },
        ]
      : []),
  ];
  const learningPath = location.pathname.startsWith("/app/")
    ? "/app/aprender"
    : "/aprender";
  const entries = sourceEntries
    .filter(
      (e) =>
        (!search.trim() ||
          (e.ticker + " " + e.companyName)
            .toLocaleLowerCase("pt-BR")
            .includes(search.trim().toLocaleLowerCase("pt-BR"))) &&
        (!sector || e.sector === sector) &&
        (!horizon ||
          (e.horizonMonths !== null && e.horizonMonths <= Number(horizon))),
    )
    .sort((a, b) =>
      sort === "potential"
        ? Number(b.expectedReturnPercent) - Number(a.expectedReturnPercent) ||
          a.rank - b.rank
        : sort === "name"
          ? a.companyName.localeCompare(b.companyName, "pt-BR") ||
            a.rank - b.rank
          : a.rank - b.rank,
    );
  const retryPublication = async () => {
    setLoading(true);
    setError("");
    try {
      applyRanking(await load());
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401)
        void refreshSession().catch(() => {});
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível carregar esta publicação.",
      );
    } finally {
      setLoading(false);
      setLoadedFor(requestKey);
    }
  };
  const sendFile = async (publish: boolean) => {
    if (!file) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (file.size > 1024 * 1024 || !/\.(csv|xlsx)$/i.test(file.name))
        throw new Error("Use CSV UTF-8 ou .xlsx de até 1 MB.");
      const response = await fetch(
        "/api/rankings" + (publish ? "" : "/preview"),
        {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": file.name.toLowerCase().endsWith(".xlsx")
              ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              : "text/csv",
            "X-File-Name": encodeURIComponent(file.name),
            "X-Publication-Meta": encodeURIComponent(JSON.stringify(metadata)),
          },
          body: file,
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new ApiError(
          result.error || "Não foi possível ler o arquivo.",
          response.status,
        );
      if (publish) {
        setMessage(result.message);
        setPreview([]);
        setFile(null);
        changeView("real", true);
        if (!publication) {
          await applyRanking(await load());
          setLoading(false);
          setLoadedFor(requestKey);
        }
      } else setPreview(result.entries);
    } catch (reason) {
      if (
        reason instanceof ApiError &&
        (reason.status === 401 || reason.status === 403)
      )
        void refreshSession().catch(() => {});
      setError(
        reason instanceof Error ? reason.message : "Falha na importação.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <section
      id="pagina-conteudo"
      className="ranking-page mx-auto max-w-7xl space-y-3 px-4 py-4 sm:space-y-6 sm:px-6"
    >
      <section className="section-masthead">
        <div className="ranking-heading mobile-page-heading flex items-start justify-between gap-3 sm:gap-4 sm:items-center">
          <div className="min-w-0 flex-1">
            <p className="edition-label">
              {showingDemo
                ? "Demonstração · dados fictícios"
                : "Pesquisa de ações"}
            </p>
            <h1 className="display-title mt-3 text-3xl sm:text-5xl">
              Ranking de previsões
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-evo-textSec sm:text-base">
              {showingDemo ? (
                "Abra uma empresa de exemplo para ler a tese e os números."
              ) : (
                <>Leia as previsões e o que sustenta cada cenário.</>
              )}
            </p>
            <div className="ranking-header-actions mt-5 flex flex-wrap gap-2 sm:gap-3">
              <Link
                to={learningPath + "#ranking"}
                className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-evo-accent"
              >
                <BookOpen size={17} aria-hidden="true" />
                <span className="sm:hidden">Como ler</span>
                <span className="hidden sm:inline">
                  Como interpretar o ranking
                </span>
              </Link>
              <button
                type="button"
                className="min-h-11 rounded-lg border border-evo-border px-4 text-sm font-semibold hover:border-evo-accent/50"
                onClick={() => changeView(showingDemo ? "real" : "demo")}
              >
                <span className="sm:hidden">
                  {showingDemo ? "Publicações" : "Ver exemplo"}
                </span>
                <span className="hidden sm:inline">
                  {showingDemo
                    ? "Ver publicações da equipe"
                    : "Explorar demonstração"}
                </span>
              </button>
              <Link
                to="/metodologia"
                className="inline-flex min-h-11 items-center text-sm text-evo-textSec underline hover:text-evo-accent"
              >
                <span className="sm:hidden">Metodologia</span>
                <span className="hidden sm:inline">
                  Como funciona a pesquisa
                </span>
              </Link>
            </div>
          </div>
          <div className="ranking-header-visual shrink-0 self-start sm:self-center">
            <OrbitCoins variant="ranking" size="sm" />
          </div>
        </div>
      </section>
      <MobileDisclosure
        title="Como ler o ranking"
        contentClassName="sm:grid sm:grid-cols-3 sm:gap-4"
      >
        {[
          [
            "01",
            "Entenda a tese",
            "Abra a empresa para conhecer as premissas que sustentam o cenário.",
          ],
          [
            "02",
            "Leia os riscos",
            "Confira o que pode contrariar a previsão antes de comparar percentuais.",
          ],
          [
            "03",
            "Confira a versão",
            "Use o prazo, a data e as fontes da publicação para dar contexto aos números.",
          ],
        ].map(([number, title, text]) => (
          <div key={number} className="mb-3 flex items-start gap-3 sm:mb-0">
            <span
              className="pt-0.5 font-numbers text-sm text-evo-accent"
              aria-hidden="true"
            >
              {number}
            </span>
            <div>
              <h2 className="text-sm font-semibold">{title}</h2>
              <p className="mt-1 text-xs leading-5 text-evo-textSec">{text}</p>
            </div>
          </div>
        ))}
      </MobileDisclosure>
      {error && (
        <div className="notice-error">
          <p role="alert">{error}</p>
          <button
            type="button"
            disabled={loading || busy}
            onClick={() => void retryPublication()}
            className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold underline disabled:opacity-50"
          >
            <RotateCcw size={15} aria-hidden="true" /> Recarregar publicação
          </button>
        </div>
      )}
      {message && (
        <p role="status" className="notice-success">
          {message}
        </p>
      )}
      {userCan(user, "rankings:write") && ranking.canManage && (
        <details
          id="publicar-pesquisa"
          open={location.hash === "#publicar-pesquisa"}
          className="scroll-mt-28 rounded-xl border border-evo-border bg-evo-card p-5"
        >
          <summary className="cursor-pointer font-semibold">
            Área da equipe · preparar nova publicação
          </summary>
          <p className="mt-3 text-sm text-evo-textSec">
            Primeira aba do Excel ou CSV UTF-8. Até 300 ativos. Revise todos os
            dados antes de publicar. Cada publicação preserva a versão anterior.
          </p>
          <a
            href="/modelos/ranking.csv"
            download
            className="mt-2 inline-block text-sm text-evo-accent underline"
          >
            Baixar modelo de planilha
          </a>
          <p className="mt-3 text-sm leading-relaxed text-evo-textSec">
            O modelo inclui balanço patrimonial, DRE, fluxo de caixa,
            informações da empresa, dívida líquida e estatísticas. Preencha cada
            módulo como texto, com os valores, unidades e datas que deseja
            exibir. Período e fonte também são opcionais. Campos vazios aparecem
            como não informados.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {(
              [
                "title",
                "authorName",
                "professionalCategory",
                "professionalRegistration",
              ] as const
            ).map((key, i) => (
              <label key={key} className="text-sm">
                {
                  [
                    "Título da publicação",
                    "Nome profissional (opcional)",
                    "Categoria profissional (opcional)",
                    "Registro profissional (opcional)",
                  ][i]
                }
                <input
                  className={input + " mt-1"}
                  disabled={busy}
                  maxLength={key === "title" ? 160 : 120}
                  value={metadata[key]}
                  onChange={(e) => {
                    setMetadata((current) => ({
                      ...current,
                      [key]: e.target.value,
                    }));
                    setPreview([]);
                  }}
                />
              </label>
            ))}
          </div>
          <ResearchEditor
            metadata={metadata}
            onContentChange={() => {
              setFile(null);
              setPreview([]);
            }}
            onMetadata={(value) => {
              setMetadata(value);
              setFile(null);
              setPreview([]);
            }}
            disabled={busy}
            onPrepare={(draftFile) => {
              setFile(draftFile);
              setPreview([]);
              setMessage("");
              setError("");
            }}
          />
          <label className="mt-4 block text-sm">
            Planilha CSV ou Excel
            <input
              type="file"
              accept=".csv,.xlsx"
              disabled={busy}
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                setPreview([]);
                setMessage("");
              }}
              className="mt-2 block max-w-full text-sm"
            />
          </label>
          {file && (
            <p className="mt-2 text-xs text-evo-textSec">
              Arquivo para a próxima prévia: {file.name}
            </p>
          )}
          <button
            className={button + " mt-4"}
            disabled={!file || busy || loading}
            onClick={() => void sendFile(false)}
          >
            <FileSpreadsheet size={16} />
            {busy ? "Processando…" : "Validar e ver prévia"}
          </button>
          {preview.length > 0 && (
            <section className="mt-5 space-y-3">
              <h2 className="font-semibold">Prévia · {preview.length} ações</h2>
              <PublicationReview entries={preview} metadata={metadata} />
              <div className="max-h-72 overflow-auto rounded-lg border border-evo-border">
                <table className="w-full min-w-[500px] text-left text-sm">
                  <caption className="sr-only">Ativos a publicar</caption>
                  <thead>
                    <tr>
                      <th className="p-3">Ativo</th>
                      <th>Potencial</th>
                      <th>Prazo</th>
                      <th>Tese / riscos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((e) => (
                      <tr key={e.ticker} className="border-t border-evo-border">
                        <td className="p-3">
                          <span className="company-identity-inline">
                            <CompanyLogo ticker={e.ticker} size="sm" />
                            {e.ticker}
                          </span>
                        </td>
                        <td>{e.expectedReturnPercent}%</td>
                        <td>{e.horizonMonths ?? "—"}</td>
                        <td>
                          <details>
                            <summary className="cursor-pointer py-3">
                              Ver tese e riscos
                            </summary>
                            <p className="max-w-lg whitespace-pre-wrap p-2">
                              {e.thesis || "Sem tese"}
                            </p>
                            <p className="max-w-lg whitespace-pre-wrap p-2">
                              {e.risks || "Sem riscos"}
                            </p>
                            <RankingFundamentals data={e} />
                          </details>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-evo-textSec">
                Dados profissionais não preenchidos aparecerão como não
                informados. O conteúdo da prévia corresponde ao arquivo
                selecionado.
              </p>
              <button
                className={button}
                disabled={busy}
                onClick={() => void sendFile(true)}
              >
                <Upload size={16} /> Confirmar e publicar esta versão
              </button>
            </section>
          )}
        </details>
      )}
      {!loading && !error && (
        <div className="ranking-comparison">
          <CompanyComparison
            key={showingDemo ? "demo" : ranking.id || "empty"}
            entries={sourceEntries}
            demo={showingDemo}
          />
        </div>
      )}
      {!loading && !error && !showingDemo && current && (
        <div className="ranking-comparison">
          <VersionComparison
            key={ranking.id}
            publicationId={ranking.id}
            history={ranking.history}
          />
        </div>
      )}
      <section className="space-y-3 sm:space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">
              {showingDemo
                ? "Explore os cenários de exemplo"
                : current
                  ? ranking.title
                  : "Pesquisa selecionada"}
            </h2>
            {!showingDemo && (
              <p className="mt-1 text-xs text-evo-textSec">
                {!current
                  ? loading
                    ? "Carregando a versão selecionada…"
                    : "Pesquisa indisponível"
                  : ranking.updatedAt
                    ? "Publicado em " + date(ranking.updatedAt)
                    : "Aguardando a primeira publicação"}
              </p>
            )}
          </div>
          {!showingDemo && (
            <label className="text-xs text-evo-textSec">
              Histórico de publicações
              <select
                className={input + " mt-1"}
                value={publication}
                onChange={(e) => {
                  const selected = e.target.value;
                  setLoading(true);
                  setSearchParams((current) => {
                    const next = new URLSearchParams(current);
                    if (selected) next.set("publication", selected);
                    else next.delete("publication");
                    return next;
                  });
                }}
              >
                <option value="">Publicação mais recente</option>
                {ranking.history.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.title} · {date(h.createdAt)}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        {!showingDemo && current && (
          <MobileDisclosure
            title="Responsável pela publicação"
            contentClassName="grid gap-3 rounded-xl border border-evo-border bg-evo-card p-4 text-sm sm:grid-cols-3"
          >
            <p>
              Responsável
              <br />
              <strong>{ranking.authorName || "Não informado"}</strong>
            </p>
            <p>
              Categoria profissional
              <br />
              <strong>{ranking.professionalCategory || "Não informada"}</strong>
            </p>
            <p>
              Registro profissional
              <br />
              <strong>
                {ranking.professionalRegistration || "Não informado"}
              </strong>
            </p>
          </MobileDisclosure>
        )}
        <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_3fr]">
          <label className="relative flex min-w-0 items-center gap-2 rounded-lg border border-evo-border bg-evo-bgMain px-3">
            <Search size={17} aria-hidden="true" />
            <span className="sr-only">Buscar empresa ou ticker</span>
            <input
              value={search}
              onChange={(e) =>
                changeFilter("busca", e.target.value.slice(0, 80))
              }
              maxLength={80}
              autoComplete="off"
              enterKeyHint="search"
              placeholder="Empresa ou ticker"
              className="min-h-11 min-w-0 w-full bg-transparent text-base outline-none focus-visible:ring-2 focus-visible:ring-evo-accent sm:text-sm"
            />
          </label>
          <MobileDisclosure
            title={`Filtros e ordenação${sector || horizon || sort !== "rank" ? " · ativos" : ""}`}
            contentClassName="grid min-w-0 gap-3 sm:grid-cols-3"
          >
            <select
              aria-label="Filtrar setor"
              className={input}
              value={sector}
              onChange={(e) => changeFilter("setor", e.target.value)}
            >
              <option value="">Todos os setores</option>
              {sectors.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <select
              aria-label="Filtrar horizonte"
              className={input}
              value={horizon}
              onChange={(e) => changeFilter("prazo", e.target.value)}
            >
              <option value="">Todos os prazos</option>
              <option value="6">Até 6 meses</option>
              <option value="12">Até 12 meses</option>
              <option value="24">Até 24 meses</option>
            </select>
            <select
              aria-label="Ordenar ranking"
              className={input}
              value={sort}
              onChange={(e) => changeFilter("ordem", e.target.value)}
            >
              <option value="rank">
                {showingDemo ? "Ordem da demonstração" : "Ordem da publicação"}
              </option>
              <option value="potential">
                {showingDemo
                  ? "Maior potencial simulado"
                  : "Maior potencial informado"}
              </option>
              <option value="name">Nome da empresa</option>
            </select>
          </MobileDisclosure>
        </div>
        {activeFilters.length > 0 && (
          <ul
            aria-label="Filtros e ordenação ativos"
            className="flex flex-wrap gap-2"
          >
            {activeFilters.map((filter) => (
              <li key={filter.key} className="min-w-0 max-w-full">
                <button
                  type="button"
                  onClick={() => changeFilter(filter.key, "")}
                  aria-label={`Remover ${filter.label}`}
                  className="inline-flex min-h-11 min-w-11 max-w-full items-center gap-2 rounded-lg border border-evo-border bg-evo-bgSec px-3 py-2 text-left text-xs text-evo-textMain hover:border-evo-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-evo-accent"
                >
                  <span className="min-w-0 break-words">{filter.label}</span>
                  <X
                    size={14}
                    className="shrink-0 text-evo-textSec"
                    aria-hidden="true"
                  />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p
            role="status"
            aria-live="polite"
            className="text-xs text-evo-textSec"
          >
            {loading && !showingDemo
              ? "Carregando pesquisas…"
              : `${entries.length} de ${totalEntries} `}
            {loading && !showingDemo
              ? ""
              : showingDemo
                ? "empresas de exemplo"
                : "ações"}
          </p>
          {(hasFilters || sort !== "rank") && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-evo-accent hover:underline"
            >
              <RotateCcw size={14} aria-hidden="true" /> Limpar filtros
            </button>
          )}
        </div>
        {loading && !showingDemo ? (
          <Card>
            <p role="status" className="text-sm text-evo-textSec">
              Buscando as pesquisas da versão selecionada…
            </p>
            <div
              aria-hidden="true"
              className="mt-5 space-y-5 motion-safe:animate-pulse"
            >
              {[0, 1, 2].map((item) => (
                <div key={item} className="border-t border-evo-border pt-4">
                  <div className="h-4 w-32 rounded bg-evo-border/60" />
                  <div className="mt-3 h-3 w-3/4 rounded bg-evo-border/40" />
                  <div className="mt-2 h-3 w-1/2 rounded bg-evo-border/40" />
                </div>
              ))}
            </div>
          </Card>
        ) : !showingDemo && !current ? (
          <div className="border-y border-evo-border py-8 text-sm text-evo-textSec">
            <p role="status">
              A pesquisa desta versão não está disponível agora. Escolha outra
              publicação no histórico ou tente carregar novamente.
            </p>
            <button
              type="button"
              onClick={() => void retryPublication()}
              className="mt-3 min-h-11 font-semibold text-evo-accent underline"
            >
              Tentar novamente
            </button>
          </div>
        ) : !sourceEntries.length ? (
          <Card>
            <h3 className="font-semibold">
              A primeira análise ainda não foi publicada
            </h3>
            <p className="mt-2 text-sm text-evo-textSec">
              Enquanto isso, conheça os conceitos usados para avaliar cenários.
            </p>
            <Link
              to={learningPath}
              className="mt-4 inline-block text-evo-accent underline"
            >
              Começar a aprender
            </Link>
          </Card>
        ) : !entries.length ? (
          <Card>
            <h3 className="font-semibold">Nenhuma ação corresponde à busca</h3>
            <p className="mt-2 text-sm text-evo-textSec">
              Tente outro nome ou ticker, amplie o prazo ou consulte todos os
              setores desta publicação.
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-evo-accent underline"
            >
              <RotateCcw size={15} aria-hidden="true" /> Mostrar todas as
              pesquisas
            </button>
          </Card>
        ) : (
          <div className="research-ranking">
            <div className="research-ranking-heading" aria-hidden="true">
              <span>Pos.</span>
              <span>Empresa / setor</span>
              <span className="text-right">
                {showingDemo ? "Potencial simulado" : "Potencial informado"}
              </span>
              <span className="text-right">
                {showingDemo ? "Preço-alvo simulado" : "Preço-alvo informado"}
              </span>
              <span className="text-right">Horizonte</span>
              <span />
            </div>
            <ol
              className="divide-y divide-evo-border border-y border-evo-border"
              aria-label="Pesquisas de ações"
            >
              {entries.map((entry) => {
                const coverage = getResearchCoverage(entry);
                return (
                  <li key={entry.ticker}>
                    <article>
                      <Link
                        to={researchLink(entry.ticker)}
                        className="research-ranking-row group transition-colors hover:bg-evo-accent/5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-evo-accent"
                        aria-label={
                          "Abrir pesquisa de " +
                          entry.companyName +
                          " (" +
                          entry.ticker +
                          ")"
                        }
                      >
                        <span
                          className="research-ranking-position font-numbers text-lg text-evo-textSec"
                          aria-hidden="true"
                        >
                          {String(entry.rank).padStart(2, "0")}
                        </span>
                        <div className="research-ranking-company min-w-0">
                          <div className="company-identity">
                            <CompanyLogo
                              ticker={entry.ticker}
                              demo={showingDemo}
                            />
                            <h3 className="break-words text-xl font-semibold group-hover:text-evo-accent">
                              {entry.ticker}
                              <span className="mt-1 block text-sm font-normal text-evo-textSec">
                                {entry.companyName}
                              </span>
                            </h3>
                          </div>
                          <p className="mt-2 text-xs text-evo-textSec">
                            {entry.sector || "Setor não informado"}
                            {showingDemo ? " · Empresa fictícia" : ""}
                          </p>
                          <p className="research-ranking-excerpt whitespace-pre-wrap break-words text-sm leading-relaxed text-evo-textSec">
                            {entry.thesis ||
                              "A justificativa ainda não foi informada pelo autor."}
                          </p>
                          <p className="research-ranking-coverage text-xs text-evo-textSec">
                            {coverage.filled}/{coverage.total} campos de leitura
                            preenchidos
                            {entry.referencePeriod
                              ? ` · ${entry.referencePeriod}`
                              : " · Período não informado"}
                          </p>
                        </div>
                        <ArrowUpRight
                          size={21}
                          className="research-ranking-arrow shrink-0 text-evo-accent"
                          aria-hidden="true"
                        />
                        <dl className="research-ranking-metrics">
                          <div>
                            <dt className="text-xs text-evo-textSec">
                              {showingDemo
                                ? "Potencial simulado"
                                : "Potencial informado"}
                            </dt>
                            <dd
                              className={`mt-1 font-numbers text-xl font-semibold ${Number(entry.expectedReturnPercent) < 0 ? "text-evo-red" : "text-evo-accent"}`}
                            >
                              {Number(
                                entry.expectedReturnPercent,
                              ).toLocaleString("pt-BR")}
                              %
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs text-evo-textSec">
                              {showingDemo
                                ? "Preço-alvo simulado"
                                : "Preço-alvo informado"}
                            </dt>
                            <dd className="mt-1 font-numbers text-lg">
                              {entry.targetPrice
                                ? money.format(Number(entry.targetPrice))
                                : "Não informado"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs text-evo-textSec">
                              Horizonte
                            </dt>
                            <dd className="mt-1 font-numbers text-lg">
                              {entry.horizonMonths
                                ? entry.horizonMonths + " meses"
                                : "Não informado"}
                            </dd>
                          </div>
                        </dl>
                        <span className="research-ranking-open inline-flex items-center gap-2 text-xs font-semibold text-evo-accent">
                          Ler tese, história e indicadores{" "}
                          <ArrowUpRight size={14} aria-hidden="true" />
                        </span>
                      </Link>
                    </article>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </section>
      {!showingDemo && current && ranking.sourceFileName && (
        <p className="text-xs text-evo-textSec">
          Origem: {ranking.sourceFileName}
        </p>
      )}
    </section>
  );
}
