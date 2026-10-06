import { useState } from "react";
import { FilePlus2, Pencil, Trash2 } from "lucide-react";
import { SavedResearchDrafts } from "./SavedResearchDrafts";
import type { ResearchMetadata } from "./SavedResearchDrafts";

const fields = [
  ["ticker", "Ticker", 16, true],
  ["empresa", "Empresa", 160, true],
  ["potencial_percentual", "Potencial (%)", 30, true],
  ["preco_alvo", "Preço-alvo (R$)", 30, false],
  ["horizonte_meses", "Horizonte (meses)", 3, false],
  ["setor", "Setor", 120, false],
  ["tese", "Tese do cenário", 2000, false],
  ["riscos", "Riscos", 2000, false],
  ["balanco_patrimonial", "Balanço patrimonial", 5000, false],
  ["dre", "DRE", 5000, false],
  ["fluxo_de_caixa", "Fluxo de caixa", 5000, false],
  ["informacoes_da_empresa", "Informações da empresa", 5000, false],
  ["divida_liquida", "Dívida líquida", 5000, false],
  ["estatisticas", "Estatísticas", 5000, false],
  ["periodo_referencia", "Período de referência", 120, false],
  ["fonte_dados", "Fonte dos dados", 500, false],
] as const;
type Field = (typeof fields)[number][0];
type Draft = Record<Field, string>;
const blank = () =>
  Object.fromEntries(fields.map(([key]) => [key, ""])) as Draft;
const input =
  "mt-1 min-h-11 w-full rounded-lg border border-evo-border bg-evo-bgMain px-3 py-2 text-sm";
const button =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-evo-border px-3 text-sm disabled:opacity-50";
function cell(value: string) {
  return '"' + value.replaceAll('"', '""') + '"';
}
export function ResearchEditor({
  onPrepare,
  disabled,
  metadata,
  onMetadata,
}: {
  onPrepare: (file: File) => void;
  disabled: boolean;
  metadata: ResearchMetadata;
  onMetadata: (value: ResearchMetadata) => void;
}) {
  const [draft, setDraft] = useState<Draft>(blank);
  const [entries, setEntries] = useState<Draft[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  function add() {
    const row = Object.fromEntries(
      fields.map(([key]) => [key, draft[key].trim()]),
    ) as Draft;
    row.ticker = row.ticker.toUpperCase();
    if (!/^[A-Z0-9][A-Z0-9._-]{0,15}$/.test(row.ticker)) {
      setError("Confira o ticker informado.");
      return;
    }
    if (
      entries.some(
        (entry, index) => index !== editing && entry.ticker === row.ticker,
      )
    ) {
      setError("Esse ativo já está no rascunho.");
      return;
    }
    if (editing === null && entries.length >= 300) {
      setError("O limite é de 300 ativos por publicação.");
      return;
    }
    setEntries((current) =>
      editing === null
        ? [...current, row]
        : current.map((entry, index) => (index === editing ? row : entry)),
    );
    setDraft(blank());
    setEditing(null);
    setError("");
    setMessage("Ativo salvo no rascunho temporário.");
  }
  function prepare() {
    const csv =
      "\uFEFF" +
      fields.map(([key]) => cell(key)).join(";") +
      "\r\n" +
      entries
        .map((entry) => fields.map(([key]) => cell(entry[key])).join(";"))
        .join("\r\n");
    const file = new File([csv], "pesquisa-editor.csv", { type: "text/csv" });
    if (file.size > 1024 * 1024) {
      setError(
        "O rascunho excede 1 MB. Reduza os textos antes de preparar a prévia.",
      );
      return;
    }
    onPrepare(file);
    setError("");
    setMessage(
      "Rascunho preparado. Use Validar e ver prévia abaixo; a pesquisa ainda não foi publicada.",
    );
  }
  return (
    <details className="mt-5 rounded-lg border border-evo-border p-4">
      <summary className="cursor-pointer text-sm font-semibold">
        Criar pesquisa pelo site
      </summary>
      <p className="mt-3 text-xs leading-relaxed text-evo-textSec">
        Adicione os ativos na ordem da pesquisa. Salve o rascunho na sua conta
        para continuar depois. A validação e a publicação usam a mesma prévia da
        importação.
      </p>
      <SavedResearchDrafts
        disabled={disabled}
        payload={{ metadata, entries, working: draft, editing }}
        onLoad={(value) => {
          setEntries(value.entries as Draft[]);
          setDraft(value.working as Draft);
          setEditing(value.editing);
          onMetadata(value.metadata);
          setError("");
          setMessage("");
        }}
      />
      <form
        className="mt-4 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          add();
        }}
      >
        <fieldset disabled={disabled} className="grid gap-3 sm:grid-cols-2">
          {fields.map(([key, label, maxLength, required]) => (
            <label
              key={key}
              className={
                maxLength >= 2000 ? "text-sm sm:col-span-2" : "text-sm"
              }
            >
              {label}
              {required ? " *" : " (opcional)"}
              {maxLength >= 2000 ? (
                <textarea
                  className={input + " min-h-24"}
                  maxLength={maxLength}
                  value={draft[key]}
                  onChange={(e) =>
                    setDraft((current) => ({
                      ...current,
                      [key]: e.target.value,
                    }))
                  }
                />
              ) : (
                <input
                  className={input}
                  required={required}
                  maxLength={maxLength}
                  inputMode={
                    [
                      "potencial_percentual",
                      "preco_alvo",
                      "horizonte_meses",
                    ].includes(key)
                      ? "decimal"
                      : undefined
                  }
                  value={draft[key]}
                  onChange={(e) =>
                    setDraft((current) => ({
                      ...current,
                      [key]: e.target.value,
                    }))
                  }
                />
              )}
            </label>
          ))}
        </fieldset>
        <div className="flex flex-wrap gap-3">
          <button disabled={disabled} className={button}>
            <FilePlus2 size={16} />
            {editing === null
              ? "Adicionar ativo ao rascunho"
              : "Salvar edição do ativo"}
          </button>
          {editing !== null && (
            <button
              type="button"
              className={button}
              disabled={disabled}
              onClick={() => {
                setEditing(null);
                setDraft(blank());
              }}
            >
              Cancelar edição
            </button>
          )}
        </div>
      </form>
      {entries.length > 0 && (
        <div className="mt-5 space-y-3">
          <h3 className="text-sm font-semibold">
            Rascunho · {entries.length} ativo(s)
          </h3>
          <ol className="max-h-64 space-y-2 overflow-auto">
            {entries.map((entry, index) => (
              <li
                key={entry.ticker}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-evo-bgMain p-3 text-sm"
              >
                <span className="min-w-0 break-words">
                  {index + 1}. {entry.ticker} · {entry.empresa}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={disabled}
                    className={button}
                    aria-label={"Editar " + entry.ticker}
                    onClick={() => {
                      setEditing(index);
                      setDraft({ ...entry });
                      setError("");
                    }}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    disabled={disabled}
                    className={button}
                    aria-label={"Remover " + entry.ticker + " do rascunho"}
                    onClick={() => {
                      setEntries((current) =>
                        current.filter((_, i) => i !== index),
                      );
                      setEditing(null);
                      setDraft(blank());
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            ))}
          </ol>
          <button
            type="button"
            className={button}
            disabled={disabled || editing !== null}
            onClick={prepare}
          >
            Usar rascunho para preparar prévia
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="notice-error mt-3">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="mt-3 text-sm text-evo-accent">
          {message}
        </p>
      )}
    </details>
  );
}
