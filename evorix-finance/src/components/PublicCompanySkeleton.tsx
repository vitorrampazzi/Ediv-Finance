// Placeholder for the public company page while the session or the ranking loads.
// It follows the final layout (trail, masthead, indicators, text blocks) so the
// footer stays where it will be. Only Tailwind classes; motion-safe pulse only.
const page = "mx-auto max-w-6xl px-4 py-6 sm:px-6 md:py-10";

export function PublicCompanySkeleton({ label }: { label: string }) {
  return (
    <section className={`${page} min-h-screen`} aria-busy="true">
      <p role="status" className="sr-only">
        {label}
      </p>
      <div aria-hidden="true" className="motion-safe:animate-pulse">
        <div className="h-4 w-56 max-w-full rounded bg-evo-border/20" />
        <div className="mt-6 space-y-3">
          <div className="h-4 w-48 rounded bg-evo-border/20" />
          <div className="h-9 w-2/3 max-w-md rounded bg-evo-border/30" />
          <div className="h-4 w-full max-w-2xl rounded bg-evo-border/20" />
          <div className="h-4 w-4/5 max-w-xl rounded bg-evo-border/20" />
        </div>
        <div className="mt-8 space-y-4">
          <div className="h-6 w-56 max-w-full rounded bg-evo-border/30" />
          <div className="grid gap-3 sm:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="h-28 rounded-xl border border-evo-border bg-evo-bgSec"
              />
            ))}
          </div>
          <div className="h-3 w-full max-w-3xl rounded bg-evo-border/20" />
          <div className="h-3 w-5/6 max-w-2xl rounded bg-evo-border/20" />
        </div>
        <div className="mt-10 space-y-3">
          <div className="h-6 w-64 max-w-full rounded bg-evo-border/30" />
          <div className="h-4 w-full max-w-2xl rounded bg-evo-border/20" />
          <div className="h-4 w-3/4 max-w-xl rounded bg-evo-border/20" />
          <div className="h-4 w-2/3 max-w-lg rounded bg-evo-border/20" />
        </div>
      </div>
    </section>
  );
}
