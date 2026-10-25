import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import "./tooltip.css";

/** Keeps the native control and its focus order; the hint also works inside dialogs. */
export function Tooltip({
  content,
  children,
}: {
  content: string;
  children: ReactNode;
}) {
  const id = useId();
  const hint = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const [position, setPosition] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const show = (target: EventTarget | null) => {
    if (!content) return;
    if (!(target instanceof Element)) return;
    const control =
      target.closest<HTMLElement>("button, a[href]") ||
      target.querySelector<HTMLElement>("button, a[href]");
    if (
      !control ||
      control.matches(":disabled") ||
      control.getAttribute("aria-expanded") === "true"
    )
      return;
    trigger.current = control;
    const bounds = control.getBoundingClientRect();
    setPosition({
      left: bounds.left,
      top: bounds.bottom,
    });
  };
  useLayoutEffect(() => {
    const element = hint.current;
    if (!position) {
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
    const reposition = () => {
      if (!control) return close();
      const bounds = control.getBoundingClientRect();
      if (
        bounds.bottom <= 0 ||
        bounds.top >= window.innerHeight ||
        bounds.right <= 0 ||
        bounds.left >= window.innerWidth ||
        !(
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
    return () => {
      if (previousDescription)
        control?.setAttribute("aria-describedby", previousDescription);
      else control?.removeAttribute("aria-describedby");
      window.removeEventListener("keydown", key, true);
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [position, id]);
  return (
    <span
      className="ediv-tooltip-owner"
      onFocus={(event) => {
        if (event.target.matches(":focus-visible")) show(event.target);
      }}
      onPointerDownCapture={() => setPosition(null)}
      onClickCapture={() => setPosition(null)}
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
