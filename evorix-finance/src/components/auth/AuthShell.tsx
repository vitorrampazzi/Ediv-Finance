import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CircleAlert } from "lucide-react";

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
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-evo-border bg-evo-card p-6 shadow-2xl sm:p-8">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-evo-textSec hover:text-evo-textMain"
        >
          <img
            src="/ediv-logo.png"
            alt=""
            aria-hidden="true"
            className="h-8 w-8 object-contain mix-blend-screen"
          />
          Ediv Finance
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
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
        <p className="mt-6 border-t border-evo-border pt-4 text-xs leading-relaxed text-evo-textSec">
          Esta versão permite salvar operações manuais de carteira, mas não
          conecta corretoras nem movimenta dinheiro. Nunca use a senha de outro
          serviço.
        </p>
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
