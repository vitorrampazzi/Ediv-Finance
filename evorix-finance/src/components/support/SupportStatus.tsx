import { CheckCheck, Clock3, MessageCircle } from "lucide-react";
import { supportStatusLabel } from "../../lib/support";

export function SupportStatus({ status }: { status: string }) {
  const Icon =
    status === "ANSWERED"
      ? CheckCheck
      : status === "IN_PROGRESS"
        ? MessageCircle
        : Clock3;
  const color =
    status === "ANSWERED"
      ? "border-evo-green/30 bg-evo-green/10 text-evo-green"
      : status === "IN_PROGRESS"
        ? "border-evo-accent/30 bg-evo-accent/10 text-evo-accent"
        : "border-evo-border text-evo-textSec";
  return (
    <span
      className={
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs " +
        color
      }
    >
      <Icon size={13} aria-hidden="true" />
      {supportStatusLabel(status)}
    </span>
  );
}
