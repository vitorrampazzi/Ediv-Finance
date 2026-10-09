import { useId, useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  FilePlus2,
  Pencil,
  Trash2,
} from "lucide-react";
import { SavedResearchDrafts } from "./SavedResearchDrafts";
import type { ResearchMetadata } from "./SavedResearchDrafts";
import { ResearchConfirmation } from "./ResearchConfirmation";
import type { ResearchConfirmationAction } from "./ResearchConfirmation";
import {
  emptyResearchEntry,
  recommendedResearchFields,
  researchEntryIssues,
  researchFields,
  researchSections,
} from "./research-editor-model";
import type {
  ResearchEntryDraft,
  ResearchField,
} from "./research-editor-model";

const input =
  "mt-1 min-h-11 w-full rounded-lg border border-evo-border bg-evo-bgMain px-3 py-2 text-sm focus:border-evo-accent focus:outline-none focus:ring-2 focus:ring-evo-accent/20";
const button =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-evo-border px-3 text-sm hover:border-evo-accent/50 disabled:opacity-50";
const placeholders: Partial<Record<ResearchField, string>> = {
  ticker: "Ex.: ABCD3",
  empresa: "Nome da empresa pesquisada",
  potencial_percentual: "Ex.: 12,5",
  preco_alvo: "Ex.: 35,90",
  horizonte_meses: "Ex.: 12",
  tese: "O que sustenta esse cenário? Quais condições precisam acontecer?",
  riscos:
    "O que pode contrariar a tese? Inclua fatores da empresa, do setor e do mercado.",
  informacoes_da_empresa:
    "Atividade, trajetória e características relevantes do negócio.",
  periodo_referencia: "Ex.: 2º trimestre de 2026",
  fonte_dados: "Ex.: nome do relatório e endereço da fonte consultada",
};
function cell(value: string) {
  return '"' + value.replaceAll('"', '""') + '"';
}

