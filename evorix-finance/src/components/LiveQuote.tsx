import { useId } from "react";
import { useLiveQuote, type LiveQuoteView } from "../hooks/useLiveQuotes";
import {
  decimal,
  quoteChange,
  quoteFields,
  quoteLine,
  quoteMoney,
  quotePercent,
  quoteSourceText,
  quoteTone,
  saoPauloMoment,
  type LiveQuote,
} from "../lib/liveQuotes";
import "./live-quote.css";

const toneClass = (quote: LiveQuote | null) => {
  const tone = quoteTone(quote);
  return tone === "up"
    ? "live-quote-up"
    : tone === "down"
      ? "live-quote-down"
      : undefined;
};

// Small line under the research price of the ranking. Its height is reserved
// from the first paint, so loading, unavailable and ready never move the row.
export function LiveQuoteLine({ view }: { view: LiveQuoteView }) {
  const line = quoteLine(view.quote);
  if (view.loading)
    return (
      <span className="live-quote-line" data-live-quote="loading">
        <span className="sr-only">Consultando a cotação atual.</span>
      </span>
    );
  if (!line || !view.quote)
    return (
      <span
        className="live-quote-line"
        data-live-quote="unavailable"
        title="Cotação atual da brapi.dev indisponível no momento."
      >
        cotação atual indisponível
      </span>
    );
  const source = quoteSourceText(view.quote);
  return (
    <span
      className="live-quote-line"
      data-live-quote={view.quote.stale ? "stale" : "ready"}
      title={source}
    >
      {line.prefix} {line.price}
      {line.percent && (
        <>
          {" · "}
          <span className={toneClass(view.quote)}>{line.percent}</span>
        </>
      )}
      <span className="sr-only"> {source}</span>
    </span>
  );
}

// "brapi.dev · com atraso · consultada às 10:48", always without "tempo real".
function sourceShort(quote: LiveQuote) {
  return [
    quote.stale ? "defasada" : null,
    quote.source,
    quote.delayMinutes
      ? `com atraso de até ${quote.delayMinutes} min`
      : "com atraso",
    quote.quoteTime
      ? `cotação de ${saoPauloMoment(quote.quoteTime)}`
      : quote.checkedAt
        ? `consultada às ${saoPauloMoment(quote.checkedAt)}`
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
    label: "text-sm text-evo-textSec",
    value: "font-numbers mt-1 text-lg font-semibold",
    note: "mt-3 text-xs leading-5 text-evo-textSec",
    empty: "text-sm text-evo-textSec",
  },
} as const;

// "Cotação atual" block of the company pages: brapi.dev numbers apart from
// the research; each field only when the source sends it.
export function LiveQuotePanel({
  ticker,
  researchPrice,
  variant,
}: {
  ticker: string;
  // The public page only carries three research indicators, not the price.
  researchPrice?: string;
  variant: keyof typeof variants;
}) {
  const id = useId();
  const style = variants[variant];
  const { quote, loading } = useLiveQuote(ticker);
  const price = decimal(quote?.price);
  const ready = quote && !quote.unavailable && price !== null;
  const change = decimal(quote?.change);
  const percent = decimal(quote?.changePercent);
  const fields = ready ? quoteFields(quote) : [];
  const state = loading
    ? "loading"
    : !ready
      ? "unavailable"
      : quote.stale
        ? "stale"
        : "ready";
  const Heading = variant === "public" ? "h2" : "h3";
  return (
    <section
      aria-labelledby={id}
      className={style.root}
      data-live-quote-block={state}
      data-live-quote-detail={ready ? quote.detail : undefined}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <Heading id={id} className={style.heading}>
          Cotação atual
        </Heading>
        {ready && (
          <p
            className={style.meta}
            title={quoteSourceText(quote)}
            data-live-quote-source
          >
            {sourceShort(quote)}
          </p>
        )}
      </div>
      <div className={style.card}>
        <div className="live-quote-body">
          {loading ? (
            <p role="status" className={style.empty}>
              Consultando a cotação na brapi.dev…
            </p>
          ) : !ready ? (
            <p className={style.empty} data-live-quote-unavailable>
              Cotação atual indisponível no momento. Os números da pesquisa
              continuam valendo como referência.
            </p>
          ) : (
            <>
              <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <span className={style.price} data-live-quote-price>
                  {quoteMoney(price)}
                </span>
                {(change !== null || percent !== null) && (
                  <span
                    className={style.change + " " + (toneClass(quote) ?? "")}
                    data-live-quote-change
                  >
                    {[
                      change === null ? null : quoteChange(change),
                      percent === null ? null : quotePercent(percent),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                    <span className="sr-only"> no dia</span>
                  </span>
                )}
              </p>
              {quote.stale && (
                <p className={style.meta + " mt-2"} data-live-quote-stale>
                  Defasada: a consulta mais recente falhou; esta é a última
                  cotação válida.
                </p>
              )}
              {fields.length > 0 && (
                <dl className={style.fields}>
                  {fields.map((field) => (
                    <div
                      key={field.key}
                      className="min-w-0"
                      data-live-quote-field={field.key}
                    >
                      <dt className={style.label}>{field.label}</dt>
                      <dd className={style.value}>{field.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </>
          )}
        </div>
        <p className={style.note}>
          {researchPrice
            ? `Preço da pesquisa: ${researchPrice}, da planilha publicada. `
            : ""}
          A cotação da brapi.dev chega com atraso e não altera os números da
          pesquisa.
        </p>
      </div>
    </section>
  );
}
