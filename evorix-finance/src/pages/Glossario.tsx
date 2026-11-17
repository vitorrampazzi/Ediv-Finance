import { useEffect, useMemo, useRef, useState } from "react";
import { apiRequest } from "../lib/api";
import { trackEvent } from "../lib/analytics";
import { Link } from "react-router-dom";

function termId(term: string) {
  return (
    "termo-" +
    term
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLocaleLowerCase("pt-BR")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
  );
}

// The prerendered page embeds the same terms in this element (scripts/prerender.mjs),
// so the first client render matches the HTML the visitor already sees.
const embeddedId = "ediv-glossario";

function isTermList(value: unknown): value is string[][] {
  return (
    Array.isArray(value) &&
    value.every(
      (pair) =>
        Array.isArray(pair) &&
        pair.length === 2 &&
        pair.every((text) => typeof text === "string"),
    )
  );
}

function readEmbeddedTerms(): string[][] {
  if (typeof document === "undefined") return [];
  try {
    const element = document.getElementById(embeddedId);
    const data: unknown = element?.textContent
      ? JSON.parse(element.textContent)
      : null;
    return isTermList(data) ? data : [];
  } catch {
    return [];
  }
}

function sameTerms(a: string[][], b: string[][]) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function Glossario({ initialTerms }: { initialTerms?: string[][] }) {
  const [terms, setTerms] = useState(
    () => initialTerms ?? readEmbeddedTerms(),
  );
  const [search, setSearch] = useState("");
  // One search_glossary per visit; the typed text is never sent.
  const searchTracked = useRef(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    apiRequest<{ glossary: string[][] }>("/api/learning", {
      signal: controller.signal,
    })
      // Same content keeps the current list, so nothing blinks or reorders.
      .then((data) =>
        setTerms((current) =>
          sameTerms(current, data.glossary) ? current : data.glossary,
        ),
      )
      .catch(() => {
        if (!controller.signal.aborted)
          setError("Não foi possível atualizar o glossário. Tente novamente.");
      });
    return () => controller.abort();
  }, []);
  const sorted = useMemo(
    () => [...terms].sort(([a], [b]) => a.localeCompare(b, "pt-BR")),
    [terms],
  );
  const filtered = sorted.filter(([term, definition]) =>
    `${term} ${definition}`
      .toLocaleLowerCase("pt-BR")
      .includes(search.toLocaleLowerCase("pt-BR")),
  );
  const status = !terms.length
    ? error
      ? ""
      : "Carregando glossário…"
    : !filtered.length
      ? "Nenhum termo encontrado."
      : filtered.length === terms.length
        ? `${terms.length} termos, em ordem alfabética.`
        : `${filtered.length} de ${terms.length} termos encontrados.`;
  return (
    <section
      className={`mx-auto max-w-4xl space-y-6 px-5 py-12${!terms.length && !error ? " min-h-screen" : ""}`}
    >
      <h1 className="text-3xl font-bold">Glossário de investimentos</h1>
      <p className="text-evo-textSec">
        Explicações simples para acompanhar as aulas e compreender as pesquisas.
      </p>
      <label className="block text-sm">
        Buscar termo
        <input
          className="field mt-2"
          value={search}
          onChange={(event) => {
            if (!searchTracked.current && event.target.value.trim()) {
              searchTracked.current = true;
              trackEvent("search_glossary");
            }
            setSearch(event.target.value);
          }}
          type="search"
          placeholder="Ex.: dividendos"
        />
      </label>
      {error && (
        <p role="alert" className="notice-error">
          {error}
        </p>
      )}
      <p role="status" className="text-sm text-evo-textSec">
        {status}
      </p>
      <dl className="space-y-4">
        {filtered.map(([term, definition]) => (
          <div
            key={term}
            id={termId(term)}
            className="scroll-mt-24 rounded-xl border border-evo-border bg-evo-card p-5"
          >
            <dt className="font-semibold">{term}</dt>
            <dd className="mt-2 text-sm leading-relaxed text-evo-textSec">
              {definition}
            </dd>
          </div>
        ))}
      </dl>
      <Link to="/aprender" className="action-secondary">
        Continuar aprendendo
      </Link>
    </section>
  );
}
