import type { Entry } from "./ranking";

export type ResearchInsight = {
  potential: number | null;
  baseIndex: 100;
  scenarioIndex: number | null;
  targetPrice: number | null;
  horizonMonths: number | null;
  domainMin: number;
  domainMax: number;
};

function readDecimal(value: string | null): number | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : null;
}

/** Compares the publication's two endpoints without creating a price history. */
export function readResearchInsight(
  entry: Pick<Entry, "expectedReturnPercent" | "targetPrice" | "horizonMonths">,
): ResearchInsight {
  const parsedPotential = readDecimal(entry.expectedReturnPercent);
  const potential =
    parsedPotential !== null &&
    parsedPotential >= -100 &&
    parsedPotential <= 1000
      ? parsedPotential
      : null;
  const baseIndex = 100;
  const scenarioIndex = potential === null ? null : baseIndex + potential;

  const parsedTarget = readDecimal(entry.targetPrice);
  const targetPrice =
    parsedTarget !== null && parsedTarget > 0 ? parsedTarget : null;
  const horizonMonths =
    typeof entry.horizonMonths === "number" &&
    Number.isInteger(entry.horizonMonths) &&
    entry.horizonMonths >= 1 &&
    entry.horizonMonths <= 120
      ? entry.horizonMonths
      : null;

  const endpoint = scenarioIndex ?? baseIndex;
  const margin = Math.max(10, Math.abs(potential ?? 0) * 0.18);
  const domainMin = Math.max(
    0,
    Math.floor((Math.min(baseIndex, endpoint) - margin) / 10) * 10,
  );
  const domainMax =
    Math.ceil((Math.max(baseIndex, endpoint) + margin) / 10) * 10;

  return {
    potential,
    baseIndex,
    scenarioIndex,
    targetPrice,
    horizonMonths,
    domainMin,
    domainMax,
  };
}
