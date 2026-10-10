import {
  ArrowUpRight,
  ChartNoAxesCombined,
  Files,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { OrbitCoins } from "./OrbitCoins";

const features = [
  {
    Icon: ChartNoAxesCombined,
    title: "Cenários",
    text: "Potencial, preço-alvo e horizonte.",
  },
  {
    Icon: ShieldCheck,
    title: "Tese e riscos",
    text: "Premissas e contrapontos da análise.",
  },
  {
    Icon: Files,
    title: "Dados e fontes",
    text: "Empresa, autoria e versões da pesquisa.",
  },
];

export function RankingPreview() {
  return (
    <aside
      className="border-y border-evo-border bg-evo-bgInset/50 px-5"
      aria-labelledby="ranking-preview-title"
    >
      <div className="flex items-center justify-between gap-4 py-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-evo-accent">
            Ranking de previsões
          </p>
          <h2
            id="ranking-preview-title"
            className="mt-3 max-w-xs text-xl font-semibold"
          >
            O cenário por trás de cada ação
          </h2>
        </div>
        <div className="shrink-0">
          <OrbitCoins variant="ranking" size="sm" />
        </div>
      </div>
      <dl className="divide-y divide-evo-border border-t border-evo-border">
        {features.map(({ Icon, title, text }) => (
          <div key={title} className="flex items-start gap-3 py-3">
            <Icon
              size={18}
              className="mt-0.5 shrink-0 text-evo-accent"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <dt className="text-sm font-semibold">{title}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-evo-textSec">
                {text}
              </dd>
            </div>
          </div>
        ))}
      </dl>
      <div className="pb-3">
        <Link
          to="/metodologia"
          className="inline-flex min-h-11 items-center gap-2 text-sm text-evo-textSec underline decoration-evo-border underline-offset-4 hover:text-evo-accent"
        >
          Como funciona a pesquisa <ArrowUpRight size={15} aria-hidden="true" />
        </Link>
      </div>
    </aside>
  );
}
