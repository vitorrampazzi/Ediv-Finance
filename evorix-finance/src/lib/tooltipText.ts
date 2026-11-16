import type { TooltipContent } from "../components/Tooltip";

/**
 * Flattens an explanation into one plain sentence, for places that accept only
 * text (title, aria-describedby). Kept out of the component module so the
 * component file exports components only.
 */
export function tooltipText(content: TooltipContent) {
  return typeof content === "string"
    ? content
    : [
        content.title,
        ...content.layers.map((layer) => `${layer.label}: ${layer.text}`),
        content.note,
      ]
        .filter(Boolean)
        .join(" ");
}
