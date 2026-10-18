import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CircleAlert } from "lucide-react";
import { openPrivacyPreferences } from "../../lib/analytics";

export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="auth-shell flex min-h-screen items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-evo-border/70 bg-evo-bgSec px-5 py-7 sm:p-9">
        <Link
          to="/"
          className="mb-8 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-evo-textSec hover:text-evo-textMain"
        >
          <img
            src="/ediv-logo-clean.png"
            alt=""
            aria-hidden="true"
            className="h-8 w-8 object-contain"
          />
          Escola do Dividendo
        </Link>
        <h1 className="display-title text-3xl">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-evo-textSec">
          {description}
        </p>
        {children}
        <Link
          to="/"
          className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm text-evo-textSec"
        >
          <ArrowLeft size={16} /> Voltar ao site
        </Link>
        <button
          type="button"
          className="mt-2 block min-h-11 text-left text-xs text-evo-textSec underline"
          onClick={openPrivacyPreferences}
        >
          Preferências de cookies
        </button>
      </section>
    </main>
  );
}

export function ErrorMessage({ children }: { children: string }) {
  return (
    <p
      role="alert"
      className="mt-4 flex items-start gap-2 rounded-lg border border-evo-red/20 bg-evo-red/5 p-3 text-sm text-evo-red"
    >
      <CircleAlert size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
      {children}
    </p>
  );
}
