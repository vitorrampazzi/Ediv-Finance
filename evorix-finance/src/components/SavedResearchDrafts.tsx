import { useEffect, useState } from "react";
import { CheckCircle2, Clock3, FileText, Save } from "lucide-react";
import { ApiError, apiRequest } from "../lib/api";
import { ResearchConfirmation } from "./ResearchConfirmation";
import type { ResearchConfirmationAction } from "./ResearchConfirmation";

export interface ResearchMetadata {
  title: string;
  authorName: string;
  professionalCategory: string;
  professionalRegistration: string;
}
export interface SavedDraftPayload {
  metadata: ResearchMetadata;
  entries: Record<string, string>[];
  working: Record<string, string>;
  editing: number | null;
}
type Item = { id: string; title: string; version: number; updated_at: string };
const button =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-evo-border px-3 text-sm hover:border-evo-accent/50 disabled:opacity-50";
function updatedLabel(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function SavedResearchDrafts({
  payload,
  onLoad,
  disabled,
  onBusyChange,
  onSaveAndClose,
}: {
  payload: SavedDraftPayload;
  onLoad: (payload: SavedDraftPayload) => void;
  disabled: boolean;
  onBusyChange?: (busy: boolean) => void;
  onSaveAndClose?: () => void;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [listed, setListed] = useState(false);
  const [active, setActive] = useState<{
    id: string;
    version: number;
    title: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    JSON.stringify(payload),
  );
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmation, setConfirmation] =
    useState<ResearchConfirmationAction | null>(null);
  const dirty = savedSnapshot !== JSON.stringify(payload);
  const unavailable = disabled || busy;

  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);

  async function act(work: () => Promise<void>) {
    setBusy(true);
    onBusyChange?.(true);
    setError("");
    setConflict(false);
    setMessage("");
    try {
      await work();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível concluir a ação. Tente novamente.",
      );
      setConflict(
        err instanceof ApiError && err.status === 409 && active !== null,
      );
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  }
  async function list() {
    setItems(
      (await apiRequest<{ drafts: Item[] }>("/api/rankings/drafts")).drafts,
    );
    setListed(true);
  }
  async function save() {
    const snapshot = JSON.stringify(payload);
    const result = await apiRequest<{
      id: string;
      version: number;
      message: string;
    }>("/api/rankings/drafts" + (active ? "/" + active.id : ""), {
      method: active ? "PUT" : "POST",
      body: JSON.stringify({
        payload,
        ...(active ? { version: active.version } : {}),
      }),
    });
    setActive({
      id: result.id,
      version: result.version,
      title: payload.metadata.title.trim() || "Rascunho de pesquisa",
    });
    setSavedSnapshot(snapshot);
    setMessage(result.message);
    try {
      await list();
    } catch {
      setMessage(
        result.message +
          " A lista de rascunhos não pôde ser atualizada agora. Use “Ver rascunhos salvos” para tentar novamente.",
      );
    }
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
  function open(item: Item) {
    const work = () =>
      void act(async () => {
        const result = await apiRequest<Item & { payload: SavedDraftPayload }>(
          "/api/rankings/drafts/" + item.id,
        );
        onLoad(result.payload);
        setActive({
          id: result.id,
          version: result.version,
          title: result.title,
        });
        setSavedSnapshot(JSON.stringify(result.payload));
        setMessage(
          "Rascunho recuperado. Campos em edição também foram restaurados. Revise a lista antes de preparar a prévia.",
        );
      });
    if (dirty) {
      confirm({
        title: `Abrir “${item.title}”?`,
        description:
          "Existem alterações locais que ainda não foram salvas na sua conta. Abrir este rascunho substituirá a lista, os campos em edição e os dados da publicação. Cancele para salvar primeiro.",
        confirmLabel: "Descartar alterações e abrir",
        onConfirm: work,
      });
    } else work();
  }

  return (
    <section
      className="my-4 space-y-4 rounded-xl border border-evo-border bg-evo-bgMain/30 p-4 sm:p-5"
      aria-busy={busy}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <FileText size={17} aria-hidden="true" />
            Rascunho privado
          </h3>
          <p className="mt-1 break-words text-sm text-evo-textSec">
            {active
              ? `${active.title} · revisão ${active.version}`
              : "Nova pesquisa · ainda sem rascunho salvo"}
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-2 text-xs ${dirty ? "text-evo-accent" : "text-evo-textSec"}`}
        >
          {dirty ? (
            <Clock3 size={14} aria-hidden="true" />
          ) : (
            <CheckCircle2 size={14} aria-hidden="true" />
          )}
          {dirty
            ? "Alterações não salvas"
            : active
              ? "Salvo na sua conta"
              : "Nenhuma alteração pendente"}
        </span>
      </div>
      <p className="max-w-3xl text-xs leading-relaxed text-evo-textSec">
        Salve antes de sair para manter a lista de empresas, os campos em
        preenchimento e a autoria. Somente você pode abrir estes rascunhos.
        Salvar não publica a pesquisa.
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className={button + " bg-evo-accent/10 text-evo-accent"}
          disabled={unavailable}
          onClick={() => void act(save)}
        >
          <Save size={16} aria-hidden="true" />
          {busy
            ? "Processando…"
            : active
              ? "Salvar alterações na conta"
              : "Salvar novo rascunho na conta"}
        </button>
        {onSaveAndClose && (
          <button
            type="button"
            className={button}
            disabled={unavailable}
            onClick={() =>
              void act(async () => {
                await save();
                onSaveAndClose();
              })
            }
          >
            Salvar e recolher editor
          </button>
        )}
        <button
          type="button"
          className={button}
          disabled={unavailable}
          onClick={() => void act(list)}
        >
          {listed ? "Atualizar rascunhos salvos" : "Ver rascunhos salvos"}
        </button>
        {active && (
          <button
            type="button"
            className="min-h-11 text-sm underline disabled:opacity-50"
            disabled={unavailable}
            onClick={() => {
              setActive(null);
              setConflict(false);
              setError("");
              setMessage(
                "A próxima gravação criará outro rascunho. O rascunho original será preservado.",
              );
            }}
          >
            Salvar como novo
          </button>
        )}
      </div>
      {message && (
        <p role="status" className="text-sm leading-relaxed text-evo-accent">
          {message}
        </p>
      )}
      {error && (
        <div role="alert" className="notice-error">
          <p>{error}</p>
          {conflict && (
            <p className="mt-2 text-xs leading-relaxed">
              Sua edição permanece neste editor. Use “Salvar como novo” para
              preservar uma cópia ou abra a revisão atual depois de guardar suas
              alterações.
            </p>
          )}
        </div>
      )}
      {listed && items.length === 0 && (
        <p className="rounded-lg border border-dashed border-evo-border p-3 text-sm text-evo-textSec">
          Você ainda não tem rascunhos salvos. Use “Salvar novo rascunho na
          conta” para continuar esta pesquisa depois.
        </p>
      )}
      {items.length > 0 && (
        <ul
          className="max-h-64 space-y-2 overflow-auto"
          aria-label="Seus rascunhos salvos"
        >
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-evo-border bg-evo-bgMain/40 p-3 text-sm"
            >
              <span className="min-w-0 break-words">
                <strong>{item.title}</strong>
                {active?.id === item.id ? " · em edição" : ""}
                <span className="mt-1 block text-xs text-evo-textSec">
                  Revisão {item.version}
                  {updatedLabel(item.updated_at)
                    ? ` · atualizado em ${updatedLabel(item.updated_at)}`
                    : ""}
                </span>
              </span>
              <div className="flex gap-3">
                <button
                  type="button"
                  className={button}
                  disabled={unavailable}
                  onClick={() => open(item)}
                >
                  Abrir
                </button>
                <button
                  type="button"
                  className={button + " text-evo-red"}
                  disabled={unavailable}
                  onClick={() =>
                    confirm({
                      title: `Excluir “${item.title}”?`,
                      description:
                        "Este rascunho privado será excluído da sua conta. As publicações já feitas e os campos deste editor serão mantidos. Essa exclusão não pode ser desfeita.",
                      confirmLabel: "Excluir rascunho salvo",
                      onConfirm: () =>
                        void act(async () => {
                          await apiRequest("/api/rankings/drafts/" + item.id, {
                            method: "DELETE",
                          });
                          if (active?.id === item.id) {
                            setActive(null);
                            setSavedSnapshot("");
                          }
                          setItems((current) =>
                            current.filter((draft) => draft.id !== item.id),
                          );
                          setMessage(
                            "Rascunho salvo excluído. O conteúdo local foi mantido e pode ser salvo como novo.",
                          );
                          await list();
                        }),
                    })
                  }
                >
                  Excluir
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {confirmation && (
        <ResearchConfirmation
          action={confirmation}
          onCancel={() => setConfirmation(null)}
        />
      )}
    </section>
  );
}
