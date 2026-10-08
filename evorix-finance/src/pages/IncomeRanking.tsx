import { useRankingPublication } from "../hooks/useRankingPublication";
import { useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import {
  ArrowUpRight,
  BookOpen,
  FileSpreadsheet,
  Search,
  Upload,
} from "lucide-react";
import { Card } from "../components/Card";
import { RankingFundamentals } from "../components/RankingFundamentals";
import type { Entry } from "../lib/ranking";
import { ApiError } from "../lib/api";
import { useAuth } from "../context/authContext";
import { rankingDemoEntries } from "../lib/rankingDemo";
import { RankingAccessLanding } from "../components/RankingAccessLanding";
import { OrbitCoins } from "../components/OrbitCoins";
import { ResearchEditor } from "../components/ResearchEditor";
import { userCan } from "../lib/permissions";
import {
  CompanyComparison,
  VersionComparison,
} from "../components/ResearchTools";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const noEntries: Entry[] = [];
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
    setSearch("");
    setSector("");
    setHorizon("");
    setSort("rank");
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set("visual", mode);
      if (resetPublication) next.delete("publication");
      return next;
    });
  };
  const researchLink = (ticker: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("visual", showingDemo ? "demo" : "real");
    if (!showingDemo && (ranking.id || publication))
      params.set("publication", ranking.id || publication);
    const base = location.pathname.startsWith("/app/")
      ? "/app/ranking/acao/"
      : "/ranking/acao/";
    return base + encodeURIComponent(ticker) + "?" + params.toString();
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
      className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 md:py-10"
    >
      <section className="border-b border-evo-border pb-6 sm:pb-8">
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
      {error && (
        <p role="alert" className="notice-error">
          {error}
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
      {!loading && !error && !showingDemo && current && (
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
              {showingDemo
                ? "Explore os cenários de exemplo"
                : current
                  ? ranking.title
                  : "Pesquisa selecionada"}
            </h2>
            <p className="mt-1 text-xs text-evo-textSec">
              {showingDemo
                ? "Ordem ilustrativa para apresentação da interface"
                : !current
                  ? loading
                    ? "Carregando a versão selecionada…"
                    : "Pesquisa indisponível"
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
        ) : !showingDemo && !current ? (
          <p
            role="status"
            className="border-y border-evo-border py-8 text-sm text-evo-textSec"
          >
            A pesquisa desta versão não está disponível agora. Escolha outra
            publicação ou atualize a página.
          </p>
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
          <ol className="divide-y divide-evo-border border-y border-evo-border">
            {entries.map((entry) => (
              <li key={entry.ticker}>
                <article>
                  <Link
                    to={researchLink(entry.ticker)}
                    className="group block py-5 transition-colors hover:bg-evo-accent/5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-evo-accent sm:px-3"
                    aria-label={
                      "Abrir pesquisa de " +
                      entry.companyName +
                      " (" +
                      entry.ticker +
                      ")"
                    }
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-start gap-3 sm:gap-5">
                        <span
                          className="w-7 shrink-0 pt-1 font-numbers text-lg text-evo-textSec"
                          aria-hidden="true"
                        >
                          {String(entry.rank).padStart(2, "0")}
                        </span>
                        <div className="min-w-0">
                          <h3 className="break-words text-xl font-semibold group-hover:text-evo-accent">
                            {entry.ticker}
                            <span className="mt-1 block text-sm font-normal text-evo-textSec sm:ml-3 sm:mt-0 sm:inline">
                              {entry.companyName}
                            </span>
                          </h3>
                          <p className="mt-2 text-xs text-evo-textSec">
                            {entry.sector || "Setor não informado"}
                            {showingDemo ? " · Empresa fictícia" : ""}
                          </p>
                        </div>
                      </div>
                      <ArrowUpRight
                        size={21}
                        className="mt-1 shrink-0 text-evo-accent"
                        aria-hidden="true"
                      />
                    </div>
                    <div className="ml-10 mt-4 sm:ml-12">
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
                        <div>
                          <dt className="text-xs text-evo-textSec">
                            {showingDemo
                              ? "Potencial simulado"
                              : "Potencial informado"}
                          </dt>
                          <dd className="mt-1 font-numbers text-xl font-semibold text-evo-accent">
                            {Number(entry.expectedReturnPercent).toLocaleString(
                              "pt-BR",
                            )}
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
                      <p className="mt-4 line-clamp-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-evo-textSec">
                        {entry.thesis ||
                          "A justificativa ainda não foi informada pelo autor."}
                      </p>
                      <span className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-evo-accent">
                        Ler tese, história e indicadores{" "}
                        <ArrowUpRight size={14} aria-hidden="true" />
                      </span>
                    </div>
                  </Link>
                </article>
              </li>
            ))}
          </ol>
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
        {!showingDemo && current && ranking.sourceFileName && (
          <span className="mt-2 block">Origem: {ranking.sourceFileName}</span>
        )}
      </aside>
    </section>
  );
}
