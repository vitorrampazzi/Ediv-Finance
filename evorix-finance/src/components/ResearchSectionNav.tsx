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

    const selectSection = () => {
      frame = 0;
      const readingLine = nav.getBoundingClientRect().bottom + 24;
      const lastPassed = targets.filter(
        (target) => target.getBoundingClientRect().top <= readingLine,
      ).at(-1);
      const next = lastPassed?.id ?? targets[0]?.id;
      if (next) setActive((current) => current === next ? current : next);
    };
    const scheduleSelection = () => {
      if (!frame) frame = window.requestAnimationFrame(selectSection);
    };
    const observe = () => {
      observer?.disconnect();
      // Observe a reading band below the sticky header. Section boundaries update
      // the indicator without subscribing to every scroll frame.
      const top = Math.round(nav.getBoundingClientRect().height + (innerWidth >= 768 ? 80 : 64));
      const bottom = Math.max(0, window.innerHeight - top - 120);
      observer = new IntersectionObserver(scheduleSelection, {
        rootMargin: `-${top}px 0px -${bottom}px 0px`,
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
    const adjustment = bounds.left < viewport.left
      ? bounds.left - viewport.left - 12
      : bounds.right > viewport.right
        ? bounds.right - viewport.right + 12
        : 0;
    if (adjustment) nav.scrollBy({ left: adjustment, behavior: "instant" });
  }, [active]);

  return (
    <nav ref={navigation} aria-label="Seções da pesquisa" className="research-section-nav">
      {sections.map(([anchor, label], index) => (
        <a
          key={anchor}
          href={`#${anchor}`}
          aria-current={active === anchor ? "location" : undefined}
          onClick={() => setActive(anchor)}
        >
          <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
          {label}
        </a>
      ))}
    </nav>
  );
}
