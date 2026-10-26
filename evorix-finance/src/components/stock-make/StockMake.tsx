import {
  useEffect,
  useState,
  useMemo,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import type { Entry } from "../../lib/ranking";
import { CompanyLogo } from "../CompanyLogo";
import {
  DividendCalendar,
  DividendChart,
  PerformanceChart,
  PriceChart,
  ResultsCharts,
} from "./Charts";
import {
  brl,
  num,
  pct,
  makeStockData,
  StockContext,
  useStockData,
  dividendColumns,
  explanations,
  type DividendColumnKey,
} from "./data";
import { InfoTip, SectionHead, Tag, type DataKind } from "./ui";

const sections = [
  { id: "visao-geral", label: "Visão geral" },
  { id: "cotacao", label: "Cotação" },
  { id: "dividendos", label: "Dividendos" },
  { id: "indicadores", label: "Indicadores" },
  { id: "resultados", label: "Resultados" },
  { id: "empresa", label: "Empresa" },
  { id: "entenda", label: "Entenda os números" },
];

function Stat({
  label,
  tip,
  children,
  accent,
  sub,
}: {
  label: string;
  tip: string;
  children: ReactNode;
  accent?: boolean;
  sub?: string;
}) {
  return (
    <div className="min-w-0" data-summary={label}>
      <div className="flex items-center gap-1.5 text-xs text-fmk-sub">
        {label}
        <InfoTip label={label} text={tip} />
      </div>
      <div
        className={`mt-1.5 font-fmk-serif text-[28px] leading-none md:text-3xl ${accent ? "text-fmk-teal" : ""}`}
      >
        {children}
      </div>
      {sub && (
        <div className="mt-1.5 font-fmk-mono text-[11px] text-fmk-dim">
          {sub}
        </div>
      )}
    </div>
  );
}

function Header({
  titleRef,
  backLink,
}: {
  titleRef: RefObject<HTMLHeadingElement | null>;
  backLink: ReactNode;
}) {
  const { company, value } = useStockData();
  return (
    <header>
      <div className="mx-auto max-w-[1280px] px-5 pt-8 md:px-10">
        {backLink}

        <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
          <div className="flex items-center gap-5">
            <CompanyLogo ticker={company.ticker} size="lg" loading="eager" />
            <div>
              <h1
                ref={titleRef}
                tabIndex={-1}
                className="font-fmk-serif text-4xl font-medium leading-tight tracking-tight md:text-5xl"
              >
                {company.short}
              </h1>
              <p className="mt-1 text-sm text-fmk-sub">
                <span className="rounded-sm bg-fmk-raised px-1.5 py-0.5 font-fmk-mono text-xs text-fmk-ink">
                  {company.ticker}
                </span>
                <span className="ml-2">
                  {company.name} · {company.sector}
                </span>
              </p>
            </div>
          </div>
          <div className="text-right text-xs leading-relaxed text-fmk-dim">
            <div className="mt-2">
              Pesquisa de dividendos ·{" "}
              <span className="text-fmk-sub">{company.updated}</span>
            </div>
            <div>Fonte: planilha da publicação</div>
          </div>
        </div>

        <div className="fmk-stats mt-8 grid grid-cols-2 gap-x-6 gap-y-7 border-y border-fmk-line py-6 md:grid-cols-5">
          <div className="col-span-2 md:col-span-1">
            <Stat
              label="Cotação de referência"
              accent
              tip="Preço da ação usado como base de todos os cálculos da pesquisa, na data indicada."
            >
              {brl(company.price)}
            </Stat>
          </div>
          <Stat
            label="DY bruto estimado"
            tip="Dividend Yield: dividendos projetados por ação divididos pela cotação. Mostra quanto a empresa distribui em relação ao preço."
          >
            {value("estimatedGrossDividendYield")}
          </Stat>
          <Stat
            label="P/L projetado"
            tip="Preço dividido pelo lucro por ação projetado: quantos anos de lucro, no ritmo projetado, o preço representa."
          >
            {value("projectedPE")}
          </Stat>
          <Stat
            label="Preço-teto"
            tip="Preço máximo que a pesquisa considera coerente para o dividendo projetado."
          >
            {brl(company.teto)}
          </Stat>
          <Stat
            label="Margem de segurança"
            tip="Margem de segurança e arredondamento preservados da fonte, sem recalcular."
          >
            {value("safetyMargin")}
          </Stat>
        </div>
      </div>
    </header>
  );
}

function Nav({ active }: { active: string }) {
  return (
    <nav
      aria-label="Seções da análise"
      className="sticky top-0 z-40 border-b border-fmk-line bg-fmk-bg/95"
    >
      <div className="mx-auto flex max-w-[1280px] gap-1 overflow-x-auto px-3 md:px-9">
        {sections.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            aria-current={active === s.id ? "location" : undefined}
            onClick={() =>
              requestAnimationFrame(() =>
                document.getElementById(s.id)?.focus({ preventScroll: true }),
              )
            }
            className={`relative whitespace-nowrap px-3 py-4 text-sm transition-colors ${active === s.id ? "text-fmk-ink" : "text-fmk-sub hover:text-fmk-ink"}`}
          >
            {s.label}
            <span
              className={`absolute inset-x-3 bottom-0 h-0.5 bg-fmk-teal transition-opacity ${active === s.id ? "opacity-100" : "opacity-0"}`}
            />
          </a>
        ))}
      </div>
    </nav>
  );
}

