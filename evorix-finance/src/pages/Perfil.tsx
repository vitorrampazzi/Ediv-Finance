import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/authContext";
import { roleLabels } from "../lib/permissions";

export const Perfil = () => {
  const { user } = useAuth();
  return (
    <section className="mx-auto max-w-4xl space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[.18em] text-evo-accent">
          Sua conta na escola
        </p>
        <h1 className="mt-3 text-3xl font-semibold">Meu perfil</h1>
        <p className="mt-3 text-sm text-evo-textSec">
          Seu acesso às pesquisas e à educação sobre dividendos.
        </p>
      </header>
      <dl className="grid gap-6 border-y border-evo-border py-7 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-evo-textSec">Nome</dt>
          <dd className="mt-2 break-words font-medium">{user?.name}</dd>
        </div>
        <div>
          <dt className="text-xs text-evo-textSec">E-mail</dt>
          <dd className="mt-2 break-all font-medium">{user?.email}</dd>
        </div>
        <div>
          <dt className="text-xs text-evo-textSec">Confirmação de e-mail</dt>
          <dd className="mt-2">
            {user?.emailVerified ? "Confirmado" : "Pendente"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-evo-textSec">Perfil de acesso</dt>
          <dd className="mt-2">{user ? roleLabels[user.role] : "—"}</dd>
        </div>
      </dl>
      <div className="grid gap-8 sm:grid-cols-2">
        <article>
          <BookOpen className="text-evo-accent" size={22} />
          <h2 className="mt-4 text-xl font-semibold">Continue sua formação</h2>
          <p className="mt-3 text-sm leading-relaxed text-evo-textSec">
            Estude as aulas, responda aos exercícios e acompanhe as etapas
            concluídas na escola de dividendos.
          </p>
          <Link
            className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm text-evo-accent"
            to="/app/aprender"
          >
            Entrar na escola <ArrowRight size={16} />
          </Link>
        </article>
        <article>
          <ShieldCheck className="text-evo-accent" size={22} />
          <h2 className="mt-4 text-xl font-semibold">Controle sua conta</h2>
          <p className="mt-3 text-sm leading-relaxed text-evo-textSec">
            Troque a senha, encerre sessões, exporte seus dados ou solicite a
            exclusão da conta nas configurações.
          </p>
          <Link
            className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm text-evo-accent"
            to="/app/config"
          >
            Conta e segurança <ArrowRight size={16} />
          </Link>
        </article>
      </div>
    </section>
  );
};
