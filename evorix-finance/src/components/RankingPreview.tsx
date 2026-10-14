import { useId, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/authContext";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function RankingPreview() {
  const { user } = useAuth();
  const controlId = useId();
  const [distribution, setDistribution] = useState(40);
  // Educational arithmetic with fixed assumptions, unrelated to market data.
  const dividends = (100 * distribution) / 100;
  const dividendPerShare = dividends / 50;
  return (
    <aside className="dividend-note" aria-labelledby={`${controlId}-title`}>
      <div className="flex items-center justify-between gap-3">
        <p className="edition-label">Exemplo didático</p>
        <span className="text-xs text-evo-textSec">Lucro → dividendo</span>
      </div>
      <h2
        id={`${controlId}-title`}
        className="mt-4 max-w-sm text-xl font-medium leading-snug sm:text-2xl"
      >
        Quanto do lucro vira dividendo?
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-evo-textSec">
        O exemplo usa R$ 100 milhões de lucro e 50 milhões de ações.
      </p>
      <div className="mt-5 flex items-baseline justify-between gap-3">
        <label htmlFor={controlId} className="text-sm">
          Distribuição do lucro
        </label>
        <output
          htmlFor={controlId}
          className="font-numbers text-xl text-evo-accent"
        >
          {distribution}%
        </output>
      </div>
      <input
        id={controlId}
        type="range"
        min={10}
        max={90}
        step={5}
        value={distribution}
        onChange={(event) => setDistribution(Number(event.target.value))}
        aria-valuetext={`${distribution}% do lucro distribuído`}
        className="dividend-slider mt-1 block min-h-11 w-full cursor-pointer accent-evo-accent"
      />
      <dl className="mt-5 hidden grid-cols-[1fr_auto] gap-x-4 gap-y-2 border-b border-evo-border pb-4 text-sm sm:grid">
        <dt className="text-evo-textSec">Lucro do exemplo</dt>
        <dd className="text-right font-numbers">R$ 100 milhões</dd>
        <dt className="text-evo-textSec">Total distribuído</dt>
        <dd className="text-right font-numbers">R$ {dividends} milhões</dd>
      </dl>
      <div className="mt-4 flex items-end justify-between gap-4">
        <p className="max-w-28 text-sm leading-relaxed text-evo-textSec">
          Dividendo por ação
        </p>
        <output
          htmlFor={controlId}
          className="font-numbers text-3xl tracking-tight text-evo-textMain sm:text-4xl"
        >
          {money.format(dividendPerShare)}
        </output>
      </div>
      <details className="mt-3 text-xs leading-5 text-evo-textSec">
        <summary className="flex min-h-11 cursor-pointer items-center underline underline-offset-4">
          Como este exemplo foi calculado
        </summary>
        <p>
          Neste exemplo, {distribution}% do lucro são R$ {dividends} milhões.
          Dividimos esse total por 50 milhões de ações. É uma conta
          simplificada, sem impostos ou diferenças entre classes de ações.
        </p>
      </details>
      <Link
        to={user ? "/app/aprender" : "/aprender"}
        className="mt-1 inline-flex min-h-11 items-center gap-2 text-sm text-evo-accent hover:underline"
      >
        Estudar os dividendos <ArrowUpRight size={16} aria-hidden="true" />
      </Link>
    </aside>
  );
}
