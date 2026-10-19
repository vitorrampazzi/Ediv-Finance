import { useEffect, useRef, useState } from "react";
import "./research-section-nav.css";

const sections = [
  ["insight", "Gráfico do cenário"],
  ["tese", "Opinião e cenário"],
  ["riscos", "Riscos"],
  ["historia", "A empresa"],
  ["estatisticas", "Estatísticas"],
  ["fundamentos", "Fundamentos"],
  ["fontes", "Fontes e versão"],
] as const;

export function ResearchSectionNav() {
  const navigation = useRef<HTMLElement>(null);
  const [active, setActive] = useState<string>(sections[0][0]);

  useEffect(() => {
    const nav = navigation.current;
    const article = nav?.closest("article");
    if (!nav || !article || typeof IntersectionObserver === "undefined") return;

    const targets = sections
      .map(([id]) => article.querySelector<HTMLElement>(`#${id}`))
      .filter((target): target is HTMLElement => target !== null);
    let frame = 0;
    let observer: IntersectionObserver | undefined;
    let readingLine = 0;

    const selectSection = () => {
      frame = 0;
      const lastPassed = targets
        .filter(
          (target) => target.getBoundingClientRect().top <= readingLine + 2,
        )
        .at(-1);
      const next = lastPassed?.id ?? targets[0]?.id;
      if (next) setActive((current) => (current === next ? current : next));
    };
    const scheduleSelection = () => {
      if (!frame) frame = window.requestAnimationFrame(selectSection);
    };
    const observe = () => {
      observer?.disconnect();
      // Match the anchor's scroll margin so a clicked section stays selected.
      // A narrow band tracks section boundaries without a scroll-frame listener.
      const stickyTop =
        Number.parseFloat(window.getComputedStyle(nav).top) || 0;
      const anchorOffset = Math.max(
        0,
        ...targets.map(
          (target) =>
            Number.parseFloat(
              window.getComputedStyle(target).scrollMarginTop,
            ) || 0,
        ),
      );
      readingLine = Math.min(
        Math.max(0, window.innerHeight - 2),
        Math.ceil(
          Math.max(
            nav.getBoundingClientRect().height + stickyTop + 24,
            anchorOffset,
          ),
        ),
      );
      const bottom = Math.max(0, window.innerHeight - readingLine - 1);
      observer = new IntersectionObserver(scheduleSelection, {
        rootMargin: `-${readingLine}px 0px -${bottom}px 0px`,
        threshold: 0,
      });
      targets.forEach((target) => observer?.observe(target));
      scheduleSelection();
    };
    observe();
    window.addEventListener("resize", observe);
    window.addEventListener("hashchange", scheduleSelection);
    return () => {
      observer?.disconnect();
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", observe);
      window.removeEventListener("hashchange", scheduleSelection);
    };
  }, []);

  useEffect(() => {
    const nav = navigation.current;
    const link = nav?.querySelector<HTMLElement>(`[href="#${active}"]`);
    if (!nav || !link) return;
    const viewport = nav.getBoundingClientRect();
    const bounds = link.getBoundingClientRect();
    const adjustment =
      bounds.left < viewport.left
        ? bounds.left - viewport.left - 12
        : bounds.right > viewport.right
          ? bounds.right - viewport.right + 12
          : 0;
    if (adjustment) nav.scrollBy({ left: adjustment, behavior: "instant" });
  }, [active]);

  return (
    <nav
      ref={navigation}
      aria-label="Seções da pesquisa"
      className="research-section-nav"
    >
      {sections.map(([anchor, label]) => (
        <a
          key={anchor}
          href={`#${anchor}`}
          aria-current={active === anchor ? "location" : undefined}
          onClick={() => setActive(anchor)}
        >
          {label}
        </a>
      ))}
    </nav>
  );
}
