import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  FileText,
  ShieldAlert,
} from "lucide-react";
import { useLayoutEffect } from "react";
import {
  Link,
  useLocation,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { RankingAccessLanding } from "../components/RankingAccessLanding";
import { RankingFundamentals } from "../components/RankingFundamentals";
import { IndicatorHelp } from "../components/ResearchTools";
import { ResearchCoverage } from "../components/ResearchCoverage";
import { ResearchSources } from "../components/ResearchSources";
import { useAuth } from "../context/authContext";
import { useRankingPublication } from "../hooks/useRankingPublication";
import { rankingDemoEntries } from "../lib/rankingDemo";
import { researchDemoStories } from "../lib/researchDemo";
import type { Entry } from "../lib/ranking";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const publicationDate = (value: string) => {
  const normalized = value.replace(" ", "T");
  const parsed = new Date(
    /(?:Z|[+-]\d{2}:\d{2})$/.test(normalized) ? normalized : normalized + "Z",
  );
  return Number.isNaN(parsed.valueOf())
    ? "Data não informada"
    : parsed.toLocaleString("pt-BR");
};
const page = "mx-auto max-w-6xl px-4 py-6 sm:px-6 md:py-10";
const section = "scroll-mt-40 border-t border-evo-border py-7 sm:py-9";

export function StockResearch() {
  const { user, loading } = useAuth();
  const { ticker = "" } = useParams<{ ticker: string }>();
  const [params] = useSearchParams();
  const { pathname, search, hash } = useLocation();

  useLayoutEffect(() => {
    if (!hash) window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname, search, hash]);

  if (loading)
    return (
      <p role="status" className={page}>
        Verificando seu acesso à pesquisa…
      </p>
    );
  if (!user) return <RankingAccessLanding />;
  return (
    <MemberStockResearch
      key={user.id + ":" + ticker + ":" + params.toString()}
    />
  );
}

function MemberStockResearch() {
  const { ticker = "" } = useParams<{ ticker: string }>();
  const location = useLocation();
  const [params] = useSearchParams();
  const publication = /^\d{1,20}$/.test(params.get("publication") || "")
    ? params.get("publication") || ""
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
  } = useRankingPublication(publication);
  const explicitMode = params.get("visual");
  const demo =
    explicitMode === "demo" ||
    (explicitMode !== "real" &&
      !loading &&
      !error &&
      !publication &&
      ranking.entries.length === 0);
  const entries: Entry[] = demo ? rankingDemoEntries : ranking.entries;
  const entry = entries.find(
    (item) => item.ticker.toUpperCase() === ticker.toUpperCase(),
  );
  const backParams = new URLSearchParams(params);
  backParams.set("visual", demo ? "demo" : "real");
  if (!demo && ranking.id) backParams.set("publication", ranking.id);
  const back =
    (location.pathname.startsWith("/app/") ? "/app/ranking" : "/ranking") +
    "?" +
    backParams.toString();
  const learningPath = location.pathname.startsWith("/app/")
    ? "/app/aprender"
    : "/aprender";
  const retry = async () => {
    setLoading(true);
    setError("");
    try {
      applyRanking(await load());
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível abrir esta pesquisa.",
      );
    } finally {
      setLoading(false);
      setLoadedFor(requestKey);
    }
  };
  const backLink = (
    <Link
      to={back}
      className="inline-flex min-h-11 items-center gap-2 text-sm text-evo-accent hover:underline"
    >
      <ArrowLeft size={17} aria-hidden="true" /> Voltar ao ranking
    </Link>
  );

  if (loading && !demo)
    return (
      <section className={page}>
        {backLink}
        <p role="status" className="mt-7 text-evo-textSec">
          Carregando a pesquisa desta publicação…
        </p>
      </section>
    );
  if (error && !demo)
    return (
      <section className={page}>
        {backLink}
        <h1 className="mt-6 text-2xl font-semibold">
          Não foi possível abrir a pesquisa
        </h1>
        <p role="alert" className="notice-error mt-4">
          {error}
        </p>
        <button
          type="button"
          className="mt-4 min-h-11 text-sm text-evo-accent underline"
          onClick={() => void retry()}
        >
          Tentar novamente
        </button>
      </section>
    );
  if (!entry)
    return (
      <section className={page}>
        {backLink}
        <h1 className="mt-6 text-2xl font-semibold">
          Ação não encontrada nesta publicação
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-evo-textSec">
          Este código não faz parte da versão selecionada. Volte ao ranking para
          consultar as pesquisas disponíveis.
        </p>
      </section>
    );

  const story = demo ? researchDemoStories[entry.ticker] : undefined;
  const orderedEntries = [...entries].sort((a, b) => a.rank - b.rank);
  const entryIndex = orderedEntries.findIndex(
    (item) => item.ticker === entry.ticker,
  );
  const previous = orderedEntries[entryIndex - 1];
  const next = orderedEntries[entryIndex + 1];
  const companyLink = (code: string) =>
    (location.pathname.startsWith("/app/")
      ? "/app/ranking/acao/"
      : "/ranking/acao/") +
    encodeURIComponent(code) +
    "?" +
    backParams.toString();
  return (
    <article id="pagina-conteudo" className={page}>
      {backLink}
      {demo && (
        <p className="mt-5 border-l-2 border-evo-accent bg-evo-accent/5 px-4 py-3 text-xs leading-relaxed text-evo-textSec">
          <strong className="text-evo-accent">
            Pesquisa ilustrativa · empresa fictícia.
          </strong>{" "}
          História, argumentos e números de exemplo. Este conteúdo não é uma
          opinião do corretor nem uma recomendação sobre uma empresa real.
        </p>
      )}
      <header className="page-intro my-7 sm:my-10">
        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-widest text-evo-textSec">
          <span className="text-evo-accent">
            {demo ? "Pesquisa de exemplo" : "Pesquisa publicada"}
          </span>
          <span aria-hidden="true">/</span>
          <span>{entry.sector || "Setor não informado"}</span>
        </div>
        <h1 className="mt-4 break-words text-3xl font-semibold tracking-tight sm:text-5xl">
          {entry.companyName}
        </h1>
        <p className="mt-3 font-numbers text-xl text-evo-textSec">
          {entry.ticker}{" "}
          <span className="ml-3 font-sans text-xs">
            Posição {entry.rank} na {demo ? "demonstração" : "publicação"}
          </span>
        </p>
        <p className="mt-5 max-w-3xl text-sm leading-relaxed text-evo-textSec">
          Conheça a tese, os riscos e os dados que dão contexto ao cenário. A
          posição no ranking não indica probabilidade de lucro.
        </p>
        <dl className="mt-7 grid grid-cols-2 gap-x-5 gap-y-6 border-y border-evo-border py-5 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-evo-textSec">
              {demo ? "Potencial simulado" : "Potencial informado"}
            </dt>
            <dd className="mt-2 font-numbers text-3xl font-semibold text-evo-accent">
              {Number(entry.expectedReturnPercent).toLocaleString("pt-BR")}%
            </dd>
            <IndicatorHelp field="expectedReturnPercent" />
          </div>
          <div>
            <dt className="text-xs text-evo-textSec">
              {demo ? "Preço-alvo simulado" : "Preço-alvo informado"}
            </dt>
            <dd className="mt-2 font-numbers text-2xl">
              {entry.targetPrice
                ? money.format(Number(entry.targetPrice))
                : "Não informado"}
            </dd>
            <IndicatorHelp field="targetPrice" />
          </div>
          <div>
            <dt className="text-xs text-evo-textSec">Horizonte do cenário</dt>
            <dd className="mt-2 font-numbers text-2xl">
              {entry.horizonMonths
                ? entry.horizonMonths + " meses"
                : "Não informado"}
            </dd>
            <IndicatorHelp field="horizonMonths" />
          </div>
        </dl>
      </header>
      <section
        aria-label="Como ler este caderno"
        className="mb-6 grid gap-4 border-l-2 border-evo-accent bg-evo-accent/5 p-4 text-xs sm:grid-cols-3 sm:p-5"
      >
        <div>
          <h2 className="font-semibold">Comece pela tese</h2>
          <p className="mt-2 leading-5 text-evo-textSec">
            Entenda as premissas antes de comparar o potencial com outras
            empresas.
          </p>
        </div>
        <div>
          <h2 className="font-semibold">Observe o contraponto</h2>
          <p className="mt-2 leading-5 text-evo-textSec">
            Os riscos mostram quais condições podem fazer o cenário não se
            concretizar.
          </p>
        </div>
        <div>
          <h2 className="font-semibold">Leia os dados com contexto</h2>
          <p className="mt-2 leading-5 text-evo-textSec">
            Preço-alvo é um cenário da publicação. Verifique prazo, período e
            fonte.
          </p>
        </div>
      </section>
      <nav
        aria-label="Seções da pesquisa"
        className="sticky top-16 z-10 -mx-4 flex gap-2 overflow-x-auto border-y border-evo-border bg-evo-bgMain/95 px-4 py-2 text-sm backdrop-blur sm:mx-0 sm:gap-4 md:top-20"
      >
        {[
          ["tese", "Opinião e cenário"],
          ["riscos", "Riscos"],
          ["historia", "A empresa"],
          ["estatisticas", "Estatísticas"],
          ["fundamentos", "Fundamentos"],
          ["fontes", "Fontes e versão"],
        ].map(([anchor, label]) => (
          <a
            key={anchor}
            href={"#" + anchor}
            className="inline-flex min-h-11 shrink-0 items-center rounded-md px-2 text-evo-textSec hover:bg-evo-accent/5 hover:text-evo-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-evo-accent"
          >
            {label}
          </a>
        ))}
      </nav>
      <div className="grid gap-x-10 lg:grid-cols-[minmax(0,1fr)_15rem]">
        <div className="min-w-0">
          <section id="tese" className={section + " border-t-0"}>
            <p className="text-xs font-semibold uppercase tracking-widest text-evo-accent">
              01 / Leitura da pesquisa
            </p>
            <h2 className="mt-3 text-2xl font-semibold">
              {demo
                ? "Como seria a opinião nesta pesquisa"
                : "Opinião do responsável e tese do cenário"}
            </h2>
            <p className="mt-5 whitespace-pre-wrap break-words text-base leading-8 text-evo-textSec">
              {entry.thesis?.trim() ||
                "A opinião e a justificativa ainda não foram publicadas pelo responsável nesta versão."}
            </p>
          </section>
          <section id="riscos" className={section}>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-evo-accent">
              <ShieldAlert size={17} aria-hidden="true" /> Contraponto do
              cenário
            </div>
            <h2 className="mt-3 text-2xl font-semibold">
              O que pode contrariar a previsão?
            </h2>
            <p className="mt-5 whitespace-pre-wrap break-words border-l-2 border-evo-border pl-4 text-sm leading-7 text-evo-textSec">
              {entry.risks?.trim() ||
                "Os riscos específicos ainda não foram informados. Isso não significa ausência de risco."}
            </p>
          </section>
          <section id="historia" className={section}>
            <p className="text-xs font-semibold uppercase tracking-widest text-evo-accent">
              02 / Contexto do negócio
            </p>
            <h2 className="mt-3 text-2xl font-semibold">História da empresa</h2>
            {story ? (
              <>
                <p className="mt-5 text-sm leading-7 text-evo-textSec">
                  {story.introduction}
                </p>
                <ol className="mt-6 space-y-5 border-l border-evo-border pl-5">
                  {story.milestones.map((milestone) => (
                    <li key={milestone.stage}>
                      <h3 className="text-sm font-semibold">
                        {milestone.stage}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-evo-textSec">
                        {milestone.text}
                      </p>
                    </li>
                  ))}
                </ol>
              </>
            ) : !entry.companyInformation?.trim() ? (
              <p className="mt-5 text-sm leading-7 text-evo-textSec">
                Conteúdo ainda não publicado. Este espaço receberá a trajetória
                da empresa, fatos relevantes e o contexto selecionado pela
                equipe.
              </p>
            ) : null}
            {!demo && entry.companyInformation?.trim() && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold">
                  Perfil informado pela equipe
                </h3>
                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-evo-textSec">
                  {entry.companyInformation}
                </p>
              </div>
            )}
            {story && (
              <div className="mt-7 border-l-2 border-evo-accent pl-5">
                <h3 className="text-sm font-semibold">
                  Conexão com o estudo de dividendos
                </h3>
                <p className="mt-3 text-sm leading-7 text-evo-textSec">
                  {story.dividendLens}
                </p>
                <Link
                  to={learningPath + "#dividendos"}
                  className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm text-evo-accent underline"
                >
                  <BookOpen size={16} aria-hidden="true" /> Aprender sobre
                  dividendos
                </Link>
              </div>
            )}
          </section>
          <section id="estatisticas" className={section}>
            <p className="text-xs font-semibold uppercase tracking-widest text-evo-accent">
              03 / Números com contexto
            </p>
            <h2 className="mt-3 text-2xl font-semibold">
              Estatísticas da empresa
            </h2>
            <p className="mt-3 text-xs leading-relaxed text-evo-textSec">
              {entry.referencePeriod || "Período de referência não informado"} ·{" "}
              {demo ? "Números simulados" : "Dados informados nesta publicação"}
            </p>
            {entry.statistics?.trim() ? (
              <dl className="mt-6 divide-y divide-evo-border">
                {entry.statistics
                  .split("\n")
                  .filter((line) => line.trim())
                  .map((line, index) => {
                    const divider = line.indexOf(":");
                    return (
                      <div
                        key={index}
                        className="flex flex-wrap justify-between gap-x-6 gap-y-2 py-3 text-sm"
                      >
                        <dt className="text-evo-textSec">
                          {divider >= 0
                            ? line.slice(0, divider)
                            : "Informação publicada"}
                        </dt>
                        <dd className="max-w-full whitespace-pre-wrap break-words font-medium">
                          {divider >= 0 ? line.slice(divider + 1).trim() : line}
                        </dd>
                      </div>
                    );
                  })}
              </dl>
            ) : (
              <p className="mt-5 text-sm text-evo-textSec">
                As estatísticas ainda não foram publicadas nesta versão.
              </p>
            )}
          </section>
          <section id="fundamentos" className={section}>
            <p className="text-xs font-semibold uppercase tracking-widest text-evo-accent">
              04 / Dados da pesquisa
            </p>
            <h2 className="mt-3 text-2xl font-semibold">
              Fundamentos e documentos
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-evo-textSec">
              Explore balanço, DRE, fluxo de caixa e endividamento no formato
              informado pela equipe.
            </p>
            <RankingFundamentals
              data={entry}
              demo={demo}
              revenueHistory={demo ? entry.revenueHistory : undefined}
              initiallyOpen
            />
          </section>
          <section id="fontes" className={section}>
            <p className="text-xs font-semibold uppercase tracking-widest text-evo-accent">
              05 / Origem e contexto
            </p>
            <h2 className="mt-3 text-2xl font-semibold">
              Fontes e versão da pesquisa
            </h2>
            <dl className="mt-5 grid gap-5 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-evo-textSec">Período dos dados</dt>
                <dd className="mt-2 break-words">
                  {entry.referencePeriod || "Não informado nesta publicação"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-evo-textSec">Data da publicação</dt>
                <dd className="mt-2">
                  {demo
                    ? "Exemplo ilustrativo; sem publicação real"
                    : ranking.updatedAt
                      ? publicationDate(ranking.updatedAt)
                      : "Não informada"}
                </dd>
              </div>
            </dl>
            <h3 className="mb-3 mt-6 text-sm font-semibold">
              Materiais informados pela equipe
            </h3>
            <ResearchSources text={entry.dataSource} />
            <p className="mt-4 text-xs leading-6 text-evo-textSec">
              Estes fundamentos pertencem à versão selecionada; eles não
              acompanham automaticamente as mudanças das cotações.
            </p>
            <Link
              to="/metodologia"
              className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm text-evo-accent underline"
            >
              Como funciona a pesquisa{" "}
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </section>
        </div>
        <aside
          className="min-w-0 border-t border-evo-border py-7 text-xs lg:border-l lg:border-t-0 lg:pl-7"
          aria-label="Contexto da publicação"
        >
          <div className="lg:sticky lg:top-40">
            <FileText
              size={20}
              className="text-evo-accent"
              aria-hidden="true"
            />
            <h2 className="mt-3 text-sm font-semibold">Sobre esta versão</h2>
            <dl className="mt-5 space-y-5">
              <div>
                <dt className="text-evo-textSec">Publicação</dt>
                <dd className="mt-2 break-words">
                  {demo ? "Demonstração da Ediv Finance" : ranking.title}
                </dd>
              </div>
              <div>
                <dt className="text-evo-textSec">Responsável</dt>
                <dd className="mt-2 break-words">
                  {demo
                    ? "Conteúdo ilustrativo; sem autoria do corretor"
                    : ranking.authorName || "Ainda não informado"}
                </dd>
              </div>
              {!demo && (
                <>
                  <div>
                    <dt className="text-evo-textSec">Categoria / registro</dt>
                    <dd className="mt-2 break-words">
                      {ranking.professionalCategory || "Não informada"} /{" "}
                      {ranking.professionalRegistration || "Não informado"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-evo-textSec">Publicado em</dt>
                    <dd className="mt-2">
                      {ranking.updatedAt
                        ? publicationDate(ranking.updatedAt)
                        : "Não informado"}
                    </dd>
                  </div>
                </>
              )}
              <div>
                <dt className="text-evo-textSec">Período dos dados</dt>
                <dd className="mt-2 break-words">
                  {entry.referencePeriod || "Não informado"}
                </dd>
              </div>
            </dl>
            <ResearchCoverage entry={entry} />
            <Link
              to={learningPath + "#ranking"}
              className="mt-7 inline-flex min-h-11 items-center gap-2 text-evo-accent underline"
            >
              Como interpretar a pesquisa{" "}
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
            <Link
              to="/glossario"
              className="flex min-h-11 items-center gap-2 text-evo-accent underline"
            >
              Consultar o glossário <BookOpen size={14} aria-hidden="true" />
            </Link>
          </div>
        </aside>
      </div>
      <nav
        aria-label="Outras pesquisas desta publicação"
        className="grid gap-3 border-t border-evo-border py-6 sm:grid-cols-2"
      >
        {previous ? (
          <Link
            to={companyLink(previous.ticker)}
            className="flex min-h-16 items-center gap-3 rounded-lg border border-evo-border p-4 hover:border-evo-accent/50"
          >
            <ArrowLeft
              size={17}
              className="shrink-0 text-evo-accent"
              aria-hidden="true"
            />
            <span className="min-w-0">
              <span className="block text-xs text-evo-textSec">
                Pesquisa anterior
              </span>
              <span className="mt-1 block break-words text-sm font-semibold">
                {previous.ticker} · {previous.companyName}
              </span>
            </span>
          </Link>
        ) : (
          <Link
            to={back}
            className="flex min-h-16 items-center gap-3 rounded-lg border border-evo-border p-4 text-sm text-evo-accent hover:border-evo-accent/50"
          >
            <ArrowLeft size={17} aria-hidden="true" /> Ver todas as pesquisas
          </Link>
        )}
        {next ? (
          <Link
            to={companyLink(next.ticker)}
            className="flex min-h-16 items-center justify-between gap-3 rounded-lg border border-evo-border p-4 hover:border-evo-accent/50"
          >
            <span className="min-w-0">
              <span className="block text-xs text-evo-textSec">
                Próxima pesquisa
              </span>
              <span className="mt-1 block break-words text-sm font-semibold">
                {next.ticker} · {next.companyName}
              </span>
            </span>
            <ArrowRight
              size={17}
              className="shrink-0 text-evo-accent"
              aria-hidden="true"
            />
          </Link>
        ) : (
          <Link
            to={learningPath + "#ranking"}
            className="flex min-h-16 items-center justify-between gap-3 rounded-lg border border-evo-border p-4 text-sm text-evo-accent hover:border-evo-accent/50"
          >
            Continuar nos minicursos <BookOpen size={17} aria-hidden="true" />
          </Link>
        )}
      </nav>
      <footer className="border-t border-evo-border pt-5 text-xs leading-6 text-evo-textSec">
        {demo
          ? "Empresas e conteúdos desta demonstração são fictícios. Nenhum exemplo representa uma previsão real da equipe."
          : "Previsões dependem de premissas e não garantem retorno. Este conteúdo não define se um investimento é adequado ao seu perfil."}
      </footer>
    </article>
  );
}
