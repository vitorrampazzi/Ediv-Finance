import { useId, useState } from "react";
import {
  ArrowUpRight,
  Building2,
  ChartNoAxesCombined,
  Files,
  Leaf,
  RefreshCw,
  ScanSearch,
  TrendingUp,
  UserRound,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/authContext";

const topics = [
  {
    label: "Empresa",
    title: "Comece pelo negócio.",
    text: "Entenda o que a empresa faz, de onde vem sua receita e como ela gera resultados.",
    steps: ["Negócio", "Receita", "Resultados"],
    icons: [Building2, TrendingUp, ChartNoAxesCombined],
    action: "Conhecer as empresas",
    publicPath: "/mercado",
    memberPath: "/app/analises",
  },
  {
    label: "Pesquisa",
    title: "Dê contexto aos números.",
    text: "Conecte a tese, as premissas e o horizonte de cada cenário. Acompanhe as versões da pesquisa.",
    steps: ["Premissas", "Cenário", "Revisão"],
    icons: [Files, ScanSearch, RefreshCw],
    action: "Explorar a pesquisa",
    publicPath: "/ranking",
    memberPath: "/app/ranking",
  },
  {
    label: "Dividendos",
    title: "Acompanhe o caminho do dividendo.",
    text: "Conheça a relação entre os resultados do negócio, a distribuição de lucros e o acionista.",
    steps: ["Resultado", "Distribuição", "Acionista"],
    icons: [ChartNoAxesCombined, Leaf, UserRound],
    action: "Aprender sobre dividendos",
    publicPath: "/aprender",
    memberPath: "/app/aprender",
  },
];

export function RankingPreview() {
  const [selected, setSelected] = useState(0);
  const { user } = useAuth();
  const panelId = useId();
  const topic = topics[selected];
  return (
    <aside
      className="journey-preview border-y border-evo-border px-5 py-5"
      aria-labelledby={`${panelId}-title`}
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-evo-accent">
        Por trás de uma ação
      </p>
      <h2 id={`${panelId}-title`} className="mt-2 text-xl font-semibold">
        Descubra por onde começar.
      </h2>
      <div
        className="mt-5 grid grid-cols-3 gap-1"
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
            className={`min-h-11 rounded-lg px-2 text-sm font-medium transition-colors ${selected === index ? "bg-evo-accent/10 text-evo-accent" : "text-evo-textSec hover:bg-evo-card hover:text-evo-textMain"}`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div
        className="journey-scene relative mt-5 grid grid-cols-3 gap-2 pt-8 pb-4"
        aria-hidden="true"
        key={topic.label}
      >
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 420 160"
          fill="none"
          preserveAspectRatio="none"
        >
          <path
            d="M70 70C110 70 115 50 150 50H270C305 50 310 70 350 70"
            stroke="currentColor"
            strokeWidth="1"
            className="text-evo-accent/25"
          />
          <path
            d="M70 70C110 70 115 50 150 50H270C305 50 310 70 350 70"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="3 19"
            strokeLinecap="round"
            className="journey-signal text-evo-accent"
          />
          <path
            d="M20 128H400"
            stroke="currentColor"
            strokeDasharray="1 12"
            strokeLinecap="round"
            className="text-evo-border"
          />
        </svg>
        {topic.steps.map((step, index) => {
          const Icon = topic.icons[index];
          return (
            <div
              key={step}
              className="relative z-10 flex min-w-0 flex-col items-center gap-4"
            >
              <span
                className={`journey-node flex size-14 items-center justify-center rounded-2xl border bg-evo-bgInset ${index === 1 ? "border-evo-accent/60 text-evo-accent" : "border-evo-border text-evo-textSec"}`}
              >
                <Icon size={25} strokeWidth={1.5} />
              </span>
              <span className="text-center text-xs font-medium text-evo-textSec">
                {step}
              </span>
            </div>
          );
        })}
      </div>
      <div
        id={`${panelId}-content`}
        className="mt-3 min-h-36 border-t border-evo-border pt-4"
        aria-live="polite"
        aria-atomic="true"
      >
        <h3 className="text-base font-semibold">{topic.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-evo-textSec">
          {topic.text}
        </p>
        <Link
          to={user ? topic.memberPath : topic.publicPath}
          className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-evo-accent hover:underline"
        >
          {topic.action} <ArrowUpRight size={15} aria-hidden="true" />
        </Link>
      </div>
    </aside>
  );
}
