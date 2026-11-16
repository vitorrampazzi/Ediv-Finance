import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import "./tooltip.css";
import { tooltipText } from "../lib/tooltipText";

/**
 * A longer explanation in short layers ("O que é", "Como é calculado"…),
 * instead of one dense sentence. Plain data, so the texts can live in one
 * module (src/lib/indicatorDefinitions.ts) and be reused by every screen.
 */
export type TooltipLayers = {
  title?: string;
  layers: readonly { label: string; text: string }[];
  // Closing line: where the number comes from (estimate, quote, history).
  note?: string;
};
export type TooltipContent = string | TooltipLayers;

const clean = (text: string) =>
  text.replace(/\s+/g, " ").trim().toLocaleLowerCase("pt-BR");

function accessibleName(control: HTMLElement) {
  return clean(
    control.getAttribute("aria-label") || control.textContent || "",
  );
}

const describedBy = (control: HTMLElement) =>
  (control.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean);

// Distance kept from the viewport edges and from the control.
const EDGE = 8;
const GAP = 6;
// Time to cross the gap between the control and the hint with the pointer.
const LEAVE_DELAY = 140;

/**
 * Keeps the native control and its focus order; the hint also works inside
 * dialogs and scrollable tables, because it is drawn on the top layer.
 *
 * - Pointer: opens on hover and stays while the pointer is over the control or
 *   the hint itself (WCAG 1.4.13).
 * - Keyboard: opens on focus, Escape dismisses it and the focus stays.
 * - With `toggleOnClick`, a tap or click (also Enter/Space) pins the hint open,
 *   so touch users can read it; it closes on a second activation, Escape or a
 *   press outside.
 * - Screen readers: the control is always described by the hint
 *   (`aria-describedby`), open or not, unless the hint only repeats its name.
 */
