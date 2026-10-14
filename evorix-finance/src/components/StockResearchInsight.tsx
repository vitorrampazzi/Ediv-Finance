import { useEffect, useId, useRef, useState } from "react";
import type { Entry } from "../lib/ranking";
import { readResearchInsight } from "../lib/researchInsight";

const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
const percent = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 2,
  signDisplay: "exceptZero",
});
const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function StockResearchInsight({
  entry,
  demo,
}: {
  entry: Entry;
  demo: boolean;
}) {
  const insight = readResearchInsight(entry);
  const [active, setActive] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const stages = useRef<(HTMLLIElement | null)[]>([]);
  const graphicId = "insight-" + useId().replace(/[^a-z0-9]/gi, "");

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(preference.matches);
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (
      typeof IntersectionObserver === "undefined" ||
      insight.potential === null
    )
      return;
    const phoneSticky = window.matchMedia(
      "(max-width: 767px) and (min-height: 760px)",
    );
    let observer: IntersectionObserver;
    let frame = 0;
    let resizeFrame = 0;
    const update = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const center = window.innerHeight * (phoneSticky.matches ? 0.74 : 0.52);
        let nearest = -1;
        let distance = Infinity;
        stages.current.forEach((stage, index) => {
          if (!stage) return;
          const bounds = stage.getBoundingClientRect();
          if (bounds.bottom < 0 || bounds.top > window.innerHeight) return;
          const candidate = Math.abs(bounds.top + bounds.height / 2 - center);
          if (candidate < distance) {
            distance = candidate;
            nearest = index;
          }
        });
        if (nearest >= 0)
          setActive((previous) => (previous === nearest ? previous : nearest));
      });
    };
    const observe = () => {
      observer?.disconnect();
      const height = window.innerHeight;
      const top = Math.round(height * (phoneSticky.matches ? 0.58 : 0.2));
      const bottom = Math.round(height * (phoneSticky.matches ? 0.1 : 0.2));
      observer = new IntersectionObserver(update, {
        rootMargin: `-${top}px 0px -${bottom}px 0px`,
        threshold: [0, 0.25, 0.5, 0.75, 1],
      });
      stages.current.forEach((stage) => {
        if (stage) observer.observe(stage);
      });
    };
    const resize = () => {
      if (resizeFrame) window.cancelAnimationFrame(resizeFrame);
      resizeFrame = window.requestAnimationFrame(() => {
        resizeFrame = 0;
        observe();
      });
    };
    observe();
    phoneSticky.addEventListener("change", resize);
    window.addEventListener("resize", resize, { passive: true });
    return () => {
      observer.disconnect();
      phoneSticky.removeEventListener("change", resize);
      window.removeEventListener("resize", resize);
      if (frame) window.cancelAnimationFrame(frame);
      if (resizeFrame) window.cancelAnimationFrame(resizeFrame);
    };
  }, [insight.potential]);

  if (insight.potential === null || insight.scenarioIndex === null) {
    return (
      <section
        id="insight"
        className="scroll-mt-40 border-b border-evo-border py-7"
      >
        <h2 className="display-title text-2xl sm:text-3xl">
          Leitura visual do cenário
        </h2>
        <p className="mt-3 text-sm text-evo-textSec">
          O potencial ainda não foi informado nesta pesquisa.
        </p>
      </section>
    );
  }

  const value = insight.potential;
  const target = insight.scenarioIndex;
  const tone =
    value < 0
      ? "text-evo-red"
      : value > 0
        ? "text-evo-green"
        : "text-evo-accent";
  const y = (index: number) =>
    210 -
    ((index - insight.domainMin) / (insight.domainMax - insight.domainMin)) *
      175;
  const baseY = y(100);
  const targetY = y(target);
  const revealed = reducedMotion || active >= 1;
  const summary = [
    { label: "Referência da comparação", value: "Base 100" },
    {
      label: demo ? "Potencial simulado" : "Potencial informado",
      value: percent.format(value) + "%",
    },
    {
      label: demo ? "Preço-alvo do exemplo" : "Preço-alvo publicado",
      value:
        insight.targetPrice !== null
          ? money.format(insight.targetPrice)
          : "Não informado",
    },
  ][active];
  const narrative = [
    {
      label: "Base",
      title: "Um ponto de referência",
      text: "A comparação começa em 100. O ponto seguinte aplica o potencial informado na pesquisa a essa mesma base.",
    },
    {
      label: "Potencial",
      title: demo ? "O cenário do exemplo" : "O cenário publicado",
      text: `${percent.format(value)}% transforma a base 100 em ${number.format(target)} neste comparativo. O percentual é ${demo ? "simulado" : "o informado na publicação"}.`,
    },
    {
      label: "Contexto",
      title: "Preço-alvo e prazo",
      text: `${insight.targetPrice !== null ? "Preço-alvo: " + money.format(insight.targetPrice) + "." : "Preço-alvo não informado."} ${insight.horizonMonths !== null ? "Horizonte: " + insight.horizonMonths + " meses." : "Prazo não informado."} A tese e os riscos da pesquisa explicam as condições desse cenário.`,
    },
  ];
  const description = `Comparação em índice base 100 para ${entry.ticker}. Base 100 e cenário ${demo ? "simulado" : "publicado"} ${number.format(target)}, correspondente a ${percent.format(value)}%. São dois pontos de comparação, não uma série histórica de preços.`;

  return (
    <section
      id="insight"
      aria-labelledby={`${graphicId}-heading`}
      className="research-insight scroll-mt-40 border-b border-evo-border py-7 sm:py-9"
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="edition-label">
            {entry.ticker} · {demo ? "Dados fictícios" : "Dados da publicação"}
          </p>
          <h2
            id={`${graphicId}-heading`}
            className="display-title mt-2 text-2xl sm:text-3xl"
          >
            Leitura visual do cenário
          </h2>
        </div>
        <p className="text-xs text-evo-textSec">
          Role a página ou escolha uma etapa.
        </p>
      </div>
      <div className="research-insight-layout">
        <figure
          className="research-insight-visual"
          aria-label={`Insight de ${entry.ticker}`}
        >
          <div
            key={active}
            className="research-insight-summary flex min-h-7 items-baseline justify-between gap-3"
          >
            <p className="text-xs text-evo-textSec">{summary.label}</p>
            <strong
              className={`min-w-0 text-right font-numbers text-xl font-medium [overflow-wrap:anywhere] ${tone}`}
            >
              {summary.value}
            </strong>
          </div>
          <svg
            viewBox="0 0 560 280"
            className={`research-insight-svg ${tone}`}
            role="img"
            aria-labelledby={`${graphicId}-title ${graphicId}-description`}
          >
            <title id={`${graphicId}-title`}>
              Base 100 e cenário {number.format(target)}
            </title>
            <desc id={`${graphicId}-description`}>{description}</desc>
            <defs>
              <clipPath id={`${graphicId}-clip`}>
                <rect
                  x="0"
                  y="0"
                  height="280"
                  className="research-insight-reveal"
                  style={{ width: revealed ? 560 : 92 }}
                />
              </clipPath>
            </defs>
            {[insight.domainMax, 100, insight.domainMin].map((tick) => (
              <g key={tick}>
                <line
                  x1="76"
                  y1={y(tick)}
                  x2="494"
                  y2={y(tick)}
                  stroke="#4f5967"
                  strokeWidth="1"
                  opacity="0.6"
                />
                <text
                  x="63"
                  y={y(tick) + 6}
                  textAnchor="end"
                  fill="#d5dbe5"
                  fontSize="18"
                >
                  {number.format(tick)}
                </text>
              </g>
            ))}
            <line
              x1="92"
              y1={baseY}
              x2="470"
              y2={targetY}
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="7 8"
              opacity="0.18"
            />
            <g clipPath={`url(#${graphicId}-clip)`}>
              <line
                x1="92"
                y1={baseY}
                x2="470"
                y2={targetY}
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray="7 8"
              />
            </g>
            <circle cx="92" cy={baseY} r="7" fill="#d5dbe5" />
            <text x="105" y={baseY - 16} fill="#f6f7f9" fontSize="23">
              100
            </text>
            <g
              className="research-insight-endpoint"
              style={{ opacity: revealed ? 1 : 0.25 }}
            >
              <circle
                cx="470"
                cy={targetY}
                r="16"
                fill="currentColor"
                opacity={active === 2 ? 0.2 : 0.08}
              />
              <circle cx="470" cy={targetY} r="7" fill="currentColor" />
              <text
                x="457"
                y={targetY - 16}
                textAnchor="end"
                fill="currentColor"
                fontSize="23"
              >
                {number.format(target)}
              </text>
            </g>
            <text x="92" y="258" fill="#d5dbe5" fontSize="22">
              Base
            </text>
            <text x="470" y="258" textAnchor="end" fill="#d5dbe5" fontSize="22">
              {demo ? "Cenário simulado" : "Cenário publicado"}
            </text>
          </svg>
          <figcaption className="text-xs leading-5 text-evo-textSec">
            {active === 2
              ? insight.horizonMonths !== null
                ? `Horizonte da pesquisa: ${insight.horizonMonths} meses.`
                : "Horizonte da pesquisa não informado."
              : "Comparação em índice base 100."}
          </figcaption>
          <div
            role="group"
            aria-label="Etapas do insight"
            className="mt-2 grid grid-cols-3 gap-1 border-t border-evo-border pt-2"
          >
            {narrative.map((step, index) => (
              <button
                key={step.label}
                type="button"
                aria-pressed={active === index}
                aria-controls={`${graphicId}-step-${index}`}
                onClick={() => setActive(index)}
                className={`min-h-11 rounded-md px-2 text-sm transition-colors ${active === index ? "bg-evo-accent/10 text-evo-accent" : "text-evo-textSec hover:text-evo-textMain"}`}
              >
                {step.label}
              </button>
            ))}
          </div>
        </figure>
        <ol
          className="research-insight-stages"
          aria-label="Leitura do cenário em três etapas"
        >
          {narrative.map((step, index) => (
            <li
              key={step.label}
              id={`${graphicId}-step-${index}`}
              ref={(node) => {
                stages.current[index] = node;
              }}
              className={`research-insight-stage ${active === index ? "is-current" : ""}`}
            >
              <div>
                <p className="edition-label">
                  {String(index + 1).padStart(2, "0")} / {step.label}
                </p>
                <h3 className="mt-3 text-lg font-medium">{step.title}</h3>
                <p className="mt-3 max-w-md text-sm leading-7 text-evo-textSec">
                  {step.text}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
