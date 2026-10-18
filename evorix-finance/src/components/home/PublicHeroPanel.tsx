import { useId, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import "./hero-panel.css";

const topics = [
  {
    label: "Empresa",
    title: "Comece pelo negócio.",
    text: "Veja de onde vem a receita e como ela se transforma em resultado.",
    steps: ["Negócio", "Receita", "Resultado"],
    icons: ["building", "bars", "chart"],
    action: "Conhecer as empresas",
    path: "/ranking",
    questions: [
      ["Receita", "O que a empresa vende"],
      ["Resultado", "O que sobra após os custos"],
      ["Histórico", "Como o negócio evoluiu"],
    ],
  },
  {
    label: "Pesquisa",
    title: "Leia o que sustenta o cenário.",
    text: "Consulte as premissas, o prazo e o que mudou em cada revisão.",
    steps: ["Premissas", "Cenário", "Revisão"],
    icons: ["paper", "chart", "review"],
    action: "Explorar a pesquisa",
    path: "/ranking",
    questions: [
      ["Tese", "O que sustenta a estimativa"],
      ["Prazo", "Quando reavaliar o cenário"],
      ["Riscos", "O que pode mudar o resultado"],
    ],
  },
  {
    label: "Dividendos",
    title: "Do resultado à sua parte.",
    text: "Mude a distribuição e veja o dividendo por ação neste exemplo.",
    steps: ["Resultado", "Distribuição", "Acionista"],
    icons: ["bars", "distribution", "person"],
    action: "Estudar os dividendos",
    path: "/aprender",
    questions: [],
  },
] as const;

type SceneIcon = (typeof topics)[number]["icons"][number];

const integer = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const millions = (value: number) => `R$ ${integer.format(value)} milhões`;

function IconDrawing({ type }: { type: SceneIcon }) {
  switch (type) {
    case "building":
      return (
        <>
          <path d="M-13 15V-13H8V15M8-3H15V15M-17 15H18M-4 15V6H2V15" />
          <path d="M-7-7H-4M1-7H4M-7 0H-4M1 0H4" />
        </>
      );
    case "bars":
      return (
        <>
          <path d="M-15 15H16M-11 10V0H-5V10M-2 10V-8H4V10M7 10V-15H13V10" />
        </>
      );
    case "chart":
      return (
        <>
          <path d="M-15-13V15H16M-10 6L-3-3 5 0 15-12M9-12H15V-6" />
        </>
      );
    case "paper":
      return (
        <>
          <path d="M-11-15H6L13-8V15H-11ZM5-15V-7H13M-5-1H7M-5 5H7M-5 11H3" />
        </>
      );
    case "review":
      return (
        <>
          <path d="M11-8A14 14 0 1 0 14 5M11-15V-7H3M-6 0L-1 5 7-4" />
        </>
      );
    case "distribution":
      return (
        <>
          <path d="M0-8V1M-11 11V1H11V11" />
          <rect x="-5" y="-17" width="10" height="9" rx="2" />
          <rect x="-16" y="11" width="10" height="7" rx="2" />
          <rect x="6" y="11" width="10" height="7" rx="2" />
        </>
      );
    case "person":
      return (
        <>
          <circle cx="0" cy="-8" r="7" />
          <path d="M-14 16V11C-14 0 14 0 14 11V16Z" />
        </>
      );
  }
}

function FlowScene({ selected }: { selected: number }) {
  const topic = topics[selected];
  return (
    <svg
      className="ph-panel-scene"
      viewBox="0 0 360 146"
      fill="none"
      aria-hidden="true"
      focusable="false"
      key={topic.label}
    >
      <path
        d="M56 55C98 55 108 43 133 43H225C249 43 263 55 304 55"
        fill="none"
        stroke="#50625f"
        className="ph-panel-track"
      />
      <path
        d="M56 55C98 55 108 43 133 43H225C249 43 263 55 304 55"
        pathLength="100"
        fill="none"
        stroke="#a9d9d1"
        className="ph-panel-signal"
      />
      <path
        d="M20 126H340"
        fill="none"
        stroke="#4f5967"
        className="ph-panel-baseline"
      />
      {topic.steps.map((step, index) => (
        <g
          key={step}
          className="ph-panel-node"
          style={{ animationDelay: `${index * 60}ms` }}
        >
          <rect
            x={27 + index * 124}
            y="26"
            width="58"
            height="58"
            rx="13"
            fill="#20252c"
            stroke={index === 1 ? "#7caaa3" : "#4f5967"}
            className={
              index === 1
                ? "ph-panel-node-surface ph-panel-node-center"
                : "ph-panel-node-surface"
            }
          />
          <g
            transform={`translate(${56 + index * 124} 55)`}
            fill="none"
            stroke="#a9d9d1"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="ph-panel-icon"
          >
            <IconDrawing type={topic.icons[index]} />
          </g>
          <text x={56 + index * 124} y="108" fill="#d5dbe5" textAnchor="middle">
            {step}
          </text>
        </g>
      ))}
    </svg>
  );
}

function DividendExample() {
  const [distribution, setDistribution] = useState(40);
  const rangeId = useId();
  const distributed = distribution;
  const perShare = (100_000_000 * distribution) / 100 / 50_000_000;

  return (
    <div className="ph-panel-calculator">
      <div className="ph-panel-example-label">
        <span>Exemplo didático</span>
        <span>Lucro → dividendo</span>
      </div>
      <p className="ph-panel-assumptions">
        R$ 100 milhões de lucro · 50 milhões de ações
      </p>
      <div className="ph-panel-range-label">
        <label htmlFor={rangeId}>Distribuição do lucro</label>
        <output htmlFor={rangeId}>{distribution}%</output>
      </div>
      <input
        id={rangeId}
        className="ph-panel-range"
        type="range"
        min="0"
        max="100"
        step="5"
        value={distribution}
        aria-valuetext={`${distribution} por cento. ${millions(distributed)} distribuídos. ${currency.format(perShare)} por ação.`}
        onChange={(event) => setDistribution(Number(event.currentTarget.value))}
      />
      <div className="ph-panel-profit-bar" aria-hidden="true">
        <span style={{ transform: `scaleX(${distribution / 100})` }} />
      </div>
      <div className="ph-panel-bar-key">
        <span>
          <i aria-hidden="true" />
          Distribuído
        </span>
        <span>
          <i aria-hidden="true" />
          Retido na empresa
        </span>
      </div>
      <dl className="ph-panel-results">
        <div>
          <dt>Total distribuído</dt>
          <dd>{millions(distributed)}</dd>
        </div>
        <div className="ph-panel-per-share">
          <dt>Dividendo por ação</dt>
          <dd>{currency.format(perShare)}</dd>
        </div>
      </dl>
      <Link className="ph-panel-method" to="/metodologia">
        Como este exemplo foi calculado{" "}
        <ArrowUpRight size={14} aria-hidden="true" />
      </Link>
    </div>
  );
}

export function PublicHeroPanel() {
  const [selected, setSelected] = useState(0);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const reducedMotion = useReducedMotion();
  const panelId = useId();
  const topic = topics[selected];

  return (
    <aside className="ph-hero-panel" aria-labelledby={`${panelId}-title`}>
      <div className="ph-panel-heading">
        <p className="edition-label">Por trás de uma ação</p>
        <span className="ph-panel-folio" aria-hidden="true">
          {String(selected + 1).padStart(2, "0")} / 03
        </span>
      </div>
      <h2 id={`${panelId}-title`} className="ph-panel-sr-only">
        Da empresa ao dividendo
      </h2>
      <div
        className="ph-panel-topics"
        role="tablist"
        aria-label="Escolha um tema para explorar"
      >
        {topics.map((item, index) => (
          <button
            key={item.label}
            ref={(element) => {
              buttons.current[index] = element;
            }}
            type="button"
            role="tab"
            id={`${panelId}-tab-${index}`}
            aria-selected={selected === index}
            tabIndex={selected === index ? 0 : -1}
            aria-controls={`${panelId}-content`}
            onClick={() => setSelected(index)}
            onKeyDown={(event) => {
              let next: number;
              if (event.key === "ArrowRight")
                next = (index + 1) % topics.length;
              else if (event.key === "ArrowLeft")
                next = (index + topics.length - 1) % topics.length;
              else if (event.key === "Home") next = 0;
              else if (event.key === "End") next = topics.length - 1;
              else return;
              event.preventDefault();
              setSelected(next);
              buttons.current[next]?.focus();
            }}
          >
            {selected === index && (
              <motion.span
                className="ph-panel-selection"
                layoutId={`${panelId}-selection`}
                transition={
                  reducedMotion
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 420, damping: 38, mass: 0.9 }
                }
                aria-hidden="true"
              />
            )}
            <span>{item.label}</span>
          </button>
        ))}
      </div>
      <FlowScene selected={selected} />
      <div
        id={`${panelId}-content`}
        role="tabpanel"
        aria-labelledby={`${panelId}-tab-${selected}`}
        tabIndex={0}
        className="ph-panel-content"
      >
        <div className="ph-panel-scene-copy" key={topic.label}>
          <h3>{topic.title}</h3>
          {selected !== 2 && <p>{topic.text}</p>}
        </div>
        {selected === 2 ? (
          <DividendExample />
        ) : (
          <dl className="ph-panel-reading">
            {topic.questions.map(([label, description]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{description}</dd>
              </div>
            ))}
          </dl>
        )}
        {selected !== 2 && (
          <Link to={topic.path} className="ph-panel-action">
            {topic.action} <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        )}
      </div>
    </aside>
  );
}
