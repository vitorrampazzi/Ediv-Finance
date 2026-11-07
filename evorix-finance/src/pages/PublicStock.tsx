import { lazy, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, BookOpen, FileText } from "lucide-react";
import { useAuth } from "../context/authContext";
import { AccountGate } from "../components/AccountGate";
import { CompanyLogo } from "../components/CompanyLogo";
import { MarketQuotePanel } from "../components/LiveQuote";
import { RankingAccessLanding } from "../components/RankingAccessLanding";
import {
  publicationDate,
  publicMetrics,
  usePublicRanking,
} from "../hooks/usePublicRanking";
import { marginCaption, marketView } from "../lib/marketData";
import { pageImports } from "../lib/pageImports";
import {
  dividendColumns,
  formatDividendValue,
} from "../../dividend-analysis.mjs";
import { siteOrigin } from "../../site-pages.mjs";

// Members get the full research; its charts only load for them.
const StockResearch = lazy(() =>
  pageImports.stockResearch().then((module) => ({
    default: module.StockResearch,
  })),
);

const page = "mx-auto max-w-6xl px-4 py-6 sm:px-6 md:py-10";

export function PublicStock() {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <p role="status" className={page}>
        Verificando seu acesso à pesquisa…
      </p>
    );
  return user ? <StockResearch /> : <PublicCompany />;
}

function setMeta(attribute: "name" | "property", key: string, value: string) {
  let element = document.head.querySelector<HTMLMetaElement>(
    `meta[${attribute}="${key}"]`,
  );
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.append(element);
  }
  element.content = value;
}

