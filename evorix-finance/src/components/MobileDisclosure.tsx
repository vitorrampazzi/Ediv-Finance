import { useId, useState } from "react";
import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

// Supplemental content stays available on demand on phones and open on desktop.
export function MobileDisclosure({
  title,
  children,
  className = "",
  contentClassName = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  return (
    <div className={`min-w-0 ${className}`}>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={id}
        onClick={() => setExpanded((value) => !value)}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-evo-border px-3 text-left text-sm font-medium text-evo-textMain sm:hidden"
      >
        {title}
        <ChevronDown
          size={17}
          aria-hidden="true"
          className={`shrink-0 transition-transform motion-reduce:transition-none ${expanded ? "rotate-180" : ""}`}
        />
      </button>
      <div
        id={id}
        className={`${expanded ? "block" : "hidden"} pt-4 sm:block sm:pt-0`}
      >
        <div className={contentClassName}>{children}</div>
      </div>
    </div>
  );
}