export function Tooltip({
  content,
  children,
  toggleOnClick = false,
  onOpen,
}: {
  content: TooltipContent;
  children: ReactNode;
  toggleOnClick?: boolean;
  // Called the first time this hint opens (once per mount), e.g. to count
  // which explanations are read without repeating on every hover.
  onOpen?: () => void;
}) {
  const id = useId();
  const owner = useRef<HTMLSpanElement>(null);
  const hint = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const pinned = useRef(false);
  const leaving = useRef<number | null>(null);
  const [position, setPosition] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const text = tooltipText(content);
  const layered = typeof content !== "string";
  const opened = useRef(false);
  const isOpen = position !== null;
  useEffect(() => {
    if (!isOpen || opened.current) return;
    opened.current = true;
    onOpen?.();
    // Only the first opening counts; a new `onOpen` identity is not a new one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const cancelLeave = () => {
    if (leaving.current !== null) window.clearTimeout(leaving.current);
    leaving.current = null;
  };
  const close = () => {
    cancelLeave();
    setPosition(null);
  };
  const describe = (control: HTMLElement) => {
    if (!text || accessibleName(control) === clean(text)) return;
    const tokens = describedBy(control);
    if (!tokens.includes(id))
      control.setAttribute("aria-describedby", [...tokens, id].join(" "));
  };
  const show = (target: EventTarget | null) => {
    if (!text || !(target instanceof Element)) return false;
    const control =
      target.closest<HTMLElement>("button, a[href]") ||
      target.querySelector<HTMLElement>("button, a[href]");
    if (
      !control ||
      control.matches(":disabled") ||
      control.getAttribute("aria-expanded") === "true"
    )
      return false;
    cancelLeave();
    trigger.current = control;
    describe(control);
    const bounds = control.getBoundingClientRect();
    setPosition({
      left: bounds.left,
      top: bounds.bottom,
    });
    return true;
  };

  // The description is linked from the start, so a screen reader reads it with
  // the control without having to open the hint first. A hint that repeats the
  // control's name is left out: it would be read twice.
  useEffect(() => {
    const control = owner.current?.querySelector<HTMLElement>(
      "button, a[href]",
    );
    if (!control) return;
    describe(control);
    return () => {
      const rest = describedBy(control).filter((token) => token !== id);
      if (rest.length) control.setAttribute("aria-describedby", rest.join(" "));
      else control.removeAttribute("aria-describedby");
    };
    // `describe` only reads `id` and `text`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, text]);

  useLayoutEffect(() => {
    const element = hint.current;
    if (!element) return;
    if (!position) {
      pinned.current = false;
      if (typeof element.hidePopover === "function") element.hidePopover();
      return;
    }
    if (typeof element.showPopover === "function") element.showPopover();
    // Measured at its natural size, then fitted to the side with more room.
    element.style.maxHeight = "";
    const control = trigger.current?.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = window.innerHeight;
    const width = element.offsetWidth;
    const height = element.offsetHeight;
    const anchorTop = control?.top ?? position.top;
    const anchorBottom = control?.bottom ?? position.top;
    const below = viewportHeight - anchorBottom - GAP - EDGE;
    const above = anchorTop - GAP - EDGE;
    const placeAbove = height > below && above > below;
    const room = Math.max(placeAbove ? above : below, 96);
    // Taller than its side: when the screen has room for the whole text, it is
    // shown whole over the control (not cut); otherwise it scrolls inside.
    const whole = height <= viewportHeight - EDGE * 2;
    const shown = height <= room || whole ? height : room;
    if (shown < height) element.style.maxHeight = room + "px";
    // Small icon controls get the hint centred; wider ones keep the left edge.
    const anchorLeft =
      control && control.width <= 32
        ? control.left + control.width / 2 - width / 2
        : position.left;
    element.style.left =
      Math.max(EDGE, Math.min(anchorLeft, viewportWidth - width - EDGE)) + "px";
    element.style.top =
      Math.max(
        EDGE,
        placeAbove
          ? anchorTop - GAP - shown
          : Math.min(anchorBottom + GAP, viewportHeight - shown - EDGE),
      ) + "px";
    element.dataset.side = placeAbove ? "above" : "below";
  }, [position, text]);

  useEffect(() => {
    if (!position) return;
    const control = trigger.current;
    const key = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // Dismiss the hint before Escape reaches a containing dialog or menu.
      event.preventDefault();
      event.stopPropagation();
      cancelLeave();
      setPosition(null);
    };
    const pressOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (control?.contains(target) || hint.current?.contains(target)) return;
      cancelLeave();
      setPosition(null);
    };
    const reposition = (event?: Event) => {
      // Scrolling the hint's own text must not move or close it.
      if (
        event?.target instanceof Node &&
        hint.current?.contains(event.target)
      )
        return;
      if (!control) return setPosition(null);
      const bounds = control.getBoundingClientRect();
      if (
        bounds.bottom <= 0 ||
        bounds.top >= window.innerHeight ||
        bounds.right <= 0 ||
        bounds.left >= window.innerWidth ||
        !(
          pinned.current ||
          (document.activeElement === control &&
            control.matches(":focus-visible")) ||
          control.matches(":hover") ||
          hint.current?.matches(":hover")
        )
      )
        return setPosition(null);
      setPosition({ left: bounds.left, top: bounds.bottom });
    };
    window.addEventListener("keydown", key, true);
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    document.addEventListener("pointerdown", pressOutside, true);
    return () => {
      window.removeEventListener("keydown", key, true);
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
      document.removeEventListener("pointerdown", pressOutside, true);
    };
  }, [position]);

  // No timer survives the component.
  useEffect(
    () => () => {
      if (leaving.current !== null) window.clearTimeout(leaving.current);
    },
    [],
  );

  return (
    <span
      ref={owner}
      className="ediv-tooltip-owner"
      onFocus={(event) => {
        if (event.target.matches(":focus-visible")) show(event.target);
      }}
      onPointerDownCapture={() => {
        if (!toggleOnClick) close();
      }}
      onClickCapture={(event) => {
        // A click inside the hint (selecting its text) is not an activation.
        if (
          event.target instanceof Node &&
          hint.current?.contains(event.target)
        )
          return;
        if (!toggleOnClick) {
          close();
          return;
        }
        if (pinned.current) {
          close();
          return;
        }
        if (show(event.target)) pinned.current = true;
      }}
      onBlur={(event) => {
        if (
          !(
            event.relatedTarget instanceof Node &&
            event.currentTarget.contains(event.relatedTarget)
          ) &&
          !trigger.current?.matches(":hover") &&
          !hint.current?.matches(":hover")
        )
          close();
      }}
      onPointerEnter={(event) => {
        if (event.pointerType === "touch") return;
        cancelLeave();
        if (!position) show(event.target);
      }}
      onPointerLeave={(event) => {
        if (
          event.pointerType === "touch" ||
          pinned.current ||
          (event.relatedTarget instanceof Node &&
            event.currentTarget.contains(event.relatedTarget)) ||
          (document.activeElement === trigger.current &&
            trigger.current?.matches(":focus-visible"))
        )
          return;
        // A short wait lets the pointer cross the gap to the hint.
        cancelLeave();
        leaving.current = window.setTimeout(() => {
          leaving.current = null;
          if (
            !pinned.current &&
            !trigger.current?.matches(":hover") &&
            !hint.current?.matches(":hover")
          )
            setPosition(null);
        }, LEAVE_DELAY);
      }}
    >
      {children}
      <div
        id={id}
        ref={hint}
        role="tooltip"
        popover="manual"
        data-open={position ? "" : undefined}
        data-layered={layered ? "" : undefined}
        className="ediv-tooltip-content"
        style={
          position ? { left: position.left, top: position.top } : undefined
        }
      >
        {typeof content === "string" ? (
          content
        ) : (
          <>
            {content.title && (
              <p className="ediv-tooltip-title">{content.title}</p>
            )}
            <dl className="ediv-tooltip-layers">
              {content.layers.map((layer) => (
                <div key={layer.label}>
                  <dt>{layer.label}</dt>
                  <dd>{layer.text}</dd>
                </div>
              ))}
            </dl>
            {content.note && <p className="ediv-tooltip-note">{content.note}</p>}
          </>
        )}
      </div>
    </span>
  );
}
