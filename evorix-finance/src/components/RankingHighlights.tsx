import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../lib/api";

type Publication = {
  title: string;
  updatedAt: string | null;
  entries: {
    ticker: string;
    companyName: string;
    expectedReturnPercent: string;
    horizonMonths: number | null;
  }[];
};

export function RankingHighlights() {
  const [publication, setPublication] = useState<Publication | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    apiRequest<Publication>("/api/rankings", { signal: controller.signal })
      .then(setPublication)
      .catch(() => {
        if (!controller.signal.aborted)
          setError("A publicação não pôde ser carregada agora.");
      });
    return () => controller.abort();
  }, []);

  return (
    <section className="mx-auto max-w-7xl px-5 pb-14 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-evo-accent">
            Nossa sala de estudos
          </p>
          <h2 className="mt-2 text-2xl font-bold">
            Previsões para você compreender
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-evo-textSec">
            O ranking reúne os cenários publicados pela equipe. Leia os
            argumentos e os riscos de cada análise antes de interpretar os
            números.
          </p>
        </div>
        <Link className="action" to="/ranking">
          Abrir ranking completo
        </Link>
      </div>
      {error ? (
        <p role="status" className="mt-5 text-sm text-evo-textSec">
          {error}
        </p>
      ) : !publication ? (
        <p role="status" className="mt-5 text-sm text-evo-textSec">
          Carregando publicação…
        </p>
      ) : !publication.entries.length ? (
        <div className="mt-6 rounded-xl border border-evo-border bg-evo-card p-6">
          <h3 className="font-semibold">
            A primeira publicação está em preparação
          </h3>
          <p className="mt-2 text-sm text-evo-textSec">
            Comece pela trilha de aprendizado para entender potencial,
            preço-alvo e horizonte.
          </p>
          <Link
            className="mt-4 inline-flex min-h-11 items-center text-sm text-evo-accent underline"
            to="/aprender"
          >
            Começar a aprender
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-5 text-xs text-evo-textSec">
            {publication.title}{" "}
            {publication.updatedAt &&
              "· " +
                new Date(
                  publication.updatedAt.replace(" ", "T") +
                    (publication.updatedAt.endsWith("Z") ? "" : "Z"),
                ).toLocaleDateString("pt-BR")}
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            {publication.entries.slice(0, 3).map((entry) => (
              <Link
                key={entry.ticker}
                to="/ranking"
                className="rounded-xl border border-evo-border bg-evo-card p-5 hover:border-evo-accent/40"
              >
                <h3 className="font-bold">{entry.ticker}</h3>
                <p className="mt-1 text-xs text-evo-textSec">
                  {entry.companyName}
                </p>
                <p className="mt-5 text-xs text-evo-textSec">
                  Potencial informado pelo autor
                </p>
                <p className="mt-1 font-numbers text-xl">
                  {Number(entry.expectedReturnPercent).toLocaleString("pt-BR")}%
                </p>
                <p className="mt-2 text-xs text-evo-textSec">
                  {entry.horizonMonths
                    ? entry.horizonMonths + " meses"
                    : "Prazo não informado"}{" "}
                  · cenário sem garantia
                </p>
                <span className="mt-4 block text-xs text-evo-accent">
                  Ler tese e riscos →
                </span>
              </Link>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