// Only the first three companies of the latest publication are open. Their
// pages get their own canonical and description; any other ticker shows the
// ranking landing with noindex, so no closed company becomes a public page.
function PublicCompany() {
  const { ticker = "" } = useParams<{ ticker: string }>();
  const { publication, loading, error, retry, stale } = usePublicRanking();
  const open = publication?.entries.slice(0, 3) ?? [];
  const entry = open.find(
    (item) => item.ticker.toUpperCase() === ticker.toUpperCase(),
  );
  const date = publicationDate(publication?.updatedAt ?? null);
  // Quote and margin come from the same public answer; no ceiling is shown.
  const view = entry
    ? marketView(
        entry.market,
        { margin: entry.dividendAnalysis.safetyMargin },
        {
          loading: false,
          failed: stale,
          publishedAt: publication?.updatedAt ?? null,
          showCeiling: false,
        },
      )
    : null;
  const indicators = publicMetrics.map((key) => {
    const column = dividendColumns.find((item) => item.key === key)!;
    const margin = key === "safetyMargin" ? view : null;
    return {
      key,
      label: column.label,
      value: margin
        ? margin.margin.text
        : entry
          ? formatDividendValue(entry.dividendAnalysis[key], column.format)
          : "",
      // DY and P/L stay as on the research date; the margin follows the quote.
      sub: margin ? marginCaption(margin) : "na data da pesquisa",
      title: margin?.margin.title,
      state: margin?.margin.state,
      known: entry?.dividendAnalysis[key] != null,
    };
  });
  const canonical = entry
    ? `${siteOrigin}/ranking/acao/${encodeURIComponent(entry.ticker)}`
    : null;
  const name = entry ? `${entry.companyName} (${entry.ticker})` : "";
  // The margin changes with the quote, so the description keeps the research
  // indicators only and says the margin follows the market.
  const description = entry
    ? `Indicadores de ${name} na pesquisa de dividendos da Escola do Dividendo: ${indicators
        .filter((item) => item.known && item.key !== "safetyMargin")
        .map((item) => `${item.label} ${item.value}`)
        .join(", ")}; a margem de segurança acompanha a cotação.`
    : "";

  useEffect(() => {
    if (loading) return;
    setMeta(
      "name",
      "robots",
      canonical ? "index, follow" : "noindex, nofollow",
    );
    let link = document.head.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]',
    );
    if (!canonical) {
      link?.remove();
      return;
    }
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.append(link);
    }
    link.href = canonical;
    const socialTitle = `${name}: pesquisa de dividendos | Escola do Dividendo`;
    setMeta("name", "description", description);
    setMeta("property", "og:url", canonical);
    setMeta("property", "og:title", socialTitle);
    setMeta("property", "og:description", description);
    setMeta("name", "twitter:title", socialTitle);
    setMeta("name", "twitter:description", description);
    const schema = document.createElement("script");
    schema.type = "application/ld+json";
    schema.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Início",
          item: siteOrigin + "/",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Ranking de Ações",
          item: siteOrigin + "/ranking",
        },
        { "@type": "ListItem", position: 3, name, item: canonical },
      ],
    });
    document.head.append(schema);
    return () => schema.remove();
  }, [loading, canonical, name, description]);

  if (loading)
    return (
      <section className={`${page} min-h-[70vh]`} aria-busy="true">
        <p role="status" className="text-sm text-evo-textSec">
          Carregando a pesquisa da empresa…
        </p>
      </section>
    );
  if (error)
    return (
      <section className={page}>
        <p role="alert" className="notice-error">
          {error}
        </p>
        <button type="button" className="action-secondary mt-4" onClick={retry}>
          Tentar novamente
        </button>
      </section>
    );
  if (!entry || !publication) return <RankingAccessLanding />;

  const destination =
    "/app/ranking/acao/" +
    encodeURIComponent(entry.ticker) +
    (publication.id
      ? "?publication=" + encodeURIComponent(publication.id)
      : "");
  const others = open.filter((item) => item.ticker !== entry.ticker);
  return (
    <article className={page}>
      <nav aria-label="Trilha de navegação" className="text-sm">
        <ol className="flex flex-wrap items-center gap-x-2 text-evo-textSec">
          <li>
            <Link
              className="inline-flex min-h-11 items-center underline"
              to="/"
            >
              Início
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link
              className="inline-flex min-h-11 items-center underline"
              to="/ranking"
            >
              Ranking de Ações
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">{entry.ticker}</li>
        </ol>
      </nav>
      <header className="section-masthead mt-2">
        <p className="edition-label">
          Pesquisa de ações · {entry.rank}º lugar na publicação mais recente
        </p>
        <div className="mt-3 flex items-center gap-4">
          <CompanyLogo ticker={entry.ticker} />
          <h1 className="display-title text-3xl sm:text-4xl">{name}</h1>
        </div>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-evo-textSec">
          {entry.companyName} está entre as três primeiras empresas da pesquisa
          de dividendos da Escola do Dividendo
          {date ? `, publicada em ${date}` : ""}. Abaixo estão os indicadores
          abertos e o que a pesquisa completa reúne.
        </p>
      </header>

      <section aria-labelledby="indicadores-abertos" className="mt-8">
        <h2 id="indicadores-abertos" className="text-xl font-semibold">
          Indicadores da pesquisa
        </h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          {indicators.map((item) => (
            <div
              key={item.key}
              className="rounded-xl border border-evo-border bg-evo-bgSec p-4"
              data-indicator={item.key}
              data-market-state={item.state}
            >
              <dt className="text-sm text-evo-textSec">{item.label}</dt>
              <dd
                className="font-numbers mt-2 text-2xl font-semibold"
                title={item.title}
                data-indicator-value
              >
                {item.value}
              </dd>
              <dd className="mt-1 text-xs text-evo-textSec" data-indicator-sub>
                {item.sub}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs leading-5 text-evo-textSec">
          Fonte: pesquisa da Escola do Dividendo
          {date ? `, publicação de ${date}` : ""}. DY e P/L são estimativas da
          pesquisa, na data da publicação, e não mudam com a cotação. A margem
          de segurança acompanha a cotação da brapi.dev, com atraso. Margem de
          segurança não representa retorno garantido. Conteúdo educativo, sem
          recomendação individual de investimento.
        </p>
        <Link
          className="mt-2 inline-flex min-h-11 items-center text-sm text-evo-accent underline"
          to="/glossario"
        >
          O que significa cada indicador
        </Link>
      </section>

      {view && <MarketQuotePanel view={view} variant="public" />}

      <section aria-labelledby="pesquisa-completa" className="mt-8">
        <h2 id="pesquisa-completa" className="text-xl font-semibold">
          O que a pesquisa completa reúne
        </h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6 text-evo-textSec">
          <li>A opinião da equipe e o cenário considerado para a empresa.</li>
          <li>Os riscos que podem mudar o resultado.</li>
          <li>A história do negócio, as estatísticas e os fundamentos.</li>
          <li>Os resultados e a relação entre lucro e dividendos.</li>
          <li>As fontes e a versão de cada publicação.</li>
        </ul>
      </section>

      <div className="mt-8">
        <AccountGate
          title={`Leia a pesquisa completa de ${entry.companyName}`}
          description="Crie sua conta gratuita ou entre para acessar a opinião da equipe, os riscos e todos os indicadores."
          next={destination}
          compact
        />
      </div>

      {others.length > 0 && (
        <section aria-labelledby="outras-empresas" className="mt-10">
          <h2 id="outras-empresas" className="text-xl font-semibold">
            Outras empresas abertas na pesquisa
          </h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {others.map((item) => (
              <li key={item.ticker}>
                <Link
                  className="flex min-h-11 items-center gap-3 rounded-lg border border-evo-border px-3 py-2 hover:border-evo-accent"
                  to={"/ranking/acao/" + encodeURIComponent(item.ticker)}
                >
                  <CompanyLogo ticker={item.ticker} />
                  <span>
                    <strong>{item.companyName}</strong>{" "}
                    <span className="text-evo-textSec">{item.ticker}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <nav
        aria-label="Continue estudando"
        className="mt-10 flex flex-wrap gap-x-6 gap-y-1 text-sm"
      >
        <Link
          className="inline-flex min-h-11 items-center gap-2 text-evo-accent underline"
          to="/ranking"
        >
          Ver o Ranking de Ações <ArrowRight size={16} aria-hidden="true" />
        </Link>
        <Link
          className="inline-flex min-h-11 items-center gap-2 text-evo-accent underline"
          to="/aprender"
        >
          <BookOpen size={16} aria-hidden="true" /> Aprender sobre dividendos
        </Link>
        <Link
          className="inline-flex min-h-11 items-center gap-2 text-evo-accent underline"
          to="/metodologia"
        >
          <FileText size={16} aria-hidden="true" /> Como a pesquisa é feita
        </Link>
      </nav>
    </article>
  );
}
