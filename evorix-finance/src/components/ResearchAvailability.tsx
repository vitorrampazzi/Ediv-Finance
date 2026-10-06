import { useResearchStatus } from "../hooks/useResearchStatus";

export function ResearchAvailability() {
  const published = useResearchStatus();
  if (published === null) return null;
  return (
    <p className="mt-4 rounded-lg border border-evo-border bg-evo-bgMain/60 px-4 py-3 text-sm leading-relaxed text-evo-textSec">
      <strong className="text-evo-textMain">
        {published ? "Pesquisa publicada" : "Ranking em demonstração"}
      </strong>{" "}
      ·{" "}
      {published
        ? "Entre para consultar a pesquisa da equipe, suas premissas, datas e riscos."
        : "A primeira pesquisa do corretor ainda não foi publicada. Os exemplos do ranking usam empresas e números fictícios para apresentar as ferramentas."}
    </p>
  );
}
