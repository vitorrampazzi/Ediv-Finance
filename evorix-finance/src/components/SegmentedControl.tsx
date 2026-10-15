import { useId, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { KeyboardEvent } from "react";
import "./segmented-control.css";

export function SegmentedControl({
  labels,
  selected,
  onSelect,
  label,
  controls,
}: {
  labels: readonly string[];
  selected: number;
  onSelect: (index: number) => void;
  label: string;
  controls?: string;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    if (event.key === "ArrowRight") next = (index + 1) % labels.length;
    else if (event.key === "ArrowLeft")
      next = (index + labels.length - 1) % labels.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = labels.length - 1;
    else return;
    event.preventDefault();
    onSelect(next);
    root.current?.querySelectorAll<HTMLButtonElement>("button")[next]?.focus();
  }
  return (
    <div className="ediv-segmented" role="group" aria-label={label} ref={root}>
      {labels.map((text, index) => (
        <button
          key={text}
          type="button"
          aria-pressed={selected === index}
          aria-controls={controls}
          onClick={() => onSelect(index)}
          onKeyDown={(event) => navigate(event, index)}
        >
          {selected === index && (
            <motion.span
              className="ediv-segmented-selection"
              layoutId={`${id}-selection`}
              transition={
                reducedMotion
                  ? { duration: 0 }
                  : { type: "spring", bounce: 0, duration: 0.28 }
              }
              aria-hidden="true"
            />
          )}
          <span className="ediv-segmented-label">{text}</span>
        </button>
      ))}
    </div>
  );
}
