import { useId } from "react";
import {
  consultedAt,
  decimal,
  quoteChange,
  quoteMoney,
  quoteVolume,
  saoPauloMoment,
  sessionFields,
  type LiveQuote,
} from "../lib/liveQuotes";
import type { MarketView } from "../lib/marketData";
import "./live-quote.css";

const toneClass = (tone: MarketView["price"]["tone"]) =>
  tone === "up" ? "live-quote-up" : tone === "down" ? "live-quote-down" : "";

// "Preço de mercado" of the ranking: the canonical quote, its change below in
// a subtle color, or the research price with its date. Both lines keep their
// height from the first paint, so no row moves when the numbers arrive.
export function MarketPriceCell({ view }: { view: MarketView }) {
  const { price } = view;
  return (
    <span
      className="market-cell"
      data-market-cell="price"
      data-market-state={price.state}
      title={price.title}
    >
      <span className="market-cell-value" data-market-value>
        {price.text}
      </span>
      <span className="market-cell-sub">
        {price.state === "stale" && price.qualifier}
        {price.change && (
          <>
            {price.state === "stale" ? " · " : ""}
            <span className={toneClass(price.tone)}>{price.change}</span>
          </>
        )}
        {(price.state === "research" || price.state === "unavailable") &&
          price.qualifier}
      </span>
      <span className="sr-only"> {price.title}</span>
    </span>
  );
}

// "Margem de segurança" of the ranking: two decimals, the formula with the
// actual values in the title, and "defasada" or the research date below.
export function MarketMarginCell({ view }: { view: MarketView }) {
  const { margin } = view;
  return (
    <span
      className="market-cell"
      data-market-cell="margin"
      data-market-state={margin.state}
      title={margin.title}
    >
      <span className="market-cell-value" data-market-value>
        {margin.text}
      </span>
      <span className="market-cell-sub">{margin.qualifier}</span>
      {margin.state === "loading" && (
        <span className="sr-only">{margin.title}</span>
      )}
    </span>
  );
}

