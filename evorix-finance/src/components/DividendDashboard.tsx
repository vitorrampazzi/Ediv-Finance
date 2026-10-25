import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { ArrowUp, CalendarDays, Info } from "lucide-react";
import {
  dividendColumns,
  dividendValue,
  formatDividendValue,
} from "../../dividend-analysis.mjs";
import type { DividendColumnKey } from "../../dividend-analysis.mjs";
import {
  compactDividendValue,
  dividendComparison,
  dividendAnnouncementMonths,
} from "../../dividend-insights.mjs";
import type { Entry } from "../lib/ranking";
import { CompanyLogo } from "./CompanyLogo";
import { Tooltip } from "./Tooltip";
import { ComparativeDividendChart } from "./ComparativeDividendChart";
import "./fundamental-center.css";

const navigation = [
  { id: "visao-geral", label: "Visão geral" },
  { id: "cotacao", label: "Cotação" },
  { id: "dividendos", label: "Dividendos" },
  { id: "indicadores", label: "Indicadores" },
  { id: "resultados", label: "Resultados" },
  { id: "informacoes-da-empresa", label: "Informações da empresa" },
] as const;
const categories = [
  {
    title: "Avaliação",
    keys: [
      "projectedPE",
      "averagePE10Years",
      "peDeviation",
      "referencePrice",
      "ceilingPrice",
      "safetyMargin",
    ],
    canonical: true,
  },
  {
    title: "Caixa e endividamento",
    keys: ["netDebtToEbitda"],
    canonical: true,
  },
  {
    title: "Rentabilidade",
    keys: ["estimatedNetIncome", "estimatedEps", "earningsCagr5Years"],
    canonical: true,
  },
  {
    title: "Dividendos",
    keys: [
      "estimatedGrossDividendYield",
      "projectedGrossDividendPerShare",
      "expectedPayout",
      "announcementFrequency",
      "announcementMonths",
    ],
    canonical: true,
  },
  {
    title: "Mercado",
    keys: ["marketValue", "totalShares", "referencePrice"],
    canonical: false,
  },
] as const;
const explanations: Partial<Record<DividendColumnKey, string>> = {
  projectedPE: "Preço em relação ao lucro estimado por ação, em vezes.",
  averagePE10Years:
    "Média dos últimos dez anos informada na fonte; não é uma série de cotações.",
  peDeviation:
    "Desvio preservado conforme a planilha, sem substituir pelo cálculo derivado.",
  referencePrice: "Cotação de referência da planilha, não um preço ao vivo.",
  ceilingPrice:
    "Premissa histórica de yield de 6,81%, taxa do Tesouro IPCA+ 2037 com juros semestrais indicada na planilha; não é a taxa atual do mercado.",
  safetyMargin:
    "Margem informada na planilha, não retorno esperado ou garantia.",
  netDebtToEbitda:
    "Relação em vezes. Um valor negativo isolado não comprova caixa líquido: faltam os sinais separados de dívida líquida e EBITDA.",
  estimatedNetIncome:
    "Lucro estimado consolidado da empresa, sem converter projeção em resultado realizado.",
  estimatedEps: "Lucro por ação estimado conforme a fonte.",
  earningsCagr5Years:
    "Taxa anual composta de lucros dos últimos cinco anos. Não descreve cada ano isoladamente.",
  expectedPayout:
    "Parcela esperada do lucro a distribuir, que pode superar 100%. Não é distribuição realizada.",
  projectedGrossDividendPerShare:
    "Dividendo bruto projetado por ação, antes de eventuais deduções.",
  estimatedGrossDividendYield:
    "Dividend Yield bruto estimado em relação à cotação de referência. Não é dividendo recebido.",
  announcementFrequency:
    "Frequência habitual informada, sem garantia de anúncios futuros.",
  announcementMonths:
    "Meses habituais de anúncios, sem garantia de pagamentos.",
  marketValue: "Valor de mercado informado, na data de referência da planilha.",
  totalShares:
    "Quantidade de ações da fonte, inclusive frações quando informadas.",
};
function MetricRow({
  entry,
  field,
  canonical = false,
  compact = false,
  label,
}: {
  entry: Entry;
  field: DividendColumnKey;
  canonical?: boolean;
  compact?: boolean;
  label?: string;
}) {
  const column = dividendColumns.find((item) => item.key === field)!;
  const raw = dividendValue(entry, field);
  const exact = formatDividendValue(raw, column.format);
  const shown = compact
    ? compactDividendValue(
        raw,
        field === "totalShares" ? "quantity" : "currency",
      )
    : exact;
  const explanation = explanations[field];
  return (
    <div
      className="fc-metric"
      data-field={canonical ? field : undefined}
      data-summary={!canonical ? field : undefined}
    >
      <dt>
        {explanation ? (
          <Tooltip content={explanation}>
            <button type="button" className="fc-metric-label">
              {label || column.label}
              <Info size={13} aria-hidden="true" />
            </button>
          </Tooltip>
        ) : (
          label || column.label
        )}
      </dt>
      <dd data-exact-value={exact} data-format={column.format}>
        {shown !== exact ? (
          <Tooltip content={exact}>
            <button type="button" className="fc-exact">
              {shown}
            </button>
          </Tooltip>
        ) : (
          shown
        )}
      </dd>
    </div>
  );
}
const months = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
function Calendar({ text }: { text: string | null | undefined }) {
  const selected = dividendAnnouncementMonths(text);
  return (
    <div className="fc-calendar">
      <header>
        <CalendarDays size={19} aria-hidden="true" />
        <h3>Meses habituais de anúncios</h3>
      </header>
      <p>
        {selected
          ? "Meses habituais informados na pesquisa."
          : "Nenhum mês foi presumido a partir da frequência."}
      </p>
      <ol aria-label="Meses habituais de anúncios">
        {months.map((month, index) => (
          <li
            key={month}
            data-announced={selected?.includes(index + 1) || false}
          >
            {month}
            <span className="sr-only">
              {selected?.includes(index + 1)
                ? " · habitual informado"
                : " · sem indicação"}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function DividendDashboard({
  entry,
  titleRef,
}: {
  entry: Entry;
  titleRef: RefObject<HTMLHeadingElement | null>;
}) {
  const data = entry.dividendAnalysis!;
  const [active, setActive] = useState<string>("visao-geral");
  const [showCeiling, setShowCeiling] = useState(true);
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const update = () => {
      const nav = navRef.current;
      const boundary = nav
        ? parseFloat(getComputedStyle(nav).top) + nav.offsetHeight + 24
        : 144;
      let current: string = navigation[0].id;
      for (const section of navigation)
        if (
          (document.getElementById(section.id)?.getBoundingClientRect().top ??
            Infinity) <= boundary
        )
          current = section.id;
      setActive(current);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [entry.ticker]);
  const focusSection = (id: string) => {
    setActive(id);
    requestAnimationFrame(() =>
      document.getElementById(id)?.focus({ preventScroll: true }),
    );
  };
  const difference = (
    value: string | null | undefined,
    base: string | null | undefined,
  ) => {
    const computed = dividendComparison(value, base);
    return formatDividendValue(
      computed === null ? null : String(computed),
      "percent",
    );
  };
  return (
    <div className="fundamental-center dividend-dashboard">
      <header className="fc-company-header">
        <div className="fc-company-identity">
          <CompanyLogo ticker={entry.ticker} size="lg" loading="eager" />
          <div>
            <h1
              id="fc-overview-heading"
              ref={titleRef}
              tabIndex={-1}
              className="display-title"
            >
              {entry.companyName}
            </h1>
            <p className="fc-company-meta">
              <strong>{entry.ticker}</strong>
              <span aria-hidden="true"> · </span>
              {entry.sector || "Atuação não informada"}
            </p>
          </div>
          <p className="fc-reference-date">
            Pesquisa de dividendos
            <strong>{formatDividendValue(data.updatedOn, "date")}</strong>
            <span>Fonte: planilha da publicação</span>
          </p>
        </div>
        <dl className="fc-summary-strip">
          {(
            [
              "referencePrice",
              "ceilingPrice",
              "estimatedGrossDividendYield",
              "safetyMargin",
              "marketValue",
              "totalShares",
            ] as const
          ).map((field) => (
            <MetricRow
              key={field}
              entry={entry}
              field={field}
              compact={field === "marketValue" || field === "totalShares"}
              label={
                {
                  referencePrice: "Cotação de referência",
                  ceilingPrice: "Preço teto",
                  estimatedGrossDividendYield: "DY bruto estimado",
                  safetyMargin: "Margem de segurança",
                  marketValue: "Valor de mercado",
                  totalShares: "Total de ações",
                }[field]
              }
            />
          ))}
        </dl>
      </header>
      <nav
        ref={navRef}
        className="fc-section-nav dividend-section-nav"
        aria-label="Seções da análise"
      >
        {navigation.map((section) => (
          <a
            key={section.id}
            href={"#" + section.id}
            aria-current={active === section.id ? "location" : undefined}
            onClick={() => focusSection(section.id)}
          >
            {section.label}
          </a>
        ))}
      </nav>
      <section
        id="visao-geral"
        tabIndex={-1}
        aria-labelledby="fc-summary-heading"
        className="fc-section fc-overview"
      >
        <div id="insights" tabIndex={-1} className="fc-insights">
          <h2 id="fc-summary-heading">Visão geral</h2>
          <div className="fc-insight-grid">
            <div data-insight="price">
              <h3>Cotação em relação ao teto</h3>
              <strong>
                {difference(data.referencePrice, data.ceilingPrice)}
              </strong>
              <p>(cotação ÷ preço teto − 1) × 100</p>
            </div>
            <div data-insight="pe">
              <h3>P/L projetado em relação à média</h3>
              <strong>
                {difference(data.projectedPE, data.averagePE10Years)}
              </strong>
              <p>(P/L projetado ÷ P/L médio − 1) × 100</p>
            </div>
            <div>
              <h3>Margem de segurança da fonte</h3>
              <strong>
                {formatDividendValue(data.safetyMargin, "percentInteger")}
              </strong>
              <p>Percentual e arredondamento da planilha.</p>
            </div>
          </div>
          <p className="fc-source-note">
            Comparações educativas com bases positivas. Valores negativos
            indicam relação abaixo da referência; não representam recomendação
            ou retorno garantido.
          </p>
        </div>
      </section>
      <section
        id="cotacao"
        tabIndex={-1}
        aria-labelledby="fc-price-heading"
        className="fc-section"
      >
        <header className="fc-section-heading">
          <h2 id="fc-price-heading">Cotação</h2>
          <label className="fc-toggle">
            <input
              type="checkbox"
              checked={showCeiling}
              onChange={(event) => setShowCeiling(event.target.checked)}
            />
            Mostrar preço teto
          </label>
        </header>
        <div className="fc-analysis-grid">
          <ComparativeDividendChart
            title="Cotação de referência e preço teto"
            unit="Reais por ação"
            format="currency"
            referenceDate={data.updatedOn}
            items={[
              { label: "Cotação", value: data.referencePrice },
              ...(showCeiling
                ? [{ label: "Preço teto", value: data.ceilingPrice }]
                : []),
            ]}
          />
          <aside className="fc-statistics" aria-label="Referências de preço">
            <h3>Referências de preço</h3>
            <dl>
              {(
                ["referencePrice", "ceilingPrice", "safetyMargin"] as const
              ).map((field) => (
                <MetricRow
                  key={field}
                  entry={entry}
                  field={field}
                  label={
                    field === "referencePrice"
                      ? "Cotação de referência"
                      : field === "ceilingPrice"
                        ? "Preço teto"
                        : undefined
                  }
                />
              ))}
            </dl>
            <p className="fc-source-note">{explanations.ceilingPrice}</p>
          </aside>
        </div>
        <p className="fc-history-status">
          Cotação na data da pesquisa. Histórico de preços, proventos e
          resultados indisponível nesta publicação.
        </p>
      </section>
      <section
        id="dividendos"
        tabIndex={-1}
        aria-labelledby="fc-dividends-heading"
        className="fc-section"
      >
        <header className="fc-section-heading">
          <h2 id="fc-dividends-heading">Dividendos</h2>
          <span>Projeções brutas</span>
        </header>
        <div className="fc-analysis-grid">
          <div>
            <ComparativeDividendChart
              title="Payout esperado e referência de lucro"
              unit="Percentual do lucro estimado"
              format="percent"
              referenceDate={data.updatedOn}
              items={[
                { label: "Payout", value: data.expectedPayout },
                { label: "Referência 100%", value: "1" },
              ]}
            />
            <p className="fc-source-note">
              100% representa o lucro estimado. O payout pode superar essa
              referência; a projeção não corresponde a um pagamento realizado.
            </p>
          </div>
          <aside className="fc-statistics" aria-label="Projeções de dividendos">
            <h3>Projeções de dividendos</h3>
            <dl>
              {(
                [
                  "estimatedGrossDividendYield",
                  "projectedGrossDividendPerShare",
                  "expectedPayout",
                ] as const
              ).map((field) => (
                <MetricRow key={field} entry={entry} field={field} />
              ))}
            </dl>
            <Calendar text={data.announcementMonths} />
            <dl className="fc-distribution-notes">
              {(["announcementFrequency", "announcementMonths"] as const).map(
                (field) => (
                  <MetricRow key={field} entry={entry} field={field} />
                ),
              )}
            </dl>
          </aside>
        </div>
      </section>
      <section
        id="indicadores"
        tabIndex={-1}
        aria-labelledby="fc-indicators-heading"
        className="fc-section"
      >
        <span id="valuation" tabIndex={-1} className="fc-anchor-alias" />
        <header className="fc-section-heading">
          <h2 id="fc-indicators-heading">Indicadores</h2>
          <span>Dados da pesquisa</span>
        </header>
        <div className="fc-category-grid">
          {categories.map(({ title, keys, canonical }) => (
            <section key={title} className="fc-category" aria-label={title}>
              <header>
                <h3>{title}</h3>
                <span>
                  {keys.length}{" "}
                  {keys.length === 1 ? "indicador" : "indicadores"}
                </span>
              </header>
              <dl className="dividend-information">
                {keys.map((field) => (
                  <MetricRow
                    key={field}
                    entry={entry}
                    field={field}
                    canonical={canonical}
                  />
                ))}
              </dl>
            </section>
          ))}
        </div>
        <div className="fc-analysis-grid fc-valuation-comparison">
          <ComparativeDividendChart
            title="P/L projetado e média de dez anos"
            unit="P/L em vezes"
            format="number"
            referenceDate={data.updatedOn}
            items={[
              { label: "P/L projetado", value: data.projectedPE },
              { label: "P/L médio", value: data.averagePE10Years },
            ]}
          />
          <aside className="fc-statistics">
            <h3>Como ler o P/L</h3>
            <p>
              O múltiplo relaciona o preço da ação ao lucro por ação. A média de
              dez anos é uma referência informada na pesquisa.
            </p>
            <p className="fc-source-note">
              A comparação percentual na visão geral usa apenas bases positivas.
              Um múltiplo menor, isoladamente, não determina a qualidade da
              empresa.
            </p>
          </aside>
        </div>
      </section>
      <section
        id="resultados"
        tabIndex={-1}
        aria-labelledby="fc-results-heading"
        className="fc-section"
      >
        <header className="fc-section-heading">
          <h2 id="fc-results-heading">Resultados</h2>
          <span>Estimativas da pesquisa</span>
        </header>
        <div className="fc-analysis-grid">
          <ComparativeDividendChart
            title="Lucro e dividendo por ação"
            unit="Reais por ação"
            format="currency"
            referenceDate={data.updatedOn}
            items={[
              { label: "LPA estimado", value: data.estimatedEps },
              {
                label: "DPA projetado",
                value: data.projectedGrossDividendPerShare,
              },
            ]}
          />
          <aside className="fc-statistics" aria-label="Resultados estimados">
            <h3>Resultados estimados</h3>
            <dl>
              {(
                [
                  "estimatedNetIncome",
                  "estimatedEps",
                  "earningsCagr5Years",
                ] as const
              ).map((field) => (
                <MetricRow key={field} entry={entry} field={field} />
              ))}
            </dl>
            <p className="fc-source-note">
              LPA e DPA têm a mesma unidade: reais por ação. O lucro líquido é o
              valor total da empresa; o CAGR resume a taxa anual composta de
              crescimento em cinco anos.
            </p>
          </aside>
        </div>
      </section>
      <section
        id="informacoes-da-empresa"
        tabIndex={-1}
        aria-labelledby="fc-company-heading"
        className="fc-section"
      >
        <header className="fc-section-heading">
          <h2 id="fc-company-heading">Informações da empresa</h2>
        </header>
        <div className="fc-company-panel">
          <dl className="dividend-information">
            {(
              [
                "companyName",
                "ticker",
                "sector",
                "totalShares",
                "marketValue",
                "updatedOn",
              ] as const
            ).map((field) => (
              <MetricRow key={field} entry={entry} field={field} canonical />
            ))}
          </dl>
          <div className="fc-company-description">
            <h3>{entry.companyName}</h3>
            <p>{entry.sector || "Atuação não informada"}</p>
            <p className="fc-source-note">
              Identidade e indicadores da planilha desta publicação. A origem e
              a autoria estão registradas abaixo.
            </p>
          </div>
        </div>
      </section>
      <a
        className="fc-back-top"
        href="#fc-overview-heading"
        onClick={() =>
          requestAnimationFrame(() =>
            titleRef.current?.focus({ preventScroll: true }),
          )
        }
      >
        <ArrowUp size={17} aria-hidden="true" />
        Voltar ao topo
      </a>
    </div>
  );
}
