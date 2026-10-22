import { useId } from "react";
import type { ReactNode, RefObject } from "react";
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

const sections = [
  {
    id: "visao-geral",
    title: "Visão geral",
    keys: [
      "companyName",
      "ticker",
      "sector",
      "totalShares",
      "marketValue",
      "referencePrice",
      "updatedOn",
    ],
  },
  {
    id: "valuation",
    title: "Valuation e margem de segurança",
    keys: [
      "projectedPE",
      "averagePE10Years",
      "peDeviation",
      "ceilingPrice",
      "safetyMargin",
    ],
  },
  {
    id: "dividendos",
    title: "Dividendos e distribuição",
    keys: [
      "expectedPayout",
      "projectedGrossDividendPerShare",
      "estimatedGrossDividendYield",
      "announcementFrequency",
      "announcementMonths",
    ],
  },
  {
    id: "resultados",
    title: "Resultados, crescimento e endividamento",
    keys: [
      "estimatedNetIncome",
      "earningsCagr5Years",
      "netDebtToEbitda",
      "estimatedEps",
    ],
  },
] as const;
const explanations: Partial<Record<DividendColumnKey, string>> = {
  referencePrice:
    "Referência histórica da planilha; não é uma cotação ao vivo.",
  projectedPE: "Relação entre preço e lucro estimado por ação, em vezes.",
  averagePE10Years:
    "Média informada dos últimos 10 anos; não é uma série histórica.",
  peDeviation:
    "Desvio registrado na fonte, preservando o arredondamento original.",
  ceilingPrice:
    "Premissa histórica: yield de 6,81%, taxa do Tesouro IPCA+ 2037 com juros semestrais indicada na planilha. Não representa a taxa atual.",
  safetyMargin:
    "Margem registrada na planilha; não é potencial de retorno nem garantia.",
  expectedPayout:
    "Parcela esperada do lucro a distribuir. Pode superar 100%; não representa distribuição realizada.",
  projectedGrossDividendPerShare:
    "Estimativa bruta por ação, antes de eventuais deduções.",
  estimatedGrossDividendYield:
    "Rendimento bruto estimado em relação à cotação de referência; não é dividendo recebido.",
  announcementFrequency:
    "Frequência habitual informada, sem garantia de anúncios futuros.",
  announcementMonths:
    "Meses habituais de anúncios, não datas garantidas de pagamento.",
  estimatedNetIncome:
    "Lucro estimado da empresa, sem transformar a projeção em fato realizado.",
  earningsCagr5Years:
    "Taxa anual composta informada para cinco anos; não descreve cada ano isoladamente.",
  netDebtToEbitda:
    "Relação em vezes. Um valor negativo isolado não comprova caixa líquido: faltam os sinais separados de dívida líquida e EBITDA.",
  estimatedEps:
    "Lucro estimado dividido pela quantidade de ações, conforme a fonte.",
};

function Metric({
  entry,
  field,
  children,
  compact = false,
}: {
  entry: Entry;
  field: DividendColumnKey;
  children?: ReactNode;
  compact?: boolean;
}) {
  const column = dividendColumns.find((item) => item.key === field)!;
  const value = dividendValue(entry, field);
  const exact = formatDividendValue(value, column.format);
  const shortened = compact
    ? compactDividendValue(
        value,
        field === "totalShares" ? "quantity" : "currency",
      )
    : exact;
  return (
    <div
      data-field={field}
      className={
        "dividend-metric" +
        (field === "referencePrice" || field === "estimatedGrossDividendYield"
          ? " dividend-metric-prominent"
          : "")
      }
    >
      <dt>
        {field === "ceilingPrice" ? (
          <Tooltip content={column.label}>
            <button type="button" className="dividend-label-help">
              Preço Teto
              <span className="sr-only">
                {column.label.slice("Preço Teto".length)}
              </span>
            </button>
          </Tooltip>
        ) : (
          column.label
        )}
      </dt>
      <dd data-exact-value={exact}>
        {children ||
          (shortened !== exact ? (
            <Tooltip content={exact}>
              <button
                type="button"
                className="dividend-exact-value"
                aria-label={
                  column.label + ": " + shortened + ". Ver valor completo"
                }
              >
                {shortened}
              </button>
            </Tooltip>
          ) : (
            exact
          ))}
      </dd>
      {explanations[field] && (
        <dd className="dividend-metric-explanation">{explanations[field]}</dd>
      )}
    </div>
  );
}