// "brapi.dev · consultada às 10:48", never "tempo real".
function sourceShort(quote: LiveQuote, stale: boolean) {
  return [
    stale ? "defasada" : null,
    quote.source,
    quote.quoteTime
      ? `cotação de ${saoPauloMoment(quote.quoteTime)}`
      : quote.checkedAt
        ? `consultada ${consultedAt(quote.checkedAt)}`
        : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

const variants = {
  research: {
    root: "live-quote-block mb-12 border-b border-fmk-line pb-8",
    heading:
      "font-fmk-mono text-[11px] uppercase tracking-[0.14em] text-fmk-dim",
    card: "",
    meta: "font-fmk-mono text-[11px] text-fmk-dim",
    price: "font-fmk-serif text-4xl leading-none tracking-tight",
    change: "font-fmk-mono text-sm",
    fields:
      "mt-5 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-fmk-line-soft pt-4 sm:grid-cols-4",
    subheading: "mt-5 text-xs text-fmk-sub",
    label: "text-xs text-fmk-sub",
    value: "mt-1 font-fmk-mono text-[15px]",
    note: "mt-4 text-xs leading-relaxed text-fmk-sub",
    empty: "text-sm text-fmk-sub",
  },
  public: {
    root: "live-quote-block mt-8",
    heading: "text-xl font-semibold",
    card: "mt-4 rounded-xl border border-evo-border bg-evo-bgSec p-4",
    meta: "text-xs leading-5 text-evo-textSec",
    price: "font-numbers text-3xl font-semibold",
    change: "font-numbers text-sm font-semibold",
    fields: "mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4",
    subheading: "mt-4 text-sm text-evo-textSec",
    label: "text-sm text-evo-textSec",
    value: "font-numbers mt-1 text-lg font-semibold",
    note: "mt-3 text-xs leading-5 text-evo-textSec",
    empty: "text-sm text-evo-textSec",
  },
} as const;

// "Cotação atual" of the company pages. Price and margin come from the shared
// market data, the same as the ranking; the v2 quote only adds the session.
export function MarketQuotePanel({
  view,
  variant,
  detail = null,
  reference = null,
}: {
  view: MarketView;
  variant: keyof typeof variants;
  // /api/market/quote/:ticker: session data and the change in reais.
  detail?: LiveQuote | null;
  // The price and margin of the publication, kept as a reference.
  reference?: string | null;
}) {
  const id = useId();
  const style = variants[variant];
  const { price, margin, quote } = view;
  const live = price.state === "market" || price.state === "stale";
  // The change in reais only when it belongs to the price on screen.
  const change =
    live &&
    detail?.change != null &&
    decimal(detail.price) !== null &&
    decimal(detail.price) === decimal(price.value)
      ? decimal(detail.change)
      : null;
  const session = live ? (detail?.session ?? quote?.session ?? null) : null;
  const fields = sessionFields(session);
  const volume = live ? decimal(quote?.volume) : null;
  // The v2 quote time when brapi sends it; otherwise only when it was
  // consulted, never presented as the time of the quote.
  const sessionWhen = session?.quoteTime
    ? `cotação de ${saoPauloMoment(session.quoteTime)}`
    : session?.checkedAt
      ? `consultada ${consultedAt(session.checkedAt)}`
      : null;
  const Heading = variant === "public" ? "h2" : "h3";
  return (
    <section
      aria-labelledby={id}
      className={style.root}
      data-market-quote={price.state}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <Heading id={id} className={style.heading}>
          Cotação atual
        </Heading>
        {live && quote && (
          <p className={style.meta} title={price.title} data-market-source>
            {sourceShort(quote, price.state === "stale")}
          </p>
        )}
      </div>
      <div className={style.card}>
        <div className="live-quote-body">
          {price.state === "loading" ? (
            <p role="status" className={style.empty}>
              Consultando a cotação na brapi.dev…
            </p>
          ) : price.state === "unavailable" ? (
            <p className={style.empty} data-market-quote-unavailable>
              Cotação atual indisponível no momento. Os números da pesquisa
              continuam valendo como referência.
            </p>
          ) : (
            <>
              <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <span
                  className={style.price}
                  data-market-quote-price
                  title={price.title}
                >
                  {price.text}
                </span>
                {live && (change !== null || price.change) && (
                  <span
                    className={style.change + " " + toneClass(price.tone)}
                    data-market-quote-change
                  >
                    {[
                      change === null ? null : quoteChange(change),
                      price.change,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                    <span className="sr-only"> no dia</span>
                  </span>
                )}
                {price.state === "research" && (
                  <span className={style.meta}>{price.qualifier}</span>
                )}
              </p>
              {price.state === "stale" && (
                <p className={style.meta + " mt-2"} data-market-quote-stale>
                  Defasada: a consulta mais recente falhou; esta é a última
                  cotação válida.
                </p>
              )}
              {price.state === "research" && (
                <p className={style.meta + " mt-2"} data-market-quote-research>
                  Sem cotação válida da brapi.dev agora: este é o preço da
                  pesquisa.
                </p>
              )}
            </>
          )}
        </div>
        {fields.length > 0 && (
          <>
            <p className={style.subheading} data-market-session-time>
              Dados do pregão
              {sessionWhen ? ` · ${sessionWhen}` : ""}
            </p>
            <dl className={style.fields + " mt-2"}>
              {fields.map((field) => (
                <div
                  key={field.key}
                  className="min-w-0"
                  data-market-session-field={field.key}
                >
                  <dt className={style.label}>{field.label}</dt>
                  <dd className={style.value}>{field.value}</dd>
                </div>
              ))}
            </dl>
          </>
        )}
        {(variant === "research" || volume !== null) && (
          <dl className={style.fields}>
            {variant === "research" && (
              <div className="min-w-0" data-market-quote-field="ceiling">
                <dt className={style.label}>Preço-teto</dt>
                <dd className={style.value}>
                  {view.ceiling === null
                    ? "Não informado"
                    : quoteMoney(decimal(view.ceiling)!)}
                </dd>
                <dd className={style.label}>
                  {view.researchDay
                    ? `da pesquisa de ${view.researchDay}`
                    : "da pesquisa"}
                </dd>
              </div>
            )}
            {/* The public page shows the margin with the research indicators. */}
            {variant === "research" && (
              <div className="min-w-0" data-market-quote-field="margin">
                <dt className={style.label}>Margem de segurança</dt>
                <dd className={style.value} title={margin.title}>
                  {margin.state === "loading" ? "…" : margin.text}
                </dd>
                {margin.qualifier && (
                  <dd className={style.label}>{margin.qualifier}</dd>
                )}
              </div>
            )}
            {volume !== null && (
              <div className="min-w-0" data-market-quote-field="volume">
                <dt className={style.label}>Volume</dt>
                <dd className={style.value}>{quoteVolume(volume)}</dd>
              </div>
            )}
          </dl>
        )}
        {reference && (
          <p className={style.note} data-market-reference>
            {reference}
          </p>
        )}
        <p className={style.note}>
          A cotação vem da brapi.dev. DY e P/L ficam como na data
          da pesquisa; a margem de segurança acompanha a cotação.
        </p>
      </div>
    </section>
  );
}
