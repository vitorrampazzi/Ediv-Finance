import { useEffect, useState } from "react";
import { apiRequest } from "../lib/api";
import { Link } from "react-router-dom";

export function Glossario({
  initialTerms = [],
}: {
  initialTerms?: string[][];
}) {
  const [terms, setTerms] = useState(initialTerms);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    apiRequest<{ glossary: string[][] }>("/api/learning", {
      signal: controller.signal,
    })
      .then((data) => setTerms(data.glossary))
      .catch(() => {
        if (!controller.signal.aborted)
          setError("Não foi possível atualizar o glossário. Tente novamente.");
      });
    return () => controller.abort();
  }, []);
  const filtered = terms.filter(([term, definition]) =>
    `${term} ${definition}`
      .toLocaleLowerCase("pt-BR")
      .includes(search.toLocaleLowerCase("pt-BR")),
  );
  return (
    <section className="mx-auto max-w-4xl space-y-6 px-5 py-12">
      <h1 className="text-3xl font-bold">Glossário de investimentos</h1>
      <p className="text-evo-textSec">
        Explicações simples para acompanhar as aulas e compreender as pesquisas.
      </p>
      <label className="block text-sm">
        Buscar termo
        <input
          className="field mt-2"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          type="search"
          placeholder="Ex.: dividendos"
        />
      </label>
      {error && (
        <p role="alert" className="notice-error">
          {error}
        </p>
      )}
      <dl className="space-y-4">
        {filtered.map(([term, definition]) => (
          <div
            key={term}
            className="rounded-xl border border-evo-border bg-evo-card p-5"
          >
            <dt className="font-semibold">{term}</dt>
            <dd className="mt-2 text-sm leading-relaxed text-evo-textSec">
              {definition}
            </dd>
          </div>
        ))}
      </dl>
      {!filtered.length && (
        <p role="status">
          {terms.length ? "Nenhum termo encontrado." : "Carregando glossário…"}
        </p>
      )}
      <Link to="/aprender" className="action-secondary">
        Continuar aprendendo
      </Link>
    </section>
  );
}
