import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import {
  ArrowUp,
  BarChart3,
  Building2,
  CalendarDays,
  Coins,
  Gauge,
  Info,
} from "lucide-react";
import {
  dividendColumns,
  dividendValue,
  formatDividendValue,
} from "../../dividend-analysis.mjs";
import type {
  DividendColumnKey,
  DividendFormat,
} from "../../dividend-analysis.mjs";
import {
  compactDividendValue,
  dividendNumber,
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
    icon: Gauge,
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
    icon: Building2,
    keys: ["netDebtToEbitda"],
    canonical: true,
  },
  {
    title: "Rentabilidade",
    icon: BarChart3,
    keys: ["estimatedNetIncome", "estimatedEps", "earningsCagr5Years"],
    canonical: true,
  },
  {
    title: "Dividendos",
    icon: Coins,
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
    icon: Gauge,
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
      <dd data-exact-value={exact}>
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
function SignedIndicator({
  label,
  value,
  format = "percent",
}: {
  label: string;
  value: string | null | undefined;
  format?: DividendFormat;
}) {
  const number = dividendNumber(value);
  const extent = Math.max(1, Math.abs(number ?? 0));
  const relative = number === null ? 0 : (number / extent) * 50;
  return (
    <figure className="fc-signed" aria-label={label}>
      <figcaption>
        {label}
        <strong>
          {formatDividendValue(value, format)}
          {format === "number" ? " vezes" : ""}
        </strong>
      </figcaption>
      <div className="fc-signed-track" aria-hidden="true">
        <i />
        {number !== null && (
          <span
            style={{
              left: Math.min(50, 50 + relative) + "%",
              width: Math.abs(relative) + "%",
            }}
          />
        )}
      </div>
      <p>
        {number === null
          ? "Valor não informado; sem indicador visual."
          : "Zero no centro. Escala: " +
            formatDividendValue(String(-extent), format) +
            " a " +
            formatDividendValue(String(extent), format) +
            "."}
      </p>
    </figure>
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
          ? "Destaques conforme o texto da fonte; não são datas garantidas de pagamentos."
          : "Meses não identificados na fonte. Nenhum mês foi presumido a partir da frequência."}
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
      <section
        id="visao-geral"
        tabIndex={-1}
        aria-labelledby="fc-overview-heading"
        className="fc-section fc-overview"
      >
        <div className="fc-company-identity">
          <CompanyLogo ticker={entry.ticker} size="lg" loading="eager" />
          <div>
            <p className="fc-kicker">Central de análise fundamentalista</p>
            <h1
              id="fc-overview-heading"
              ref={titleRef}
              tabIndex={-1}
              className="display-title"
            >
              {entry.companyName}
            </h1>
            <p className="fc-company-meta">
              {entry.ticker}
              <span aria-hidden="true"> / </span>
              {entry.sector || "Atuação não informada"}
            </p>
          </div>
          <p className="fc-reference-date">
            Referência da planilha
            <strong>{formatDividendValue(data.updatedOn, "date")}</strong>
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
              label={{referencePrice:"Cotação de referência",ceilingPrice:"Preço teto",estimatedGrossDividendYield:"DY bruto estimado",safetyMargin:"Margem de segurança",marketValue:"Valor de mercado",totalShares:"Total de ações"}[field]}
              compact={field === "marketValue" || field === "totalShares"}
            />
          ))}
        </dl>
        <div id="insights" tabIndex={-1} className="fc-insights">
          <h2>Visão geral</h2>
          <p>
            Indicadores e estimativas desta publicação. A cotação é uma
            referência histórica, sem atualização ao vivo.
          </p>
          <div className="fc-insight-grid">
            <div data-insight="price">
              <h3>Cotação em relação ao teto</h3>
              <strong>
                {difference(data.referencePrice, data.ceilingPrice)}
              </strong>
              <p>
                (cotação ÷ teto − 1) × 100. Um resultado negativo descreve
                cotação abaixo do teto; não é recomendação.
              </p>
            </div>
            <div data-insight="pe">
              <h3>P/L projetado em relação à média</h3>
              <strong>
                {difference(data.projectedPE, data.averagePE10Years)}
              </strong>
              <p>
                (P/L projetado ÷ P/L médio − 1) × 100. Comparações só se aplicam
                quando ambos os valores são positivos.
              </p>
            </div>
            <div>
              <h3>Margem da fonte</h3>
              <strong>
                {formatDividendValue(data.safetyMargin, "percentInteger")}
              </strong>
              <p>
                Valor e arredondamento da planilha preservados, sem substituir
                pelo cálculo derivado e sem retorno garantido.
              </p>
            </div>
          </div>
        </div>
      </section>
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
        id="cotacao"
        tabIndex={-1}
        aria-labelledby="fc-price-heading"
        className="fc-section"
      >
        <header className="fc-section-heading">
          <div>
            <p className="fc-kicker">Preço e premissa</p>
            <h2 id="fc-price-heading">Cotação</h2>
            <p>
              Comparação dos valores disponíveis na planilha. Sem histórico
              confiável, não há curva temporal ou filtros de período.
            </p>
          </div>
          <label className="fc-toggle">
            <input
              type="checkbox"
              checked={showCeiling}
              onChange={(event) => setShowCeiling(event.target.checked)}
            />
            Mostrar preço teto
          </label>
        </header>
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
        <p className="fc-methodology">{explanations.ceilingPrice}</p>
      </section>
      <section
        id="dividendos"
        tabIndex={-1}
        aria-labelledby="fc-dividends-heading"
        className="fc-section"
      >
        <header className="fc-section-heading">
          <div>
            <p className="fc-kicker">Projeções e hábitos</p>
            <h2 id="fc-dividends-heading">Dividendos</h2>
            <p>
              Valores brutos projetados, distintos de dividendos efetivamente
              distribuídos. Não há série anual ou eventos de pagamento nesta
              fonte.
            </p>
          </div>
        </header>
        <dl className="fc-feature-metrics">
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
        <div className="fc-two-panels">
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
          <Calendar text={data.announcementMonths} />
        </div>
        <dl className="fc-distribution-notes">
          {(["announcementFrequency", "announcementMonths"] as const).map(
            (field) => (
              <MetricRow key={field} entry={entry} field={field} />
            ),
          )}
        </dl>
        <p className="fc-methodology">
          100% é uma referência matemática do lucro, não limite ou meta de
          payout. Valores acima de 100% ou negativos não são cortados. Meses de
          anúncios não garantem pagamentos futuros.
        </p>
      </section>
      <section
        id="indicadores"
        tabIndex={-1}
        aria-labelledby="fc-indicators-heading"
        className="fc-section"
      >
        <span id="valuation" tabIndex={-1} className="fc-anchor-alias" />
        <header className="fc-section-heading">
          <div>
            <p className="fc-kicker">Leitura por categoria</p>
            <h2 id="fc-indicators-heading">Indicadores</h2>
            <p>
              Rótulos e valores da fonte, com explicações disponíveis por foco e
              ponteiro.
            </p>
          </div>
        </header>
        <div className="fc-category-grid">
          {categories.map(({ title, icon: Icon, keys, canonical }) => (
            <section key={title} className="fc-category" aria-label={title}>
              <header>
                <Icon size={18} aria-hidden="true" />
                <h3>{title}</h3>
                <span>{keys.length} {keys.length === 1 ? "indicador" : "indicadores"}</span>
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
      </section>
      <section
        id="resultados"
        tabIndex={-1}
        aria-labelledby="fc-results-heading"
        className="fc-section"
      >
        <header className="fc-section-heading">
          <div>
            <p className="fc-kicker">Resultado e crescimento</p>
            <h2 id="fc-results-heading">Resultados</h2>
            <p>
              Resultados estimados e crescimento composto informado. Não foram
              reconstruídos trimestres, receitas ou valores de EBITDA.
            </p>
          </div>
        </header>
        <dl className="fc-feature-metrics">
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
        <div className="fc-two-panels">
          <SignedIndicator
            label="Crescimento composto dos lucros em cinco anos"
            value={data.earningsCagr5Years}
          />
          <div className="fc-reading-note">
            <h3>O que estes números permitem ler</h3>
            <p>{explanations.earningsCagr5Years}</p>
            <p>{explanations.netDebtToEbitda}</p>
            <p>
              Os valores são consolidados ou estimados. Uma comparação entre
              anos depende de uma fonte histórica adicional.
            </p>
          </div>
        </div>
      </section>
      <section
        id="informacoes-da-empresa"
        tabIndex={-1}
        aria-labelledby="fc-company-heading"
        className="fc-section"
      >
        <header className="fc-section-heading">
          <div>
            <p className="fc-kicker">Identidade e referência</p>
            <h2 id="fc-company-heading">Informações da empresa</h2>
            <p>
              Informações verificadas nesta publicação, sem completar lacunas
              com dados externos.
            </p>
          </div>
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
          <div className="fc-reading-note">
            <h3>Contexto disponível</h3>
            <p>
              A fonte identifica empresa, atuação, quantidade de ações, valor de
              mercado e atualização.
            </p>
            <p>
              Descrição institucional, site, administração, controladores e
              fatos relevantes não constam desta publicação e não foram
              presumidos.
            </p>
            <p>
              A origem e a autoria, quando informada, estão registradas abaixo
              em Sobre esta publicação.
            </p>
          </div>
        </div>
      </section>
      <a
        className="fc-back-top"
        href="#visao-geral"
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
