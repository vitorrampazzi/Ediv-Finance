import { useEffect, useId, useRef, useState } from "react";
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
    path: "/mercado",
  },
  {
    label: "Pesquisa",
    title: "Leia o que sustenta o cenário.",
    text: "Consulte as premissas, o prazo e o que mudou em cada revisão.",
    steps: ["Premissas", "Cenário", "Revisão"],
    icons: ["paper", "chart", "review"],
    action: "Explorar a pesquisa",
    path: "/ranking",
  },
  {
    label: "Dividendos",
    title: "Do resultado à sua parte.",
    text: "Mude a distribuição e veja o dividendo por ação neste exemplo.",
    steps: ["Resultado", "Distribuição", "Acionista"],
    icons: ["bars", "distribution", "person"],
    action: "Estudar os dividendos",
    path: "/aprender",
  },
] as const;

type SceneIcon = (typeof topics)[number]["icons"][number];

const integer = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const millions = (value: number) => `R$ ${integer.format(value)} milhões`;

function CountedValue({
  value,
  format,
}: {
  value: number;
  format: (value: number) => string;
}) {
  const visual = useRef<HTMLSpanElement>(null);
  const renderedValue = useRef(value);

  useEffect(() => {
    const node = visual.current;
    const startValue = renderedValue.current;
    if (!node || startValue === value) return;

    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (preference.matches) {
      renderedValue.current = value;
      return;
    }

    let frame = 0;
    let startTime: number | null = null;
    const finish = () => {
      window.cancelAnimationFrame(frame);
      node.textContent = format(value);
      renderedValue.current = value;
    };
    const onPreference = () => {
      if (preference.matches) finish();
    };
    const tick = (time: number) => {
      startTime ??= time;
      const progress = Math.min(1, (time - startTime) / 420);
      const eased = 1 - (1 - progress) ** 3;
      renderedValue.current = startValue + (value - startValue) * eased;
      node.textContent = format(renderedValue.current);
      if (progress < 1) frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    preference.addEventListener("change", onPreference);
    return () => {
      window.cancelAnimationFrame(frame);
      preference.removeEventListener("change", onPreference);
    };
  }, [value, format]);

  return (
    <>
      <span ref={visual} aria-hidden="true">
        {format(value)}
      </span>
      <span className="ph-panel-sr-only">{format(value)}</span>
    </>
  );
}

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
        className="ph-panel-track"
      />
      <path
        d="M56 55C98 55 108 43 133 43H225C249 43 263 55 304 55"
        pathLength="100"
        className="ph-panel-signal"
      />
      <path d="M20 126H340" className="ph-panel-baseline" />
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
            className={index === 1 ? "ph-panel-node-center" : undefined}
          />
          <g
            transform={`translate(${56 + index * 124} 55)`}
            className="ph-panel-icon"
          >
            <IconDrawing type={topic.icons[index]} />
          </g>
          <text x={56 + index * 124} y="108" textAnchor="middle">
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
          <dd>
            <CountedValue value={distributed} format={millions} />
          </dd>
        </div>
        <div className="ph-panel-per-share">
          <dt>Dividendo por ação</dt>
          <dd>
            <CountedValue value={perShare} format={currency.format} />
          </dd>
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
  const [selected, setSelected] = useState(2);
  const panel = useRef<HTMLElement>(null);
  const panelId = useId();
  const topic = topics[selected];

  useEffect(() => {
    const node = panel.current;
    if (!node) return;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let point: { x: number; y: number } | null = null;
    const apply = () => {
      frame = 0;
      if (!point) return;
      node.style.setProperty("--ph-spot-x", `${point.x}px`);
      node.style.setProperty("--ph-spot-y", `${point.y}px`);
    };
    const move = (event: PointerEvent) => {
      if (
        !finePointer.matches ||
        reduced.matches ||
        event.pointerType === "touch"
      )
        return;
      const bounds = node.getBoundingClientRect();
      point = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
      if (!frame) frame = window.requestAnimationFrame(apply);
    };
    const leave = () => {
      window.cancelAnimationFrame(frame);
      frame = 0;
      point = null;
    };
    node.addEventListener("pointermove", move);
    node.addEventListener("pointerleave", leave);
    return () => {
      window.cancelAnimationFrame(frame);
      node.removeEventListener("pointermove", move);
      node.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <aside
      ref={panel}
      className="ph-hero-panel"
      aria-labelledby={`${panelId}-title`}
      data-ph-loop
    >
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
        role="group"
        aria-label="Escolha um tema para explorar"
      >
        {topics.map((item, index) => (
          <button
            key={item.label}
            type="button"
            aria-pressed={selected === index}
            aria-controls={`${panelId}-content`}
            onClick={() => setSelected(index)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <FlowScene selected={selected} />
      <div id={`${panelId}-content`} className="ph-panel-content">
        <div className="ph-panel-scene-copy" key={topic.label}>
          <h3>{topic.title}</h3>
          {selected !== 2 && <p>{topic.text}</p>}
        </div>
        {selected === 2 ? (
          <DividendExample />
        ) : (
          <div className="ph-panel-reading" aria-hidden="true">
            <span>{selected === 0 ? "O negócio" : "A tese"}</span>
            <div className="ph-panel-reading-lines">
              <i />
              <i />
              <i />
            </div>
            <span>
              {selected === 0
                ? "Entender antes de comparar"
                : "Premissas · Prazo · Riscos"}
            </span>
          </div>
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
