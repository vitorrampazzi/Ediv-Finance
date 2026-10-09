import { CircleAlert, Inbox, LoaderCircle } from "lucide-react";
import { Link } from "react-router-dom";

type PageStateProps = {
  kind: "loading" | "error" | "empty";
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionTo?: string;
};

export function PageState({
  kind,
  title,
  description,
  actionLabel,
  onAction,
  actionTo,
}: PageStateProps) {
  const Icon =
    kind === "loading" ? LoaderCircle : kind === "error" ? CircleAlert : Inbox;
  return (
    <section
      className="border-y border-evo-border py-7"
      role={kind === "error" ? "alert" : "status"}
    >
      <div className="flex items-start gap-3">
        <Icon
          size={21}
          aria-hidden="true"
          className={`mt-0.5 shrink-0 text-evo-accent ${kind === "loading" ? "animate-spin motion-reduce:animate-none" : ""}`}
        />
        <div className="min-w-0">
          <h2 className="font-semibold">{title}</h2>
          {description && (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-evo-textSec">
              {description}
            </p>
          )}
        </div>
      </div>
      {actionLabel && actionTo ? (
        <Link className="action-secondary mt-4" to={actionTo}>
          {actionLabel}
        </Link>
      ) : actionLabel && onAction ? (
        <button
          type="button"
          className="action-secondary mt-4"
          onClick={onAction}
        >
          {actionLabel}
        </button>
      ) : null}
    </section>
  );
}
