import { Suspense, useLayoutEffect, useRef } from "react";
import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { PageErrorBoundary } from "./PageErrorBoundary";

export function PageLoading() {
  return (
    <section
      className="mx-auto min-h-[50vh] w-full max-w-7xl px-4 py-8 sm:px-6"
      aria-busy="true"
    >
      <p role="status" className="text-sm text-evo-textSec">
        Abrindo página…
      </p>
      <div
        aria-hidden="true"
        className="mt-6 space-y-5 motion-safe:animate-pulse"
      >
        <div className="h-7 w-2/3 max-w-md rounded bg-evo-border/30" />
        <div className="h-4 w-4/5 max-w-lg rounded bg-evo-border/20" />
        <div className="space-y-4 border-t border-evo-border pt-6">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-14 rounded-lg bg-evo-card/40" />
          ))}
        </div>
      </div>
    </section>
  );
}

// This mounts after the lazy route is ready. Query/hash changes keep the same
// page instance, its forms, filters, videos and lesson position.
function RevealedPage({ children }: { children: ReactNode }) {
  const { hash } = useLocation();
  const reducedMotion = useReducedMotion();
  const entryHash = useRef(hash);
  useLayoutEffect(() => {
    if (!entryHash.current)
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);
  return (
    <motion.div
      className="page-enter min-w-0"
      initial={reducedMotion ? false : { y: 5 }}
      animate={{ y: 0 }}
      transition={
        reducedMotion
          ? { duration: 0 }
          : { type: "spring", bounce: 0, duration: 0.26 }
      }
    >
      {children}
    </motion.div>
  );
}

export function PageContent({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <PageErrorBoundary key={pathname} embedded>
      <Suspense fallback={<PageLoading />}>
        <RevealedPage key={pathname}>{children}</RevealedPage>
      </Suspense>
    </PageErrorBoundary>
  );
}
