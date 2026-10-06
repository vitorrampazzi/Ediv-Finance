import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BookOpen, FileSpreadsheet, Search, Star, Upload } from "lucide-react";
import { Card } from "../components/Card";
import { RankingFundamentals } from "../components/RankingFundamentals";
import type { RankingFundamentalData } from "../components/RankingFundamentals";
import { apiRequest, ApiError } from "../lib/api";
import { useAuth } from "../context/authContext";
import { useFavoritos } from "../hooks/useFavoritos";
import { rankingDemoEntries } from "../lib/rankingDemo";
import { RankingAccessLanding } from "../components/RankingAccessLanding";
import { OrbitCoins } from "../components/OrbitCoins";
import { ResearchEditor } from "../components/ResearchEditor";
import { userCan } from "../lib/permissions";
import {
  CompanyComparison,
  VersionComparison,
  IndicatorHelp,
} from "../components/ResearchTools";

type Entry = RankingFundamentalData & {
  rank: number;
  ticker: string;
  companyName: string;
  expectedReturnPercent: string;
  targetPrice: string | null;
  horizonMonths: number | null;
  thesis: string | null;
  risks: string | null;
  sector: string | null;
  referencePrice?: string;
  revenueHistory?: { period: string; value: number }[];
};
type Ranking = {
  id: string | null;
  title: string;
  authorName: string | null;
  professionalCategory: string | null;
  professionalRegistration: string | null;
  entries: Entry[];
  updatedAt: string | null;
  sourceFileName: string | null;
  canManage: boolean;
  history: { id: string; title: string; createdAt: string }[];
  access?: "full";
  totalEntries?: number;
};
const empty: Ranking = {
  id: null,
  title: "Ranking de cenários",
  authorName: null,
  professionalCategory: null,
  professionalRegistration: null,
  entries: [],
  updatedAt: null,
  sourceFileName: null,
  canManage: false,
  history: [],
};
const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const date = (value: string) =>
  new Date(
    value.replace(" ", "T") + (value.endsWith("Z") ? "" : "Z"),
  ).toLocaleString("pt-BR");
const input =
  "min-h-11 w-full rounded-lg border border-evo-border bg-evo-bgMain px-3 text-sm";
const button =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-evo-primary px-4 text-sm font-semibold text-white hover:bg-evo-primaryHover disabled:opacity-50";
export function IncomeRanking() {
  const { user, loading } = useAuth();
  const [routeParams] = useSearchParams();
  if (loading)
    return (
      <p role="status" className="p-8 text-center text-sm text-evo-textSec">
        Verificando seu acesso ao ranking…
      </p>
    );
  if (!user) return <RankingAccessLanding />;
  return (
    <MemberIncomeRanking
      key={
        user.id + ":" + user.role + ":" + (routeParams.get("publication") || "")
      }
    />
  );
}

