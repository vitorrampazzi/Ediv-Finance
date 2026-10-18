import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, Check, Compass } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { guidedTourSteps } from "../lib/guidedTourSteps";
import { useTheme } from "../lib/theme";
import { ThemeToggle } from "./ThemeToggle";
import "./guided-tour.css";

type GuidedTourProps = {
  active: boolean;
  step: number;
  onStepChange: (step: number) => void;
  onComplete: () => void | Promise<void>;
  completing?: boolean;
  error?: string;
  notice?: string;
};
type TargetBounds = {
  left: number;
  top: number;
  width: number;
  height: number;
};

function visibleTarget(target: string) {
  return [
    ...document.querySelectorAll<HTMLElement>(`[data-tour="${target}"]`),
  ].find((node) => {
    const rect = node.getBoundingClientRect();
    return (
      node.getClientRects().length > 0 &&
      rect.width > 0 &&
      rect.height > 0 &&
      rect.bottom > 0 &&
      rect.top < window.innerHeight &&
      rect.right > 0 &&
      rect.left < window.innerWidth
    );
  });
}

export function GuidedTour({
  active,
  step,
  onStepChange,
  onComplete,
  completing = false,
  error,
  notice,
}: GuidedTourProps) {
  const currentIndex = Math.max(0, Math.min(guidedTourSteps.length - 1, step));
  const current = guidedTourSteps[currentIndex];
  const last = currentIndex === guidedTourSteps.length - 1;
  const id = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();
  const [geometry, setGeometry] = useState<{
    target: TargetBounds | null;
    left: number;
    top: number;
    forTarget: string;
  } | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [completionError, setCompletionError] = useState("");
  const busy = completing || finishing;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!active || !dialog) return;
    const previousFocus =
      document.activeElement instanceof HTMLElement &&
      document.activeElement !== document.body
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (!dialog.open) dialog.showModal();
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      const target = previousFocus?.isConnected
        ? previousFocus
        : visibleTarget("conta");
      target?.focus({ preventScroll: true });
    };
  }, [active]);

  useEffect(() => {
    if (active && location.pathname !== current.route) {
      navigate(current.route, { replace: true });
    }
  }, [active, current.route, location.pathname, navigate]);

  useEffect(() => {
    if (!active) return;
    const frame = window.requestAnimationFrame(() => {
      headingRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [active, currentIndex]);

  useEffect(() => {
    if (!active) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const panel = panelRef.current;
      if (!panel) return;
      const element = visibleTarget(current.target);
      const raw = element?.getBoundingClientRect();
      const width = window.innerWidth;
      const height = window.innerHeight;
      const gutter = 12;
      const panelWidth = panel.getBoundingClientRect().width;
      const panelHeight = panel.getBoundingClientRect().height;
      const target = raw
        ? {
            left: Math.max(4, raw.left - 5),
            top: Math.max(4, raw.top - 5),
            width: Math.min(
              width - Math.max(4, raw.left - 5) - 4,
              raw.width + 10,
            ),
            height: Math.min(
              height - Math.max(4, raw.top - 5) - 4,
              raw.height + 10,
            ),
          }
        : null;
      let left = (width - panelWidth) / 2;
      let top = (height - panelHeight) / 2;
      if (target) {
        const right = target.left + target.width + 20;
        const below = target.top + target.height + 20;
        const above = target.top - panelHeight - 20;
        if (width >= 900 && right + panelWidth <= width - gutter) {
          left = right;
          top = target.top;
        } else if (below + panelHeight <= height - gutter) {
          left = target.left + target.width / 2 - panelWidth / 2;
          top = below;
        } else if (above >= gutter) {
          left = target.left + target.width / 2 - panelWidth / 2;
          top = above;
        }
      }
      setGeometry({
        target,
        forTarget: current.target,
        left: Math.max(gutter, Math.min(left, width - panelWidth - gutter)),
        top: Math.max(gutter, Math.min(top, height - panelHeight - gutter)),
      });
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };
    schedule();
    const observer = new ResizeObserver(schedule);
    if (panelRef.current) observer.observe(panelRef.current);
    const target = visibleTarget(current.target);
    if (target) observer.observe(target);
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    window.visualViewport?.addEventListener("resize", schedule);
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
      window.visualViewport?.removeEventListener("resize", schedule);
    };
  }, [active, current.target, location.pathname]);

  async function finish() {
    if (busy) return;
    setFinishing(true);
    setCompletionError("");
    try {
      await onComplete();
    } catch {
      setCompletionError(
        "Não foi possível concluir a apresentação. Tente novamente.",
      );
    } finally {
      setFinishing(false);
    }
  }

  if (!active || typeof document === "undefined") return null;
  const position = geometry?.forTarget === current.target ? geometry : null;
  return createPortal(
    <dialog
      ref={dialogRef}
      className="ediv-guided-tour"
      aria-modal="true"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-description`}
      onCancel={(event) => event.preventDefault()}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          return;
        }
        if (event.key !== "Tab") return;
        const buttons = [
          ...event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled), a[href], [tabindex="0"]',
          ),
        ].filter((element) => element.getClientRects().length > 0);
        const first = buttons[0];
        const final = buttons.at(-1);
        if (!first || !final) {
          event.preventDefault();
          return;
        }
        if (
          event.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === headingRef.current)
        ) {
          event.preventDefault();
          final?.focus();
        } else if (!event.shiftKey && document.activeElement === final) {
          event.preventDefault();
          first?.focus();
        }
      }}
    >
      {position?.target ? (
        <div
          className="ediv-tour-spotlight"
          aria-hidden="true"
          style={position.target}
        />
      ) : (
        <div className="ediv-tour-dim" aria-hidden="true" />
      )}
      <div
        ref={panelRef}
        className="ediv-tour-panel"
        style={
          position ? { left: position.left, top: position.top } : undefined
        }
      >
        <p className="ediv-tour-eyebrow">
          <Compass size={17} aria-hidden="true" /> Introdução à Escola do Dividendo
        </p>
        <p className="ediv-tour-progress" aria-live="polite" aria-atomic="true">
          Etapa {currentIndex + 1} de {guidedTourSteps.length}
        </p>
        <h2 ref={headingRef} tabIndex={-1} id={`${id}-title`}>
          {current.title}
        </h2>
        <p id={`${id}-description`} className="ediv-tour-description">
          {current.description}
        </p>
        {current.target === "tema" && (
          <div className="ediv-tour-theme">
            <ThemeToggle />
            <span>Tema {theme === "dark" ? "escuro" : "claro"}</span>
          </div>
        )}
        {(error || completionError) && (
          <p role="alert" className="notice-error">
            {error || completionError}
          </p>
        )}
        {notice && (
          <p role="status" className="ediv-tour-storage-note">
            {notice}
          </p>
        )}
        <div className="ediv-tour-actions">
          <button
            type="button"
            className="action-secondary"
            disabled={currentIndex === 0 || busy}
            onClick={() => onStepChange(currentIndex - 1)}
          >
            <ArrowLeft size={16} aria-hidden="true" /> Voltar
          </button>
          <button
            type="button"
            className="action"
            disabled={busy}
            onClick={() =>
              last ? void finish() : onStepChange(currentIndex + 1)
            }
          >
            {last ? (busy ? "Concluindo…" : "Concluir") : "Continuar"}
            {last ? (
              <Check size={16} aria-hidden="true" />
            ) : (
              <ArrowRight size={16} aria-hidden="true" />
            )}
          </button>
        </div>
        <p className="ediv-tour-note">
          Avance pelos botões para conhecer cada área.
        </p>
      </div>
    </dialog>,
    document.body,
  );
}
