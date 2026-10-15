import { useEffect, useRef } from "react";

export function usePublicHomeMotion() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let entrance: IntersectionObserver | undefined;
    let loops: IntersectionObserver | undefined;
    const start = () => {
      entrance?.disconnect();
      loops?.disconnect();
      const reveals = element.querySelectorAll<HTMLElement>("[data-ph-reveal]");
      const moving = element.querySelectorAll<HTMLElement>("[data-ph-loop]");
      if (motion.matches || typeof IntersectionObserver === "undefined") {
        element.classList.remove("ph-js-anim");
        reveals.forEach((item) => item.classList.add("ph-visible"));
        moving.forEach((item) => item.setAttribute("data-ph-inview", "false"));
        return;
      }
      // Mark the first screen before enabling progressive entrances.
      reveals.forEach((item) => {
        const rect = item.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0)
          item.classList.add("ph-visible");
      });
      entrance = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("ph-visible");
            entrance?.unobserve(entry.target);
          });
        },
        { threshold: 0.08 },
      );
      reveals.forEach((item) => {
        if (!item.classList.contains("ph-visible")) entrance?.observe(item);
      });
      loops = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) =>
            entry.target.setAttribute(
              "data-ph-inview",
              String(entry.isIntersecting),
            ),
          );
        },
        { threshold: 0.1 },
      );
      moving.forEach((item) => loops?.observe(item));
      element.classList.add("ph-js-anim");
    };
    start();
    motion.addEventListener("change", start);
    return () => {
      entrance?.disconnect();
      loops?.disconnect();
      motion.removeEventListener("change", start);
      element.classList.remove("ph-js-anim");
    };
  }, []);
  return root;
}
