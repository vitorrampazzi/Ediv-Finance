import { useState } from "react";
import { apiRequest } from "../lib/api";
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
export function SavedResearchDrafts({
  payload,
  onLoad,
  disabled,
}: {
  payload: SavedDraftPayload;
  onLoad: (payload: SavedDraftPayload) => void;
  disabled: boolean;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [active, setActive] = useState<{ id: string; version: number } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function act(work: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await work();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar.");
    } finally {
      setBusy(false);
    }
  }
  async function list() {
    setItems(
      (await apiRequest<{ drafts: Item[] }>("/api/rankings/drafts")).drafts,
    );
  }
  async function save() {
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
    setActive({ id: result.id, version: result.version });
    setMessage(result.message);
    await list();
  }
  return (
    <section className="my-4 space-y-3 rounded-lg border border-evo-border p-4">
      <h3 className="text-sm font-semibold">Rascunhos na sua conta</h3>
      <p className="text-xs text-evo-textSec">
        Salve antes de sair. Ativos, campos em edição e dados da publicação
        ficam na sua conta. Só você pode abrir seus rascunhos; salvar não
        publica.
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="action"
          disabled={disabled || busy}
          onClick={() => void act(save)}
        >
          {busy
            ? "Processando…"
            : active
              ? "Salvar alterações do rascunho"
              : "Salvar novo rascunho"}
        </button>
        <button
          type="button"
          className="min-h-11 text-sm underline"
          disabled={disabled || busy}
          onClick={() => void act(list)}
        >
          Ver rascunhos salvos
        </button>
        {active && (
          <button
            type="button"
            className="min-h-11 text-sm underline"
            disabled={disabled || busy}
            onClick={() => {
              setActive(null);
              setMessage("A próxima gravação criará um novo rascunho.");
            }}
          >
            Salvar como novo
          </button>
        )}
      </div>
      {message && (
        <p role="status" className="text-sm text-evo-accent">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="notice-error">
          {error}
        </p>
      )}
      <ul className="max-h-64 space-y-2 overflow-auto">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap justify-between gap-3 rounded-lg bg-evo-bgMain p-3 text-sm"
          >
            <span className="min-w-0 break-words">
              {item.title}
              {active?.id === item.id ? " · Em edição" : ""}
              <span className="block text-xs text-evo-textSec">
                Revisão {item.version}
              </span>
            </span>
            <div className="flex gap-3">
              <button
                type="button"
                className="min-h-11 underline"
                disabled={disabled || busy}
                onClick={() => {
                  if (
                    !window.confirm(
                      "Abrir substituirá os campos locais. Salve sua edição antes, se necessário. Continuar?",
                    )
                  )
                    return;
                  void act(async () => {
                    const result = await apiRequest<
                      Item & { payload: SavedDraftPayload }
                    >("/api/rankings/drafts/" + item.id);
                    onLoad(result.payload);
                    setActive({ id: result.id, version: result.version });
                    setMessage(
                      "Rascunho recuperado. Prepare a prévia para publicar.",
                    );
                  });
                }}
              >
                Abrir
              </button>
              <button
                type="button"
                className="min-h-11 text-evo-red underline"
                disabled={disabled || busy}
                onClick={() => {
                  if (
                    !window.confirm(
                      "Excluir este rascunho salvo? Publicações já feitas serão mantidas.",
                    )
                  )
                    return;
                  void act(async () => {
                    await apiRequest("/api/rankings/drafts/" + item.id, {
                      method: "DELETE",
                    });
                    if (active?.id === item.id) setActive(null);
                    await list();
                    setMessage("Rascunho excluído.");
                  });
                }}
              >
                Excluir
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