export function ResearchEditor({
  onPrepare,
  disabled,
  metadata,
  onMetadata,
  onContentChange,
}: {
  onPrepare: (file: File) => void;
  disabled: boolean;
  metadata: ResearchMetadata;
  onMetadata: (value: ResearchMetadata) => void;
  onContentChange?: () => void;
}) {
  const [draft, setDraft] = useState<ResearchEntryDraft>(emptyResearchEntry);
  const [entries, setEntries] = useState<ResearchEntryDraft[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [sectionIndex, setSectionIndex] = useState(0);
  const [draftSession, setDraftSession] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [confirmation, setConfirmation] =
    useState<ResearchConfirmationAction | null>(null);
  const fieldPrefix = useId();
  const editor = useRef<HTMLDetailsElement>(null);
  const unavailable = disabled || saving;
  const currentSection = researchSections[sectionIndex];
  const workingChanged =
    JSON.stringify(draft) !==
    JSON.stringify(editing === null ? emptyResearchEntry() : entries[editing]);
  const tickerCounts = new Map<string, number>();
  for (const entry of entries) {
    const ticker = entry.ticker.trim().toUpperCase();
    tickerCounts.set(ticker, (tickerCounts.get(ticker) || 0) + 1);
  }
  const pendingEntries = entries.filter(
    (entry) =>
      researchEntryIssues(entry).length > 0 ||
      (tickerCounts.get(entry.ticker.trim().toUpperCase()) || 0) > 1,
  );
  const partialEntries = entries.filter(
    (entry) => recommendedResearchFields(entry).length > 0,
  );

  function resetWorking() {
    setDraft(emptyResearchEntry());
    setEditing(null);
    setSectionIndex(0);
    setError("");
    onContentChange?.();
  }
  function updateField(key: ResearchField, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
    setError("");
    onContentChange?.();
  }
  function confirm(action: ResearchConfirmationAction) {
    setConfirmation({
      ...action,
      onConfirm: () => {
        setConfirmation(null);
        action.onConfirm();
      },
    });
  }
  function edit(index: number) {
    const work = () => {
      setEditing(index);
      setDraft({ ...entries[index] });
      setSectionIndex(0);
      setError("");
      setMessage("");
      onContentChange?.();
    };
    if (workingChanged) {
      confirm({
        title: "Trocar a empresa em edição?",
        description:
          "Os campos da empresa que você está preenchendo ainda não foram incorporados à lista. Salve a empresa ou o rascunho completo antes de trocar, se quiser manter esses dados.",
        confirmLabel: "Descartar campos e editar",
        onConfirm: work,
      });
    } else work();
  }
  function add() {
    const row = Object.fromEntries(
      researchFields.map(([key]) => [key, draft[key].trim()]),
    ) as ResearchEntryDraft;
    row.ticker = row.ticker.toUpperCase();
    const issues = researchEntryIssues(row);
    if (issues.length > 0) {
      setSectionIndex(
        researchSections.findIndex((section) =>
          section.fields.includes(issues[0].field),
        ),
      );
      setError(issues[0].message);
      return;
    }
    if (
      entries.some(
        (entry, index) => index !== editing && entry.ticker === row.ticker,
      )
    ) {
      setSectionIndex(0);
      setError(
        "Essa ação já está no rascunho. Edite a linha existente para atualizar a pesquisa.",
      );
      return;
    }
    if (editing === null && entries.length >= 300) {
      setError("O limite é de 300 ações por publicação.");
      return;
    }
    setEntries((current) =>
      editing === null
        ? [...current, row]
        : current.map((entry, index) => (index === editing ? row : entry)),
    );
    resetWorking();
    setMessage(
      "Empresa incorporada à lista. Salve o rascunho na sua conta para continuar depois.",
    );
  }
  function prepare() {
    if (workingChanged || editing !== null) {
      setError(
        "Incorpore a empresa em edição à lista ou cancele a edição antes de preparar a prévia.",
      );
      return;
    }
    if (pendingEntries.length > 0) {
      setError(
        "Revise os campos obrigatórios das empresas indicadas na lista antes de preparar a prévia.",
      );
      return;
    }
    const csv =
      "\uFEFF" +
      researchFields.map(([key]) => cell(key)).join(";") +
      "\r\n" +
      entries
        .map((entry) =>
          researchFields.map(([key]) => cell(entry[key])).join(";"),
        )
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
      "Arquivo preparado. Continue em “Validar e ver prévia” abaixo para revisar a pesquisa antes de publicar.",
    );
  }

  return (
    <details
      ref={editor}
      className="mt-5 rounded-xl border border-evo-border p-4 sm:p-5"
    >
      <summary className="cursor-pointer text-sm font-semibold">
        Criar pesquisa pelo site · editor guiado
      </summary>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-evo-textSec">
        Preencha uma empresa por vez. Adicionar à lista organiza o conteúdo;
        salvar na conta preserva o rascunho; preparar a prévia inicia a revisão.
        A publicação acontece somente na confirmação final.
      </p>
      <SavedResearchDrafts
        key={draftSession}
        disabled={disabled}
        onBusyChange={setSaving}
        onSaveAndClose={() => {
          if (editor.current) {
            editor.current.open = false;
            editor.current.querySelector<HTMLElement>("summary")?.focus();
          }
        }}
        payload={{ metadata, entries, working: draft, editing }}
        onLoad={(value) => {
          setEntries(value.entries as ResearchEntryDraft[]);
          setDraft(value.working as ResearchEntryDraft);
          setEditing(value.editing);
          setSectionIndex(0);
          onMetadata(value.metadata);
          setError("");
          setMessage(
            "Rascunho recuperado. Confira os campos antes de preparar a prévia.",
          );
        }}
      />
      <form
        className="mt-5 space-y-4"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          add();
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">
            {editing === null
              ? "Nova empresa"
              : `Editando ${entries[editing]?.ticker || "empresa"}`}
          </h3>
          <span className="text-xs text-evo-textSec">
            Ticker, empresa e potencial são obrigatórios · demais campos são
            opcionais
          </span>
        </div>
        <nav
          aria-label="Etapas do preenchimento da empresa"
          className="grid grid-cols-2 gap-2 sm:grid-cols-5"
        >
          {researchSections.map((section, index) => (
            <button
              key={section.title}
              type="button"
              disabled={unavailable}
              aria-current={sectionIndex === index ? "step" : undefined}
              onClick={() => setSectionIndex(index)}
              className={`flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs sm:text-sm ${sectionIndex === index ? "border-evo-accent/60 bg-evo-accent/10 text-evo-accent" : "border-evo-border text-evo-textSec hover:text-evo-textMain"}`}
            >
              <span className="font-semibold">{index + 1}.</span>
              {section.title}
              {section.fields.every((field) => draft[field].trim()) && (
                <CheckCircle2
                  size={14}
                  className="ml-auto shrink-0"
                  aria-hidden="true"
                />
              )}
            </button>
          ))}
        </nav>
        <fieldset
          disabled={unavailable}
          className="min-w-0 rounded-xl border border-evo-border bg-evo-bgMain/35 p-4 sm:p-5"
        >
          <legend className="px-2 text-sm font-semibold">
            {currentSection.title}
          </legend>
          <p className="mb-4 text-sm leading-relaxed text-evo-textSec">
            {currentSection.description}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {researchFields
              .filter(([key]) => currentSection.fields.includes(key))
              .map(([key, label, maximum, required]) => (
                <label
                  key={key}
                  htmlFor={`${fieldPrefix}-${key}`}
                  className={`text-sm ${maximum >= 2000 ? "sm:col-span-2" : ""}`}
                >
                  {label}
                  {required ? " *" : " (opcional)"}
                  {maximum >= 2000 ? (
                    <textarea
                      id={`${fieldPrefix}-${key}`}
                      className={input + " min-h-32"}
                      maxLength={maximum}
                      value={draft[key]}
                      placeholder={placeholders[key]}
                      onChange={(event) => updateField(key, event.target.value)}
                    />
                  ) : (
                    <input
                      id={`${fieldPrefix}-${key}`}
                      className={input}
                      required={required}
                      maxLength={maximum}
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
                      placeholder={placeholders[key]}
                      onChange={(event) => updateField(key, event.target.value)}
                    />
                  )}
                  <span className="mt-1 block text-xs text-evo-textSec">
                    {draft[key].length.toLocaleString("pt-BR")} /{" "}
                    {maximum.toLocaleString("pt-BR")} caracteres
                  </span>
                </label>
              ))}
          </div>
        </fieldset>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-3">
            <button
              disabled={unavailable}
              className={button + " bg-evo-accent/10 text-evo-accent"}
            >
              <FilePlus2 size={16} aria-hidden="true" />
              {editing === null
                ? "Adicionar empresa à lista"
                : "Salvar empresa na lista"}
            </button>
            {(editing !== null || workingChanged) && (
              <button
                type="button"
                disabled={unavailable}
                className={button}
                onClick={() => {
                  if (workingChanged)
                    confirm({
                      title: "Descartar os campos desta empresa?",
                      description:
                        "Os campos em edição serão descartados. As empresas já incorporadas à lista e os rascunhos salvos na conta serão mantidos.",
                      confirmLabel: "Descartar campos",
                      onConfirm: resetWorking,
                    });
                  else resetWorking();
                }}
              >
                Cancelar preenchimento
              </button>
            )}
          </div>
          {sectionIndex < researchSections.length - 1 && (
            <button
              type="button"
              disabled={unavailable}
              className={button}
              onClick={() => setSectionIndex((current) => current + 1)}
            >
              Próxima seção
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      </form>
      <section
        className="mt-6 border-t border-evo-border pt-5"
        aria-label="Revisão das empresas do rascunho"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 font-semibold">
            <ClipboardCheck size={18} aria-hidden="true" />
            Lista da pesquisa · {entries.length} / 300 ações
          </h3>
          {(entries.length > 0 || workingChanged) && (
            <button
              type="button"
              disabled={unavailable}
              className="min-h-11 text-sm text-evo-textSec underline"
              onClick={() =>
                confirm({
                  title: "Começar uma lista vazia?",
                  description:
                    "A lista e os campos locais serão removidos. Rascunhos já salvos na sua conta e publicações anteriores serão preservados. Salve as alterações antes se quiser retomá-las depois.",
                  confirmLabel: "Limpar conteúdo local",
                  onConfirm: () => {
                    setEntries([]);
                    resetWorking();
                    setDraftSession((current) => current + 1);
                    setMessage(
                      "Editor reiniciado. Seus rascunhos salvos continuam na sua conta.",
                    );
                  },
                })
              }
            >
              Começar nova lista
            </button>
          )}
        </div>
        {entries.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-evo-border p-4 text-sm leading-relaxed text-evo-textSec">
            Ainda não há empresas na lista. Preencha os três campos obrigatórios
            para começar; os módulos adicionais podem ser completados depois em
            um rascunho privado.
          </p>
        ) : (
          <>
            <div className="my-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-evo-textSec">
              <span>
                {entries.length - pendingEntries.length} com campos obrigatórios
                válidos
              </span>
              <span>
                {partialEntries.length} com informações opcionais a complementar
              </span>
            </div>
            <ol className="max-h-96 space-y-2 overflow-auto">
              {entries.map((entry, index) => {
                const issues = researchEntryIssues(entry);
                const repeated =
                  (tickerCounts.get(entry.ticker.trim().toUpperCase()) || 0) >
                  1;
                const recommended = recommendedResearchFields(entry);
                return (
                  <li
                    key={`${index}-${entry.ticker}`}
                    className={`rounded-lg border p-3 text-sm ${editing === index ? "border-evo-accent/50 bg-evo-accent/5" : "border-evo-border bg-evo-bgMain/40"}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="min-w-0 break-words">
                        <span className="mr-2 text-xs text-evo-textSec">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <strong>{entry.ticker}</strong> · {entry.empresa}
                        {editing === index ? " · em edição" : ""}
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={unavailable}
                          className={button}
                          aria-label={`Editar ${entry.ticker}`}
                          onClick={() => edit(index)}
                        >
                          <Pencil size={15} aria-hidden="true" />
                          <span className="hidden sm:inline">Editar</span>
                        </button>
                        <button
                          type="button"
                          disabled={unavailable}
                          className={button}
                          aria-label={`Remover ${entry.ticker} da lista`}
                          onClick={() =>
                            confirm({
                              title: `Remover ${entry.ticker} desta lista?`,
                              description:
                                "A empresa será removida do conteúdo local. Essa ação não altera pesquisas publicadas nem o rascunho salvo até você salvar novamente. Se estiver editando esta empresa, seus campos também serão removidos.",
                              confirmLabel: "Remover da lista",
                              onConfirm: () => {
                                onContentChange?.();
                                setEntries((current) =>
                                  current.filter((_, item) => item !== index),
                                );
                                if (editing === index) resetWorking();
                                else if (editing !== null && editing > index)
                                  setEditing(editing - 1);
                                setMessage("Empresa removida da lista local.");
                              },
                            })
                          }
                        >
                          <Trash2 size={15} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                    {issues.length > 0 ? (
                      <p className="mt-2 text-xs text-evo-red">
                        Revisar:{" "}
                        {issues.map((issue) => issue.message).join(" ")}
                      </p>
                    ) : (
                      <p className="mt-2 text-xs text-evo-textSec">
                        Potencial {entry.potencial_percentual.replace(/%$/, "")}
                        %
                        {entry.horizonte_meses
                          ? ` · ${entry.horizonte_meses} meses`
                          : " · prazo não informado"}
                      </p>
                    )}
                    {repeated && (
                      <p className="mt-1 text-xs text-evo-red">
                        Ticker repetido. Mantenha uma linha por ação para
                        validar a publicação.
                      </p>
                    )}
                    {recommended.length > 0 && (
                      <p className="mt-1 text-xs leading-relaxed text-evo-textSec">
                        Para enriquecer a leitura: {recommended.join(", ")}.
                        Esses campos são opcionais.
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
            <div className="mt-4 rounded-lg border border-evo-border p-4">
              <p className="text-sm font-semibold">
                Revisão antes da publicação
              </p>
              <p className="mt-1 text-xs leading-relaxed text-evo-textSec">
                Confira a ordem das empresas, as fontes e as datas.{" "}
                {metadata.authorName.trim()
                  ? "A autoria será exibida conforme os dados da publicação preenchidos acima."
                  : "A autoria ainda está em branco; os dados profissionais podem ser preenchidos acima quando estiverem disponíveis."}{" "}
                Preparar a prévia não salva o rascunho na conta e não publica a
                pesquisa.
              </p>
              {workingChanged && (
                <p className="mt-2 text-xs text-evo-accent">
                  Existe uma empresa em preenchimento que ainda não faz parte da
                  lista.
                </p>
              )}
              <button
                type="button"
                className={button + " mt-3 bg-evo-accent/10 text-evo-accent"}
                disabled={
                  unavailable ||
                  editing !== null ||
                  workingChanged ||
                  pendingEntries.length > 0
                }
                onClick={prepare}
              >
                Preparar lista para validar e ver prévia
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          </>
        )}
      </section>
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
      {confirmation && (
        <ResearchConfirmation
          action={confirmation}
          onCancel={() => setConfirmation(null)}
        />
      )}
    </details>
  );
}
