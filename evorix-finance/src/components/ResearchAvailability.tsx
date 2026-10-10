import { useResearchStatus } from "../hooks/useResearchStatus";

export function ResearchAvailability() {
  const published = useResearchStatus();
  if (published === null) return null;
  return (
    <p className="mt-3 text-xs font-medium text-evo-accent">
      {published
        ? "Pesquisa da equipe disponível"
        : "Demonstração · dados fictícios"}
    </p>
  );
}
