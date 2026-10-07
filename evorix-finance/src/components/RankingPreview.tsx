import { BookOpen, LockKeyhole } from "lucide-react";
import { Link } from "react-router-dom";

export function RankingPreview() {
  return (
    <aside
      className="border-y border-evo-border"
      aria-labelledby="ranking-preview-title"
    >
      <div className="border-b border-evo-border py-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-evo-accent">
          Pesquisa com contexto
        </p>
        <h2 id="ranking-preview-title" className="mt-3 text-xl font-semibold">
          O que você encontra no ranking
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-evo-textSec">
          Entenda a empresa, a tese e os riscos antes de interpretar uma
          previsão.
        </p>
      </div>
      <div className="py-6">
        <p className="mb-3 text-xs font-medium text-evo-textSec">
          Exemplo ilustrativo do formato · sem dados de pesquisa
        </p>
        <ol className="divide-y divide-evo-border">
          {[
            "Empresa e posição na lista",
            "Cenário, horizonte e premissas",
            "Fontes, autoria e riscos",
          ].map((label, index) => (
            <li key={label} className="flex items-center gap-4 py-5">
              <span className="font-numbers text-lg text-evo-accent">
                0{index + 1}
              </span>
              <span className="text-sm">{label}</span>
            </li>
          ))}
        </ol>
        <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-evo-textSec">
          <LockKeyhole size={16} className="shrink-0" aria-hidden="true" /> O
          ranking é acessado após entrar na conta. Projeções não garantem
          retorno.
        </p>
        <Link
          to="/aprender#ranking"
          className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm text-evo-accent underline"
        >
          <BookOpen size={16} aria-hidden="true" /> Como interpretar uma
          previsão
        </Link>
      </div>
    </aside>
  );
}
