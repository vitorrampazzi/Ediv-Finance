import { Link, useLocation } from "react-router-dom";
import { LockKeyhole, ArrowRight } from "lucide-react";
import { authLink } from "../lib/authDestination";

export function AccountGate({
  title = "Continue sua pesquisa",
  description = "Crie sua conta gratuita para explorar o ranking completo, consultar os dados das empresas e salvar seus favoritos.",
  next,
  compact = false,
}: {
  title?: string;
  description?: string;
  next?: string;
  compact?: boolean;
}) {
  const location = useLocation();
  const destination =
    next || location.pathname + location.search + location.hash;
  return (
    <section
      className={`rounded-xl border border-evo-accent/25 bg-evo-accent/5 ${compact ? "p-4" : "p-5 sm:p-7"}`}
      aria-label="Acesso com conta gratuita"
    >
      <div className="flex items-start gap-3">
        <span className="rounded-lg bg-evo-accent/10 p-2 text-evo-accent">
          <LockKeyhole size={18} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-evo-accent">
            Conta gratuita
          </p>
          <h3 className="mt-1 font-semibold">{title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-evo-textSec">
            {description}
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link className="action" to={authLink("cadastro", destination)}>
          Criar conta grátis <ArrowRight size={16} aria-hidden="true" />
        </Link>
        <Link
          className="inline-flex min-h-11 items-center text-sm text-evo-accent underline"
          to={authLink("entrar", destination)}
        >
          Já tenho conta
        </Link>
      </div>
      {!compact && (
        <p className="mt-3 text-xs text-evo-textSec">
          Cadastro gratuito. A assessoria é um serviço separado.
        </p>
      )}
    </section>
  );
}
