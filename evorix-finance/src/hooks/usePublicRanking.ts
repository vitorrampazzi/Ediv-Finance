import { useEffect, useState } from "react";
import { apiRequest } from "../lib/api";

// The only indicators the public API opens, for the first three companies.
export const publicMetrics = [
  "estimatedGrossDividendYield",
  "projectedPE",
  "safetyMargin",
] as const;

export type PublicRanking = {
  id: string | null;
  title: string;
  updatedAt: string | null;
  totalEntries?: number;
  entries: {
    rank: number;
    ticker: string;
    companyName: string;
    dividendAnalysis: Record<(typeof publicMetrics)[number], string | null>;
  }[];
};

export function usePublicRanking() {
  const [publication, setPublication] = useState<PublicRanking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    apiRequest<PublicRanking>("/api/rankings/public", {
      signal: controller.signal,
    })
      .then((data) => {
        if (!controller.signal.aborted) setPublication(data);
      })
      .catch((reason) => {
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error
              ? reason.message
              : "Não foi possível carregar o ranking.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [revision]);
  const retry = () => {
    setLoading(true);
    setError("");
    setPublication(null);
    setRevision((value) => value + 1);
  };
  return { publication, loading, error, retry };
}

// Publication dates arrive as UTC, either ISO or MySQL "YYYY-MM-DD HH:MM:SS".
export function publicationDate(value: string | null) {
  if (!value) return null;
  const iso = /[zZ]$|[+-]\d\d:?\d\d$/.test(value)
    ? value
    : value.replace(" ", "T") + "Z";
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}