function MemberIncomeRanking() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: authLoading, refreshSession } = useAuth();
  const userId = user?.id;
  const { toggleFavorito, isFavorito, error: favoriteError } = useFavoritos();
  const [ranking, setRanking] = useState<Ranking>(empty);
  const [publication, setPublication] = useState(() =>
    /^\d{1,20}$/.test(searchParams.get("publication") || "")
      ? searchParams.get("publication") || ""
      : "",
  );
  const [requestLoading, setLoading] = useState(true);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const requestKey =
    (userId || "visitor") + ":" + (userId ? publication : "latest");
  const loading = requestLoading || authLoading || loadedFor !== requestKey;
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [sector, setSector] = useState("");
  const [horizon, setHorizon] = useState("");
  const [sort, setSort] = useState("rank");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Entry[]>([]);
  const [busy, setBusy] = useState(false);
  const [metadata, setMetadata] = useState({
    title: "",
    authorName: "",
    professionalCategory: "",
    professionalRegistration: "",
  });
  const load = useCallback(
    (signal?: AbortSignal) =>
      apiRequest<Ranking>(
        "/api/rankings" +
          (publication && userId
            ? "?publication=" + encodeURIComponent(publication)
            : ""),
        { signal },
      ),
    [publication, userId],
  );
  const applyRanking = useCallback((data: Ranking) => {
    setRanking(data);
    setError("");
  }, []);
  useEffect(() => {
    if (authLoading) return;
    const controller = new AbortController();
    load(controller.signal)
      .then(async (data) => {
        if (!controller.signal.aborted) await applyRanking(data);
      })
      .catch(async (reason) => {
        if (
          !controller.signal.aborted &&
          reason instanceof ApiError &&
          reason.status === 401
        ) {
          try {
            await refreshSession();
          } catch {
            if (!controller.signal.aborted)
              setError(
                "Não foi possível verificar sua sessão. Atualize a página e entre novamente.",
              );
          }
          return;
        }
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error
              ? reason.message
              : "Não foi possível carregar.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
          setLoadedFor(requestKey);
        }
      });
    return () => controller.abort();
  }, [load, applyRanking, authLoading, requestKey, refreshSession]);
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
    : ranking.entries;
  const totalEntries = showingDemo
    ? rankingDemoEntries.length
    : (ranking.totalEntries ?? ranking.entries.length);
  const changeView = (mode: "demo" | "real") => {
    setSearch("");
    setSector("");
    setHorizon("");
    setSort("rank");
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set("visual", mode);
      return next;
    });
  };
  const sectors = [
    ...new Set(
      sourceEntries.map((e) => e.sector).filter((s): s is string => Boolean(s)),
    ),
  ].sort();
  const entries = useMemo(
    () =>
      sourceEntries
        .filter(
          (e) =>
            (!search ||
              (e.ticker + " " + e.companyName)
                .toLowerCase()
                .includes(search.toLowerCase())) &&
            (!sector || e.sector === sector) &&
            (!horizon ||
              (e.horizonMonths !== null && e.horizonMonths <= Number(horizon))),
        )
        .sort((a, b) =>
          sort === "potential"
            ? Number(b.expectedReturnPercent) - Number(a.expectedReturnPercent)
            : sort === "name"
              ? a.companyName.localeCompare(b.companyName)
              : a.rank - b.rank,
        ),
    [sourceEntries, search, sector, horizon, sort],
  );
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
        setPublication("");
        changeView("real");
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
      className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 md:py-10"
    >
      <section className="rounded-2xl border border-evo-border bg-evo-card p-6 sm:p-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-evo-accent">
              Estudar cenários · entender riscos
            </p>
            <h1 className="mt-3 text-3xl font-bold">Ranking de previsões</h1>
            <p className="mt-3 max-w-3xl leading-relaxed text-evo-textSec">
              {showingDemo ? (
                "Conheça o formato da pesquisa: cenários, números e módulos de análise reunidos em uma demonstração com dados fictícios."
              ) : (
                <>
                  Explore as teses publicadas pela equipe, entenda os fatores
                  que podem favorecer ou contrariar cada cenário e acompanhe as
                  revisões ao longo do tempo.
                </>
              )}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/aprender#ranking" className={button}>
                <BookOpen size={17} /> Como interpretar o ranking
              </Link>
              <button
                type="button"
                className="min-h-11 rounded-lg border border-evo-border px-4 text-sm font-semibold hover:border-evo-accent/50"
                onClick={() => changeView(showingDemo ? "real" : "demo")}
              >
                {showingDemo
                  ? "Ver publicações da equipe"
                  : "Explorar demonstração"}
              </button>
              <span className="self-center text-xs text-evo-textSec">
                A ordem da lista não representa uma probabilidade de lucro.
              </span>
            </div>
          </div>
          <div className="shrink-0 self-end sm:self-center">
            <OrbitCoins variant="ranking" size="hero" />
          </div>
        </div>
      </section>
      {showingDemo && (
        <section
          className="overflow-hidden rounded-2xl border border-evo-accent/30 bg-evo-card"
          aria-label="Demonstração com dados fictícios"
        >
          <div className="border-b border-evo-border bg-evo-accent/5 p-5 sm:p-6">
            <span className="inline-flex rounded-full border border-evo-accent/30 px-3 py-1 text-xs font-semibold text-evo-accent">
              Demonstração · dados fictícios
            </span>
            <h2 className="mt-3 text-xl font-semibold">
              Uma prévia da sua próxima pesquisa
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-evo-textSec">
              Explore empresas inventadas, cenários e indicadores de exemplo.
              Todos os preços, percentuais e gráficos desta demonstração são
              simulados; não representam a pesquisa do corretor nem ativos
              negociáveis.
            </p>
          </div>
          <dl className="grid divide-y divide-evo-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {[
              ["06", "Empresas de exemplo"],
              ["06", "Módulos por empresa"],
              ["03", "Trimestres ilustrativos"],
            ].map(([value, label]) => (
              <div key={label} className="p-5 sm:px-6">
                <dt className="text-xs text-evo-textSec">{label}</dt>
                <dd className="mt-2 font-numbers text-3xl font-semibold">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      {(error || favoriteError) && (
        <p role="alert" className="notice-error">
          {error || favoriteError}
        </p>
      )}
      {message && (
        <p role="status" className="notice-success">
          {message}
        </p>
      )}
      {userCan(user, "rankings:write") && ranking.canManage && (
        <details className="rounded-xl border border-evo-border bg-evo-card p-5">
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
            como não informados. A lista de ações para pesquisa, sozinha, não é
            uma previsão.
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
                  maxLength={key === "title" ? 160 : 120}
                  value={metadata[key]}
                  onChange={(e) =>
                    setMetadata((current) => ({
                      ...current,
                      [key]: e.target.value,
                    }))
                  }
                />
              </label>
            ))}
          </div>
          <ResearchEditor
            metadata={metadata}
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
            disabled={!file || busy}
            onClick={() => void sendFile(false)}
          >
            <FileSpreadsheet size={16} />
            {busy ? "Processando…" : "Validar e ver prévia"}
          </button>
          {preview.length > 0 && (
            <section className="mt-5 space-y-3">
              <h2 className="font-semibold">
                Prévia · {preview.length} ativos
              </h2>
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
                        <td className="p-3">{e.ticker}</td>
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
        <CompanyComparison
          key={showingDemo ? "demo" : ranking.id || "empty"}
          entries={sourceEntries}
          demo={showingDemo}
        />
      )}
      {!loading && !error && !showingDemo && (
        <VersionComparison
          key={ranking.id}
          publicationId={ranking.id}
          history={ranking.history}
        />
      )}
      <section className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">
              {showingDemo ? "Explore os cenários de exemplo" : ranking.title}
            </h2>
            <p className="mt-1 text-xs text-evo-textSec">
              {showingDemo
                ? "Ordem ilustrativa para apresentação da interface"
                : ranking.updatedAt
                  ? "Publicado em " + date(ranking.updatedAt)
                  : "Aguardando a primeira publicação"}
            </p>
          </div>
          {!showingDemo && (
            <label className="text-xs text-evo-textSec">
              Histórico de publicações
              <select
                className={input + " mt-1"}
                value={publication}
                onChange={(e) => {
                  setPublication(e.target.value);
                  setLoading(true);
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
        {!showingDemo && (
          <div className="grid gap-3 rounded-xl border border-evo-border bg-evo-card p-4 text-sm sm:grid-cols-3">
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
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex items-center gap-2 rounded-lg border border-evo-border bg-evo-bgMain px-3">
            <Search size={17} />
            <span className="sr-only">Buscar empresa ou ticker</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Empresa ou ticker"
              className="min-h-11 min-w-0 w-full bg-transparent text-sm outline-none"
            />
          </label>
          <select
            aria-label="Filtrar setor"
            className={input}
            value={sector}
            onChange={(e) => setSector(e.target.value)}
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
            onChange={(e) => setHorizon(e.target.value)}
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
            onChange={(e) => setSort(e.target.value)}
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
        </div>
        <p className="text-xs text-evo-textSec">
          {entries.length} de {totalEntries}{" "}
          {showingDemo
            ? "empresas fictícias · valores simulados para apresentação."
            : "ativos · valores informados pelo autor, sem garantia de retorno."}
        </p>
        {loading && !showingDemo ? (
          <Card>
            <p role="status">Carregando publicação…</p>
          </Card>
        ) : !sourceEntries.length ? (
          <Card>
            <h3 className="font-semibold">
              A primeira análise ainda não foi publicada
            </h3>
            <p className="mt-2 text-sm text-evo-textSec">
              Enquanto isso, conheça os conceitos usados para avaliar cenários.
            </p>
            <Link
              to="/aprender"
              className="mt-4 inline-block text-evo-accent underline"
            >
              Começar a aprender
            </Link>
          </Card>
        ) : !entries.length ? (
          <Card>Nenhum ativo corresponde aos filtros.</Card>
        ) : (
          entries.map((entry) => (
            <article
              key={entry.ticker}
              className="rounded-xl border border-evo-border bg-evo-card p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-evo-accent/10 font-semibold text-evo-accent">
                    {entry.rank}
                  </span>
                  <div>
                    <h3 className="font-bold">
                      {entry.ticker}{" "}
                      <span className="font-normal text-evo-textSec">
                        {entry.companyName}
                      </span>
                    </h3>
                    {showingDemo && (
                      <span className="mt-2 inline-block rounded-md bg-evo-accent/10 px-2 py-1 text-[11px] font-semibold text-evo-accent">
                        Empresa fictícia · exemplo visual
                      </span>
                    )}
                    <p className="mt-1 text-xs text-evo-textSec">
                      {entry.sector || "Setor não informado"}
                    </p>
                  </div>
                </div>
                {showingDemo ? (
                  <span className="text-xs text-evo-textSec">
                    Sem operações ou favoritos
                  </span>
                ) : user ? (
                  <button
                    aria-label={
                      (isFavorito(entry.ticker)
                        ? "Remover dos"
                        : "Adicionar aos") +
                      " favoritos " +
                      entry.ticker
                    }
                    aria-pressed={isFavorito(entry.ticker)}
                    onClick={() => void toggleFavorito(entry.ticker)}
                    className="min-h-11 min-w-11 rounded-lg border border-evo-border p-3"
                  >
                    <Star
                      size={17}
                      fill={isFavorito(entry.ticker) ? "currentColor" : "none"}
                    />
                  </button>
                ) : (
                  <Link to="/entrar" className="text-sm text-evo-accent">
                    Entrar para favoritar
                  </Link>
                )}
              </div>
              <dl
                className={`mt-4 grid grid-cols-2 gap-4 border-y border-evo-border py-4 ${showingDemo ? "lg:grid-cols-4" : "sm:grid-cols-3"}`}
              >
                {showingDemo && (
                  <div>
                    <dt className="text-xs text-evo-textSec">
                      Referência simulada
                    </dt>
                    <dd className="mt-1 font-numbers text-lg">
                      {money.format(Number(entry.referencePrice))}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs text-evo-textSec">
                    {showingDemo ? "Potencial simulado" : "Potencial informado"}
                  </dt>
                  <dd className="mt-1 font-numbers text-lg">
                    {Number(entry.expectedReturnPercent).toLocaleString(
                      "pt-BR",
                    )}
                    %
                  </dd>
                  <IndicatorHelp field="expectedReturnPercent" />
                </div>
                <div>
                  <dt className="text-xs text-evo-textSec">
                    {showingDemo
                      ? "Preço-alvo simulado"
                      : "Preço-alvo informado"}
                  </dt>
                  <dd className="mt-1">
                    {entry.targetPrice
                      ? money.format(Number(entry.targetPrice))
                      : "Não informado"}
                  </dd>
                  <IndicatorHelp field="targetPrice" />
                </div>
                <div>
                  <dt className="text-xs text-evo-textSec">Horizonte</dt>
                  <dd className="mt-1">
                    {entry.horizonMonths
                      ? entry.horizonMonths + " meses"
                      : "Não informado"}
                  </dd>
                  <IndicatorHelp field="horizonMonths" />
                </div>
              </dl>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="text-sm font-semibold">Tese do cenário</h4>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-evo-textSec">
                    {entry.thesis ||
                      "A justificativa ainda não foi informada pelo autor."}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold">
                    O que pode contrariar a previsão?
                  </h4>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-evo-textSec">
                    {entry.risks ||
                      "Os riscos específicos ainda não foram informados. Não interprete isso como ausência de risco."}
                  </p>
                </div>
              </div>
              <RankingFundamentals
                data={entry}
                demo={showingDemo}
                revenueHistory={showingDemo ? entry.revenueHistory : undefined}
              />
              <Link
                to="/aprender#ranking"
                className="mt-4 inline-block text-xs text-evo-accent underline"
              >
                Entender potencial, preço-alvo e prazo
              </Link>
            </article>
          ))
        )}
      </section>
      <aside className="rounded-xl border border-evo-border bg-evo-card p-4 text-xs leading-relaxed text-evo-textSec">
        {showingDemo ? (
          "Demonstração da interface: empresas, ordem, preços, percentuais, indicadores e argumentos são fictícios. Não são recomendações nem dados de mercado. As publicações reais ficam disponíveis em uma visualização separada."
        ) : (
          <>
            Previsões são cenários, não garantias. A lista reproduz a análise
            enviada pelo responsável. Dados, premissas e preços podem estar
            desatualizados; nenhuma classificação determina se um investimento é
            adequado para você.
          </>
        )}
        {!showingDemo && ranking.sourceFileName && (
          <span className="mt-2 block">Origem: {ranking.sourceFileName}</span>
        )}
      </aside>
    </section>
  );
}
