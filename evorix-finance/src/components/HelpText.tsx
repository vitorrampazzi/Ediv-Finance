import type { TooltipContent } from "./Tooltip";

/**
 * Explanation shown inline on the page (not as a hint). Plain text becomes a
 * paragraph; layered content becomes a definition list. Only text tokens are
 * used here: colour comes from the surrounding element, so both themes work.
 */
export function HelpText({
  content,
  className = "",
}: {
  content: TooltipContent;
  className?: string;
}) {
  if (typeof content === "string") {
    return <p className={className}>{content}</p>;
  }
  return (
    <div className={className}>
      {content.title && <p className="font-semibold">{content.title}</p>}
      <dl className="mt-2 space-y-3">
        {content.layers.map((layer) => (
          <div key={layer.label}>
            <dt className="font-semibold">{layer.label}</dt>
            <dd className="mt-0.5">{layer.text}</dd>
          </div>
        ))}
      </dl>
      {content.note && (
        <p className="mt-3 text-xs text-fmk-sub">{content.note}</p>
      )}
    </div>
  );
}
