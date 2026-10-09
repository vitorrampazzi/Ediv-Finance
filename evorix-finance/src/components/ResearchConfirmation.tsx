import { useEffect, useId, useRef } from "react";
import { AlertCircle } from "lucide-react";

export interface ResearchConfirmationAction {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
}

export function ResearchConfirmation({
  action,
  onCancel,
}: {
  action: ResearchConfirmationAction;
  onCancel: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      className="m-auto w-[calc(100%_-_2rem)] max-w-md rounded-2xl border border-evo-border bg-evo-bgSec p-6 text-evo-textMain backdrop:bg-black/70"
    >
      <AlertCircle
        className="mb-3 text-evo-accent"
        size={24}
        aria-hidden="true"
      />
      <h3 id={titleId} className="text-lg font-semibold">
        {action.title}
      </h3>
      <p
        id={descriptionId}
        className="mt-2 text-sm leading-relaxed text-evo-textSec"
      >
        {action.description}
      </p>
      <div className="mt-5 flex flex-wrap justify-end gap-3">
        <button
          type="button"
          autoFocus
          onClick={onCancel}
          className="min-h-11 rounded-lg border border-evo-border px-4 text-sm"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={action.onConfirm}
          className="min-h-11 rounded-lg bg-evo-accent px-4 text-sm font-semibold text-evo-bgMain"
        >
          {action.confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