function ComparisonChart({
  title,
  unit,
  items,
  format,
}: {
  title: string;
  unit: string;
  items: { label: string; value: string | null | undefined }[];
  format: DividendFormat;
}) {
  const id = useId();
  const numbers = items.map((item) => dividendNumber(item.value));
  const available = numbers.every((value) => value !== null);
  const min = Math.min(0, ...numbers.map((value) => value ?? 0));
  const max = Math.max(0, ...numbers.map((value) => value ?? 0));
  const span = max - min || 1;
  const zero = (-min / span) * 100;
  return (
    <figure className="dividend-comparison" aria-labelledby={id}>
      <figcaption id={id}>
        <h3>{title}</h3>
        <p>{unit} · comparação de valores, sem evolução temporal</p>
      </figcaption>
      {items.map((item, index) => {
        const value = numbers[index];
        const end = (((value ?? 0) - min) / span) * 100;
        const formatted = formatDividendValue(item.value, format);
        return (
          <Tooltip
            key={item.label}
            content={item.label + ": " + formatted + " · " + unit}
          >
            <button
              type="button"
              className="dividend-chart-row"
            >
              <span className="dividend-chart-row-label">
                {item.label}{" "}
                <strong>{formatted}</strong>
              </span>
              <span className="dividend-chart-track" aria-hidden="true">
                {available && (
                  <>
                    <span
                      className="dividend-chart-zero"
                      style={{ left: zero + "%" }}
                    />
                    <span
                      className={
                        "dividend-chart-bar" +
                        (index ? " dividend-chart-bar-reference" : "")
                      }
                      style={{
                        left: Math.min(zero, end) + "%",
                        width: Math.abs(end - zero) + "%",
                      }}
                    />
                  </>
                )}
              </span>
            </button>
          </Tooltip>
        );
      })}
      <p className="dividend-chart-note">
        {available
          ? "As barras partem de zero e compartilham a mesma escala. Foque ou passe o ponteiro para ler os valores."
          : "Barras indisponíveis: falta um dos valores. Os dados não informados não são convertidos em zero."}
      </p>
    </figure>
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
    <figure className="dividend-signed" aria-label={label}>
      <figcaption>
        {label}
        <strong>
          {formatDividendValue(value, format)}
          {format === "number" ? " vezes" : ""}
        </strong>
      </figcaption>
      <div className="dividend-signed-track" aria-hidden="true">
        <span className="dividend-chart-zero" style={{ left: "50%" }} />
        {number !== null && (
          <span
            className="dividend-chart-bar"
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
          : (number < 0
              ? "Valor negativo"
              : number > 0
                ? "Valor positivo"
                : "Valor zero") +
            " · eixo central em zero. Escala: " +
            formatDividendValue(String(-extent), format) +
            " a " +
            formatDividendValue(String(extent), format) +
            "."}
      </p>
    </figure>
  );
}

const monthNames = [
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
function AnnouncementCalendar({ text }: { text: string | null | undefined }) {
  const months = dividendAnnouncementMonths(text);
  return (
    <div className="dividend-calendar">
      <h3>Calendário habitual de anúncios</h3>
      <p>
        {months
          ? "Meses destacados constam do texto da planilha. Anúncios habituais não garantem pagamentos futuros."
          : "Meses não identificados na fonte. Nenhum mês foi presumido a partir da frequência."}
      </p>
      <ol aria-label="Meses habituais de anúncios">
        {monthNames.map((month, index) => (
          <li key={month} data-announced={months?.includes(index + 1) || false}>
            {month}
            <span className="sr-only">
              {months?.includes(index + 1)
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
  const peDifference = dividendComparison(
    data.projectedPE,
    data.averagePE10Years,
  );
  const priceDifference = dividendComparison(
    data.referencePrice,
    data.ceilingPrice,
  );
  const percent = (value: number | null) =>
    formatDividendValue(value === null ? null : String(value), "percent");
  const field = (key: DividendColumnKey) => (
    <Metric key={key} entry={entry} field={key} />
  );
  return (
    <div className="dividend-dashboard">
      <nav className="dividend-section-nav" aria-label="Seções da análise">
        {[
          ...sections.map(({ id, title }) => ({ id, title })),
          { id: "insights", title: "Insights da ação" },
        ].map(({ id, title }) => (
          <a
            key={id}
            href={"#" + id}
            onClick={() =>
              requestAnimationFrame(() =>
                document.getElementById(id)?.focus({ preventScroll: true }),
              )
            }
          >
            {title}
          </a>
        ))}
      </nav>
      <section
        id="visao-geral"
        tabIndex={-1}
        aria-labelledby="overview-title"
        className="dividend-dashboard-section"
      >
        <h2 id="overview-title" className="sr-only">
          Visão geral
        </h2>
        <header className="dividend-dashboard-header">
          <CompanyLogo ticker={entry.ticker} size="lg" loading="eager" />
          <dl className="dividend-identity-fields dividend-information">
            <Metric entry={entry} field="companyName">
              <h1 ref={titleRef} tabIndex={-1} className="display-title">
                {entry.companyName}
              </h1>
            </Metric>
            {(["ticker", "sector", "updatedOn"] as const).map(field)}
          </dl>
        </header>
        <dl className="dividend-overview-cards dividend-information">
          <Metric entry={entry} field="referencePrice" />
          <Metric entry={entry} field="marketValue" compact />
          <Metric entry={entry} field="totalShares" compact />
        </dl>
      </section>
      <section
        id="valuation"
        tabIndex={-1}
        aria-labelledby="valuation-title"
        className="dividend-dashboard-section"
      >
        <div className="dividend-section-heading">
          <h2 id="valuation-title">Valuation e margem de segurança</h2>
          <p>Referências da planilha, sem classificação de compra ou venda.</p>
        </div>
        <dl className="dividend-metric-grid dividend-information">
          {sections[1].keys.map(field)}
        </dl>
        <div className="dividend-charts-grid">
          <ComparisonChart
            title="P/L projetado e média de 10 anos"
            unit="P/L em vezes"
            format="number"
            items={[
              { label: "P/L projetado", value: data.projectedPE },
              { label: "P/L médio", value: data.averagePE10Years },
            ]}
          />
          <ComparisonChart
            title="Cotação de referência e preço teto"
            unit="Reais por ação"
            format="currency"
            items={[
              { label: "Cotação de referência", value: data.referencePrice },
              { label: "Preço teto", value: data.ceilingPrice },
            ]}
          />
        </div>
        <SignedIndicator
          label="Margem de segurança da planilha"
          value={data.safetyMargin}
          format="percentInteger"
        />
      </section>
      <section
        id="dividendos"
        tabIndex={-1}
        aria-labelledby="dividends-title"
        className="dividend-dashboard-section"
      >
        <div className="dividend-section-heading">
          <h2 id="dividends-title">Dividendos e distribuição</h2>
          <p>
            Estimativas brutas e hábitos de anúncio; não são dividendos
            efetivamente distribuídos.
          </p>
        </div>
        <dl className="dividend-metric-grid dividend-information">
          {sections[2].keys.map(field)}
        </dl>
        <div className="dividend-charts-grid">
          <ComparisonChart
            title="Payout esperado em relação ao lucro"
            unit="Percentual do lucro estimado"
            format="percent"
            items={[
              { label: "Payout esperado", value: data.expectedPayout },
              { label: "Referência de 100%", value: "1" },
            ]}
          />
          <AnnouncementCalendar text={data.announcementMonths} />
        </div>
        <p className="dividend-context-note">
          A marca de 100% representa o lucro estimado, não um limite ou meta de
          payout. Valores acima de 100% ou negativos permanecem visíveis.
        </p>
      </section>
      <section
        id="resultados"
        tabIndex={-1}
        aria-labelledby="results-title"
        className="dividend-dashboard-section"
      >
        <div className="dividend-section-heading">
          <h2 id="results-title">Resultados, crescimento e endividamento</h2>
          <p>
            Valores consolidados e estimados; nenhum histórico anual foi
            reconstruído.
          </p>
        </div>
        <dl className="dividend-metric-grid dividend-information">
          {sections[3].keys.map(field)}
        </dl>
        <div className="dividend-charts-grid">
          <SignedIndicator
            label="Crescimento composto de lucros em cinco anos"
            value={data.earningsCagr5Years}
          />
          <SignedIndicator
            label="Relação dívida líquida/EBITDA"
            value={data.netDebtToEbitda}
            format="number"
          />
        </div>
      </section>
      <section
        id="insights"
        tabIndex={-1}
        aria-labelledby="insights-title"
        className="dividend-dashboard-section"
      >
        <div className="dividend-section-heading">
          <h2 id="insights-title">Insights da ação</h2>
          <p>
            Leituras quantitativas, sem recomendação personalizada. Cálculos
            derivados não substituem os valores originais.
          </p>
        </div>
        <div className="dividend-insight-grid">
          <div data-insight="pe">
            <h3>P/L projetado em relação à média</h3>
            <strong>{percent(peDifference)}</strong>
            <p>
              Fórmula: (P/L projetado ÷ P/L médio − 1) × 100. Somente valores e
              referência maiores que zero.
            </p>
            {peDifference === null && (
              <p>Comparação não aplicável aos valores disponíveis.</p>
            )}
          </div>
          <div data-insight="price">
            <h3>Cotação em relação ao teto</h3>
            <strong>{percent(priceDifference)}</strong>
            <p>
              Fórmula: (cotação de referência ÷ preço teto − 1) × 100. Um
              resultado negativo descreve cotação abaixo do teto; não é
              recomendação.
            </p>
            {priceDifference === null && (
              <p>Comparação não aplicável aos valores disponíveis.</p>
            )}
          </div>
          <div>
            <h3>Margem informada, não recalculada</h3>
            <strong>
              {formatDividendValue(data.safetyMargin, "percentInteger")}
            </strong>
            <p>
              Preserva o valor e o arredondamento da planilha. Não equivale ao
              retorno esperado.
            </p>
          </div>
          <div>
            <h3>Projeções e crescimento</h3>
            <p>
              DY bruto estimado:{" "}
              {formatDividendValue(data.estimatedGrossDividendYield, "percent")}
              . Payout esperado:{" "}
              {formatDividendValue(data.expectedPayout, "percent")}. CAGR
              informado:{" "}
              {formatDividendValue(data.earningsCagr5Years, "percent")}.
            </p>
            <p>
              Estimativas não são pagamentos realizados, nem trajetória anual de
              lucros.
            </p>
          </div>
          <div>
            <h3>Frequência e endividamento</h3>
            <p>
              Frequência informada:{" "}
              {formatDividendValue(data.announcementFrequency, "text")}. Dívida
              líquida/EBITDA:{" "}
              {formatDividendValue(data.netDebtToEbitda, "number")} vezes.
            </p>
            <p>{explanations.netDebtToEbitda}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
