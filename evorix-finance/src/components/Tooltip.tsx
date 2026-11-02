import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import "./tooltip.css";

function accessibleName(control: HTMLElement) {
  return (
    control.getAttribute("aria-label") ||
    control.textContent ||
    ""
  )
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

/**
 * Keeps the native control and its focus order; the hint also works inside dialogs.
 * With `toggleOnClick`, a tap or click (also Enter/Space) pins the hint open so
 * touch and screen reader users can read it; it closes on a second activation,
 * Escape or a press outside.
 */
export function Tooltip({
  content,
  children,
  toggleOnClick = false,
}: {
  content: string;
  children: ReactNode;
  toggleOnClick?: boolean;
}) {
  const id = useId();
  const hint = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const pinned = useRef(false);
  const [position, setPosition] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const show = (target: EventTarget | null) => {
    if (!content || !(target instanceof Element)) return false;
    const control =
      target.closest<HTMLElement>("button, a[href]") ||
      target.querySelector<HTMLElement>("button, a[href]");
    if (
      !control ||
      control.matches(":disabled") ||
      control.getAttribute("aria-expanded") === "true"
    )
      return false;
    trigger.current = control;
    const bounds = control.getBoundingClientRect();
    setPosition({
      left: bounds.left,
      top: bounds.bottom,
    });
    return true;
  };
  useLayoutEffect(() => {
    const element = hint.current;
    if (!position) {
      pinned.current = false;
      element?.hidePopover();
      return;
    }
    element?.showPopover();
    if (element) {
      element.style.left =
        Math.max(
          8,
          Math.min(position.left, window.innerWidth - element.offsetWidth - 8),
        ) + "px";
      element.style.top = position.top + "px";
    }
    if (
      element &&
      element.getBoundingClientRect().bottom > window.innerHeight
    ) {
      element.style.top =
        Math.max(
          8,
          (trigger.current?.getBoundingClientRect().top || 0) -
            element.offsetHeight,
        ) + "px";
    }
  }, [position]);
  useEffect(() => {
    if (!position) return;
    const control = trigger.current;
    const previousDescription = control?.getAttribute("aria-describedby");
    // A hint that repeats the control's name would be read twice.
    const describes =
      Boolean(control) &&
      accessibleName(control!) !==
        content.replace(/\s+/g, " ").trim().toLocaleLowerCase("pt-BR");
    if (describes)
      control?.setAttribute(
        "aria-describedby",
        [previousDescription, id].filter(Boolean).join(" "),
      );
    const close = () => setPosition(null);
    const key = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // Dismiss the hint before Escape reaches a containing dialog or menu.
      event.preventDefault();
      event.stopPropagation();
      close();
    };
    const pressOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (control?.contains(target) || hint.current?.contains(target)) return;
      close();
    };
    const reposition = () => {
      if (!control) return close();
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
        return close();
      setPosition({ left: bounds.left, top: bounds.bottom });
    };
    window.addEventListener("keydown", key, true);
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    document.addEventListener("pointerdown", pressOutside, true);
    return () => {
      if (describes) {
        if (previousDescription)
          control?.setAttribute("aria-describedby", previousDescription);
        else control?.removeAttribute("aria-describedby");
      }
      window.removeEventListener("keydown", key, true);
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
      document.removeEventListener("pointerdown", pressOutside, true);
    };
  }, [position, id, content]);
  return (
    <span
      className="ediv-tooltip-owner"
      onFocus={(event) => {
        if (event.target.matches(":focus-visible")) show(event.target);
      }}
      onPointerDownCapture={() => {
        if (!toggleOnClick) setPosition(null);
      }}
      onClickCapture={(event) => {
        if (!toggleOnClick) {
          setPosition(null);
          return;
        }
        if (pinned.current) {
          setPosition(null);
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
          setPosition(null);
      }}
      onPointerEnter={(event) => {
        if (event.pointerType !== "touch") show(event.target);
      }}
      onPointerLeave={(event) => {
        if (
          !pinned.current &&
          !(
            event.relatedTarget instanceof Node &&
            event.currentTarget.contains(event.relatedTarget)
          ) &&
          !(
            document.activeElement === trigger.current &&
            trigger.current?.matches(":focus-visible")
          )
        )
          setPosition(null);
      }}
    >
      {children}
      <div
        id={id}
        ref={hint}
        role="tooltip"
        popover="manual"
        className="ediv-tooltip-content"
        style={
          position ? { left: position.left, top: position.top } : undefined
        }
      >
        {content}
      </div>
    </span>
  );
}