/* ───────── Visão geral ───────── */
function Overview() {
  const {
    company,
    dy,
    marginSeg,
    marketCapBi,
    profitEst,
    cagrLucro,
    value,
    number,
    priceDifference,
    peDifference,
  } = useStockData();
  const rows: [string, string, string, DataKind][] = [
    [
      "Lucro líquido estimado",
      profitEst === null ? "Não informado" : `R$ ${num(profitEst, 2)} bi`,
      "Lucro líquido total estimado informado na pesquisa.",
      "estimado",
    ],
    [
      "CAGR de lucros · 5 anos",
      pct(cagrLucro, 1, true),
      "Taxa composta de crescimento dos lucros em cinco anos.",
      "informado",
    ],
    [
      "Dívida líquida / EBITDA",
      value("netDebtToEbitda"),
      explanations.netDebtToEbitda!,
      "informado",
    ],
    [
      "Dividend yield estimado",
      pct(dy),
      "Dividendos projetados ÷ cotação.",
      "projetado",
    ],
  ];
  const comparable =
    company.price !== null &&
    company.price > 0 &&
    company.teto !== null &&
    company.teto > 0;
  const scale = comparable ? Math.max(company.price!, company.teto!) : 1;
  const trackPos = comparable ? (company.price! / scale) * 100 : 0;
  const ceilingPos = comparable ? (company.teto! / scale) * 100 : 0;
  return (
    <section
      id="visao-geral"
      tabIndex={-1}
      aria-labelledby="visao-geral-t"
      className="scroll-mt-16 pt-14"
    >
      <SectionHead
        id="visao-geral"
        n="01"
        title="Visão geral"
        lede="Um resumo analítico dos números que sustentam a pesquisa. Interpretações estatísticas, não recomendação."
      />
      <div className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div className="fmk-overview-figures grid gap-8 sm:grid-cols-2">
            <div>
              <div className="text-sm text-fmk-sub">
                Cotação em relação ao teto
              </div>
              <div className="mt-2 font-fmk-serif text-6xl leading-none tracking-tight md:text-7xl">
                {pct(priceDifference, 1)}
              </div>
              <p className="mt-3 font-fmk-mono text-[11px] text-fmk-dim">
                (cotação ÷ preço-teto − 1) × 100
              </p>
            </div>
            <div>
              <div className="text-sm text-fmk-sub">Valor de mercado</div>
              <div className="mt-2 font-fmk-serif text-6xl leading-none tracking-tight md:text-7xl">
                {marketCapBi === null ? "Não informado" : num(marketCapBi, 1)}
                {marketCapBi !== null && (
                  <span className="ml-1 text-3xl text-fmk-sub">bi</span>
                )}
              </div>
              <p className="mt-3 font-fmk-mono text-[11px] text-fmk-dim">
                {value("totalShares")} ações · valor de mercado da fonte
              </p>
            </div>
          </div>

          <figure className="mt-10">
            <figcaption className="mb-3 flex items-center justify-between text-xs text-fmk-sub">
              <span>
                Cotação frente ao preço-teto · margem de segurança{" "}
                {pct(marginSeg)}
              </span>
              <Tag kind="estimado" />
            </figcaption>
            {comparable ? (
              <div
                className="relative h-10"
                role="img"
                aria-label={`Cotação ${brl(company.price)}; preço teto ${brl(company.teto)}; margem informada ${value("safetyMargin")}.`}
              >
                <div className="absolute inset-x-0 top-5 h-1.5 rounded-full bg-fmk-line" />
                <div
                  className="absolute left-0 top-5 h-1.5 rounded-full bg-fmk-teal"
                  style={{ width: `${trackPos}%` }}
                />
                <div
                  className="hatch absolute top-5 h-1.5"
                  style={{ left: `${trackPos}%`, right: 0 }}
                />
                <div
                  className="absolute top-2.5 -translate-x-1/2 text-center"
                  style={{ left: `${trackPos}%` }}
                >
                  <div className="mx-auto h-5 w-px bg-fmk-ink" />
                </div>
                <div
                  className="absolute -top-0.5 whitespace-nowrap font-fmk-mono text-[11px] text-fmk-ink"
                  style={{
                    left: `${trackPos}%`,
                    transform: `translateX(-${trackPos}%)`,
                  }}
                >
                  {brl(company.price)}
                </div>
                <div
                  className="absolute top-8 whitespace-nowrap font-fmk-mono text-[11px] text-fmk-amber"
                  style={{
                    left: `${ceilingPos}%`,
                    transform: `translateX(-${ceilingPos}%)`,
                  }}
                >
                  teto {brl(company.teto)}
                </div>
                {ceilingPos >= 30 && (
                  <div className="absolute left-0 top-8 font-fmk-mono text-[11px] text-fmk-dim">
                    R$ 0
                  </div>
                )}
              </div>
            ) : (
              <p role="status" className="h-10 text-sm text-fmk-dim">
                Comparação indisponível: cotação ou preço teto não informado ou
                sem base positiva.
              </p>
            )}
          </figure>

          <dl className="mt-12 divide-y divide-fmk-line-soft border-t border-fmk-line">
            {rows.map(([k, v, tip, kind]) => (
              <div
                key={k}
                className="flex items-center justify-between gap-4 py-3.5"
              >
                <dt className="flex items-center gap-2 text-sm text-fmk-sub">
                  {k}
                  <InfoTip label={k} text={tip} />
                </dt>
                <dd className="flex items-center gap-5">
                  <span className="hidden sm:block">
                    <Tag kind={kind} />
                  </span>
                  <span className="w-28 text-right font-fmk-serif text-2xl">
                    {v}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="space-y-10 lg:col-span-5 lg:border-l lg:border-fmk-line lg:pl-10">
          <div>
            <h3 className="font-fmk-mono text-[11px] uppercase tracking-[0.14em] text-fmk-dim">
              Entenda esta empresa
            </h3>
            <p className="mt-3 font-fmk-serif text-xl leading-snug">
              {company.name} · {company.sector}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-fmk-sub">
              A pesquisa identifica a atuação e os indicadores abaixo. Descrição
              institucional detalhada indisponível nesta publicação.
            </p>
          </div>
          <div>
            <h3 className="font-fmk-mono text-[11px] uppercase tracking-[0.14em] text-fmk-dim">
              Insights quantitativos
            </h3>
            <ul className="mt-4 divide-y divide-fmk-line-soft">
              {[
                [
                  "●",
                  peDifference === null
                    ? "Comparação de P/L indisponível sem bases positivas."
                    : `P/L projetado: ${value("projectedPE")}; média: ${value("averagePE10Years")}. Diferença relativa: ${pct(peDifference, 1, true)}.`,
                ],
                [
                  "●",
                  `Margem de segurança informada na fonte: ${value("safetyMargin")}. Não representa retorno esperado.`,
                ],
                [
                  "●",
                  number("expectedPayout") === null
                    ? "Payout não informado."
                    : `Payout esperado: ${value("expectedPayout")}. ${number("expectedPayout")! > 1 ? "Supera 100% do lucro estimado." : number("expectedPayout")! < 0 ? "A projeção é negativa; sua leitura exige contexto." : "Parcela esperada do lucro a distribuir, sem garantia de pagamento."}`,
                ],
              ].map(([g, t]) => (
                <li key={t} className="flex gap-3 py-3 text-sm leading-relaxed">
                  <span
                    className="mt-0.5 font-fmk-mono text-xs text-fmk-teal"
                    aria-hidden
                  >
                    {g}
                  </span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs leading-relaxed text-fmk-dim">
              Leituras estatísticas dos dados da pesquisa. Não constituem
              recomendação de compra ou venda.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────── Indicadores ───────── */
function Gauge({
  value,
  max,
  mark,
  label,
}: {
  value: number;
  max: number;
  mark?: number;
  label: string;
}) {
  max = Math.max(max, value, mark ?? 0, 1);
  return (
    <div
      className="relative h-1.5 w-24 rounded-full bg-fmk-line"
      role="img"
      aria-label={label}
    >
      <div
        className="absolute left-0 top-0 h-full rounded-full bg-fmk-teal/80"
        style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
      />
      {mark != null && (
        <div
          className="absolute -top-1 h-3.5 w-px bg-fmk-amber"
          style={{ left: `${(mark / max) * 100}%` }}
        />
      )}
    </div>
  );
}

type Ind = {
  key: DividendColumnKey;
  label: string;
  tip: string;
  value: string;
  tone?: "up" | "down" | "na";
  kind: DataKind;
  viz?: ReactNode;
};
function Indicators() {
  const data = useStockData();
  const definitions: { title: string; keys: DividendColumnKey[] }[] = [
    {
      title: "Avaliação",
      keys: [
        "projectedPE",
        "averagePE10Years",
        "peDeviation",
        "ceilingPrice",
        "safetyMargin",
      ],
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
    },
    {
      title: "Rentabilidade e crescimento",
      keys: ["estimatedNetIncome", "estimatedEps", "earningsCagr5Years"],
    },
    { title: "Endividamento", keys: ["netDebtToEbitda"] },
    {
      title: "Mercado",
      keys: ["referencePrice", "marketValue", "totalShares"],
    },
  ];
  const groups = definitions.map((group) => ({
    ...group,
    items: group.keys.map((key): Ind => {
      const column = dividendColumns.find((c) => c.key === key)!;
      const number = data.number(key);
      const kind: DataKind = [
        "projectedPE",
        "estimatedGrossDividendYield",
        "projectedGrossDividendPerShare",
        "expectedPayout",
      ].includes(key)
        ? "projetado"
        : [
              "estimatedNetIncome",
              "estimatedEps",
              "ceilingPrice",
              "safetyMargin",
            ].includes(key)
          ? "estimado"
          : "informado";
      const max =
        key === "projectedPE"
          ? Math.max(data.company.plMed ?? 0, 16)
          : key === "expectedPayout" || key === "safetyMargin"
            ? 1
            : 4;
      return {
        key,
        label: column.label,
        value: data.value(key),
        tip: explanations[key] || "Informação preservada da pesquisa.",
        kind,
        tone:
          number === null && column.format !== "text"
            ? "na"
            : ["peDeviation", "earningsCagr5Years"].includes(key)
              ? number! > 0
                ? "up"
                : number! < 0
                  ? "down"
                  : undefined
              : undefined,
        viz:
          [
            "projectedPE",
            "expectedPayout",
            "safetyMargin",
            "netDebtToEbitda",
          ].includes(key) &&
          number !== null &&
          number >= 0 ? (
            <Gauge
              value={number}
              max={max}
              mark={
                key === "projectedPE" &&
                data.company.plMed !== null &&
                data.company.plMed >= 0
                  ? data.company.plMed
                  : undefined
              }
              label={column.label + ": " + data.value(key)}
            />
          ) : undefined,
      };
    }),
  }));
  return (
    <section
      id="indicadores"
      tabIndex={-1}
      aria-labelledby="indicadores-t"
      className="scroll-mt-16 pt-20"
    >
      <SectionHead
        id="indicadores"
        n="04"
        title="Indicadores"
        lede="Agrupados por pergunta que o investidor costuma fazer. Passe o cursor ou foque o “i” para ler a explicação."
        right={
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-fmk-sub">
            <span>
              <span className="text-fmk-up">▲</span> sinal positivo
            </span>
            <span>
              <span className="text-fmk-down">▼</span> sinal negativo
            </span>
            <span className="text-fmk-dim">
              Sinais indicam direção, não qualidade.
            </span>
          </div>
        }
      />
      <div className="grid gap-x-16 gap-y-12 lg:grid-cols-2">
        {groups.map((g, gi) => (
          <div key={g.title} className={gi === 0 ? "lg:row-span-2" : ""}>
            <h3 className="border-b border-fmk-line pb-2 font-fmk-serif text-xl">
              {g.title}
            </h3>
            <ul>
              {g.items.map((it) => (
                <li
                  key={it.label}
                  data-field={it.key}
                  className="fmk-metric-row grid grid-cols-[1fr_auto] items-center gap-x-4 border-b border-fmk-line-soft py-3.5 sm:grid-cols-[minmax(0,1fr)_104px_auto_96px]"
                >
                  <span className="flex items-center gap-2 text-sm text-fmk-sub">
                    {it.label}
                    <InfoTip label={it.label} text={it.tip} />
                  </span>
                  <span className="hidden sm:block">{it.viz}</span>
                  <span
                    data-exact-value={it.value}
                    className={`fmk-exact text-right font-fmk-mono text-[15px] ${it.tone === "up" ? "text-fmk-up" : it.tone === "down" ? "text-fmk-down" : it.tone === "na" ? "italic text-fmk-dim" : ""}`}
                  >
                    {it.tone === "up" && <span aria-hidden>▲ </span>}
                    {it.tone === "down" && <span aria-hidden>▼ </span>}
                    {it.value}
                  </span>
                  <span className="hidden justify-end sm:flex">
                    <Tag kind={it.kind} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ───────── Empresa ───────── */
function Company() {
  const { company, value } = useStockData();
  return (
    <section
      id="empresa"
      tabIndex={-1}
      aria-labelledby="empresa-t"
      className="scroll-mt-16 pt-20"
    >
      <SectionHead
        id="empresa"
        n="06"
        title="Informações da empresa"
        lede="Identidade e dados corporativos disponíveis na pesquisa."
      />
      <div className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <h3 className="font-fmk-mono text-[11px] uppercase tracking-[0.14em] text-fmk-dim">
            Sobre a empresa
          </h3>
          <p className="mt-3 max-w-prose font-fmk-serif text-2xl leading-snug">
            {company.name}
          </p>
          <div className="mt-6 grid gap-8 text-sm leading-relaxed text-fmk-sub sm:grid-cols-2">
            <div>
              <h4 className="mb-1.5 font-medium text-fmk-ink">Atuação</h4>
              <p>{company.sector}</p>
            </div>
            <div>
              <h4 className="mb-1.5 font-medium text-fmk-ink">
                Descrição institucional
              </h4>
              <p>Indisponível nesta publicação.</p>
            </div>
          </div>
          <h3 className="mt-12 font-fmk-mono text-[11px] uppercase tracking-[0.14em] text-fmk-dim">
            Estrutura societária
          </h3>
          <p className="mt-4 text-sm text-fmk-sub">
            Dados societários não informados na pesquisa.
          </p>
        </div>
        <div className="space-y-10 lg:col-span-5 lg:border-l lg:border-fmk-line lg:pl-10">
          <div>
            <h3 className="font-fmk-mono text-[11px] uppercase tracking-[0.14em] text-fmk-dim">
              Institucional
            </h3>
            <dl className="mt-3 divide-y divide-fmk-line-soft text-sm">
              {(["companyName", "ticker", "sector", "updatedOn"] as const).map(
                (key) => (
                  <div
                    key={key}
                    data-field={key}
                    className="flex flex-wrap justify-between gap-3 py-2.5"
                  >
                    <dt className="text-fmk-sub">
                      {dividendColumns.find((c) => c.key === key)!.label}
                    </dt>
                    <dd
                      data-exact-value={value(key)}
                      className="fmk-exact font-fmk-mono"
                    >
                      {value(key)}
                    </dd>
                  </div>
                ),
              )}
            </dl>
          </div>
          <div>
            <h3 className="font-fmk-mono text-[11px] uppercase tracking-[0.14em] text-fmk-dim">
              Administração
            </h3>
            <p className="mt-3 text-sm text-fmk-sub">
              Informações não disponíveis nesta publicação.
            </p>
          </div>
          <div>
            <h3 className="font-fmk-mono text-[11px] uppercase tracking-[0.14em] text-fmk-dim">
              Fatos relevantes
            </h3>
            <p className="mt-3 text-sm text-fmk-sub">
              Consulte os canais oficiais da empresa para documentos
              corporativos atualizados.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────── Entenda os números ───────── */
function Learn() {
  const { company, value, number, peDifference } = useStockData();
  const lessons = [
    {
      q: "O que significa um P/L acima da média histórica?",
      a: "O múltiplo relaciona preço e lucro por ação. Acima da média indica que se paga mais por cada real de lucro, mas não determina a qualidade do investimento.",
      ex:
        peDifference === null
          ? "Comparação indisponível sem bases positivas."
          : `P/L projetado ${value("projectedPE")}, média ${value("averagePE10Years")}: diferença relativa ${pct(peDifference, 1, true)}.`,
    },
    {
      q: "Como interpretar a margem de segurança?",
      a: "É a margem informada na metodologia da pesquisa. Depende das premissas e não garante retorno. O preço teto usa a premissa histórica de 6,81%, não uma taxa atual de mercado.",
      ex: `Margem da fonte: ${value("safetyMargin")}; cotação ${brl(company.price)} e preço teto ${brl(company.teto)}.`,
    },
    {
      q: "O que o payout indica?",
      a: "É a parcela esperada do lucro a distribuir como dividendo. A projeção pode superar 100% e não deve ser lida como dividendo já recebido.",
      ex: `Payout da pesquisa: ${value("expectedPayout")}. ${number("expectedPayout") !== null && number("expectedPayout")! > 1 ? "A projeção supera o lucro estimado." : "Sua interpretação depende do contexto da projeção."}`,
    },
    {
      q: "O que um CAGR positivo representa?",
      a: "CAGR é a taxa composta de crescimento anual no período. Pode ser positiva, negativa ou nula; não mostra como cada ano evoluiu.",
      ex: `CAGR de lucros em cinco anos: ${value("earningsCagr5Years")}.`,
    },
    {
      q: "Como interpretar dívida líquida/EBITDA?",
      a: explanations.netDebtToEbitda!,
      ex: `Dívida líquida/EBITDA: ${value("netDebtToEbitda")}. Não há limite setorial validado nesta fonte.`,
    },
    {
      q: "Qual a diferença entre dividendos realizados e projetados?",
      a: "Realizados dependem de eventos corporativos confirmados. Projetados são estimativas e podem mudar; um histórico só pode ser exibido com uma fonte autorizada.",
      ex: `Dividendo bruto projetado por ação: ${value("projectedGrossDividendPerShare")}. Não há histórico de pagamentos nesta publicação.`,
    },
  ];
  const [i, setI] = useState(0);
  const l = lessons[i];
  return (
    <section
      id="entenda"
      tabIndex={-1}
      aria-labelledby="entenda-t"
      className="scroll-mt-16 pt-20"
    >
      <SectionHead
        id="entenda"
        n="07"
        title="Entenda os números"
        lede="Explicações curtas para ler cada indicador com mais segurança. Conteúdo educativo, sem recomendação personalizada."
      />
      <div className="grid gap-10 lg:grid-cols-12">
        <ul
          className="lg:col-span-6"
          role="tablist"
          aria-label="Perguntas frequentes"
        >
          {lessons.map((x, n) => (
            <li key={x.q} className="border-b border-fmk-line-soft">
              <button
                role="tab"
                tabIndex={n === i ? 0 : -1}
                onKeyDown={(event) => {
                  const direction =
                    event.key === "ArrowRight" || event.key === "ArrowDown"
                      ? 1
                      : event.key === "ArrowLeft" || event.key === "ArrowUp"
                        ? -1
                        : 0;
                  const next =
                    event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? lessons.length - 1
                        : direction
                          ? (i + direction + lessons.length) % lessons.length
                          : null;
                  if (next !== null) {
                    event.preventDefault();
                    setI(next);
                    requestAnimationFrame(() =>
                      document.getElementById(`fmk-lesson-${next}`)?.focus(),
                    );
                  }
                }}
                id={`fmk-lesson-${n}`}
                aria-controls="fmk-lesson-panel"
                aria-selected={n === i}
                onClick={() => setI(n)}
                className={`flex w-full items-baseline gap-4 py-4 text-left transition-colors ${n === i ? "text-fmk-ink" : "text-fmk-sub hover:text-fmk-ink"}`}
              >
                <span
                  className={`font-fmk-mono text-xs ${n === i ? "text-fmk-teal" : "text-fmk-dim"}`}
                >
                  0{n + 1}
                </span>
                <span className="font-fmk-serif text-lg leading-snug">
                  {x.q}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div
          id="fmk-lesson-panel"
          role="tabpanel"
          aria-labelledby={`fmk-lesson-${i}`}
          className="lg:col-span-6 lg:border-l lg:border-fmk-line lg:pl-10"
        >
          <h3 className="font-fmk-serif text-2xl leading-snug">{l.q}</h3>
          <p className="mt-4 text-[15px] leading-relaxed text-fmk-sub">{l.a}</p>
          <div className="mt-6 border-l-2 border-fmk-teal pl-4">
            <div className="font-fmk-mono text-[11px] uppercase tracking-[0.14em] text-fmk-dim">
              Neste caso
            </div>
            <p className="mt-1 text-sm leading-relaxed">{l.ex}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function StockMake({
  entry,
  titleRef,
  backLink,
}: {
  entry: Entry;
  titleRef: RefObject<HTMLHeadingElement | null>;
  backLink: ReactNode;
}) {
  const model = useMemo(() => makeStockData(entry), [entry]);
  return (
    <StockContext value={model}>
      <StockPage titleRef={titleRef} backLink={backLink} />
    </StockContext>
  );
}
function StockPage({
  titleRef,
  backLink,
}: {
  titleRef: RefObject<HTMLHeadingElement | null>;
  backLink: ReactNode;
}) {
  const { company, value } = useStockData();
  const nav = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState("visao-geral");
  useEffect(() => {
    const ids = [...sections.map((s) => s.id)];
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: "-25% 0px -65% 0px" },
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [company.ticker]);

  return (
    <div id="topo" className="figma-stock min-h-screen">
      <Header titleRef={titleRef} backLink={backLink} />
      <div ref={nav} className="fmk-nav">
        <Nav active={active} />
      </div>
      <div className="mx-auto max-w-[1280px] px-5 pb-24 md:px-10">
        <Overview />

        <section
          id="cotacao"
          tabIndex={-1}
          aria-labelledby="cotacao-t"
          className="scroll-mt-16 pt-20"
        >
          <SectionHead
            id="cotacao"
            n="02"
            title="Cotação"
            lede="Cotação de referência comparada ao preço-teto da pesquisa, sem simular uma evolução temporal."
          />
          <PriceChart />
        </section>

        <section
          id="dividendos"
          tabIndex={-1}
          aria-labelledby="dividendos-t"
          className="scroll-mt-16 pt-20"
        >
          <SectionHead
            id="dividendos"
            n="03"
            title="Dividendos"
            lede="Dividendo projetado comparado ao lucro estimado por ação e meses habituais de anúncio."
          />
          <div className="fmk-stats mb-12 grid grid-cols-2 gap-x-6 gap-y-6 md:grid-cols-5">
            <Stat label="DY estimado" tip="Dividendo projetado ÷ cotação.">
              {value("estimatedGrossDividendYield")}
            </Stat>
            <Stat
              label="Dividendo projetado"
              tip="Provento bruto por ação projetado para o ano."
            >
              {brl(company.dpa)}
            </Stat>
            <Stat label="Payout esperado" tip="Parcela do lucro distribuída.">
              {value("expectedPayout")}
            </Stat>
            <Stat label="Frequência" tip="Número de anúncios por ano.">
              {value("announcementFrequency")}
            </Stat>
            <Stat
              label="Meses habituais"
              tip="Meses em que a empresa costuma anunciar proventos."
            >
              {value("announcementMonths")}
            </Stat>
          </div>
          <DividendChart />
          <div className="mt-14 border-t border-fmk-line pt-8">
            <DividendCalendar />
          </div>
        </section>

        <Indicators />

        <section
          id="resultados"
          tabIndex={-1}
          aria-labelledby="resultados-t"
          className="scroll-mt-16 pt-20"
        >
          <SectionHead
            id="resultados"
            n="05"
            title="Resultados"
            lede="Lucro estimado, crescimento agregado de cinco anos e endividamento da planilha, com unidades e metodologia."
          />
          <ResultsCharts />
          <div className="mt-16 border-t border-fmk-line pt-8">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h3 className="font-fmk-serif text-2xl">
                  P/L e média histórica
                </h3>
                <p className="mt-1 text-sm text-fmk-sub">
                  P/L projetado frente à média de dez anos da pesquisa; a média
                  histórica não descreve a trajetória de cada ano.
                </p>
              </div>
            </div>
            <PerformanceChart />
          </div>
        </section>

        <Company />
        <Learn />

        <footer className="mt-24 border-t border-fmk-line pt-6 text-xs leading-relaxed text-fmk-dim">
          <p className="max-w-3xl">
            Escola do Dividendo · Conteúdo educacional. Dados e estimativas da
            publicação na data de referência; não representam cotação ao vivo
            nem recomendação de investimento.
          </p>
        </footer>
      </div>
    </div>
  );
}
