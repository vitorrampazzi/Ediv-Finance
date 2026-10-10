import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Menu,
  TrendingUp,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/authContext";

export function SiteHeader() {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const links = [
    {
      to: user ? "/app/ranking" : "/ranking",
      label: "Ranking de previsões",
      Icon: TrendingUp,
    },
    {
      to: user ? "/app/analises" : "/mercado",
      label: "Análises de ações",
      Icon: BarChart3,
    },
    {
      to: user ? "/app/aprender" : "/aprender",
      label: "Aprender",
      Icon: BookOpen,
    },
  ];
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
        menuButton.current?.focus();
      }
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, []);
  return (
    <>
      <a
        href="#conteudo"
        className="sr-only z-50 rounded bg-evo-primary px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Pular para o conteúdo
      </a>
      <header className="sticky top-0 z-40 border-b border-evo-border bg-evo-bgInset">
        <div className="relative mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-5 md:min-h-20 md:px-8">
          <Link
            to={user ? "/app" : "/"}
            className="flex shrink-0 items-center gap-3"
            aria-label="Ediv Finance, página inicial"
          >
            <img
              src="/ediv-logo-clean.png"
              alt=""
              aria-hidden="true"
              className="h-10 w-10 object-contain"
            />
            <span className="hidden font-semibold tracking-tight md:inline">
              Ediv Finance
            </span>
          </Link>
          <nav
            aria-label="Navegação principal"
            className="hidden items-center gap-2 lg:flex"
          >
            {links.map(({ to, label, Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `inline-flex min-h-11 items-center gap-2 px-3 text-sm font-medium ${isActive ? "text-evo-accent" : "text-evo-textSec hover:text-evo-textMain"}`
                }
              >
                <Icon size={16} aria-hidden="true" />
                {label}
              </NavLink>
            ))}
            {user ? (
              <Link to="/app" className="action">
                Minha conta
              </Link>
            ) : (
              <>
                <Link
                  to="/entrar"
                  className="inline-flex min-h-11 items-center px-3 text-sm text-evo-textSec"
                >
                  Entrar
                </Link>
                <Link to="/cadastro" className="action">
                  Criar conta <ArrowRight size={15} />
                </Link>
              </>
            )}
          </nav>
          <div className="flex items-center gap-2 lg:hidden">
            <Link
              to={user ? "/app" : "/cadastro"}
              className="inline-flex min-h-11 items-center gap-1 rounded-lg bg-evo-primary px-3 text-xs font-semibold text-white"
            >
              {user ? "Minha conta" : "Criar conta"}
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
            <button
              ref={menuButton}
              type="button"
              onClick={() => setMobileMenuOpen((value) => !value)}
              aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
              aria-expanded={mobileMenuOpen}
              aria-controls="public-mobile-menu"
              className="inline-flex h-11 w-11 items-center justify-center border border-evo-border text-evo-textSec"
            >
              {mobileMenuOpen ? (
                <X size={19} aria-hidden="true" />
              ) : (
                <Menu size={19} aria-hidden="true" />
              )}
            </button>
          </div>
          {mobileMenuOpen && (
            <nav
              id="public-mobile-menu"
              aria-label="Navegação móvel"
              className="absolute inset-x-4 top-[calc(100%-0.25rem)] z-50 grid gap-1 rounded-xl border border-evo-border bg-evo-card p-2 shadow-2xl lg:hidden"
            >
              {links.map(({ to, label, Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm ${isActive ? "bg-evo-accent/10 text-evo-accent" : "text-evo-textSec hover:text-evo-textMain"}`
                  }
                >
                  <Icon size={17} aria-hidden="true" />
                  {label}
                </NavLink>
              ))}
              {!user && (
                <Link
                  to="/entrar"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex min-h-11 items-center px-3 text-sm text-evo-textSec"
                >
                  Entrar
                </Link>
              )}
            </nav>
          )}
        </div>
      </header>
    </>
  );
}
export function SiteFooter({
  showRegistrationLink = true,
}: {
  showRegistrationLink?: boolean;
}) {
  const { user } = useAuth();

  return (
    <footer className="border-t border-evo-border bg-evo-bgInset">
      <div className="mx-auto max-w-7xl px-5 py-9 md:px-8 md:py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <Link
              to={user ? "/app" : "/"}
              className="inline-flex items-center gap-3"
              aria-label="Ediv Finance, página inicial"
            >
              <img
                src="/ediv-logo-clean.png"
                alt=""
                aria-hidden="true"
                className="h-9 w-9 object-contain"
              />
              <span className="font-semibold tracking-tight text-evo-textMain">
                Ediv Finance
              </span>
            </Link>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-evo-textSec">
              Educação financeira para entender previsões, avaliar riscos e
              conhecer as empresas e seus dividendos com clareza.
            </p>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-evo-textMain">
              Explorar
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-evo-textSec">
              <li>
                <Link
                  className="hover:text-evo-textMain"
                  to={user ? "/app" : "/"}
                >
                  Início
                </Link>
              </li>
              <li>
                <Link className="hover:text-evo-textMain" to="/mercado">
                  Análises de ações
                </Link>
              </li>
              <li>
                <Link className="hover:text-evo-textMain" to="/ranking">
                  Ranking
                </Link>
              </li>
              <li>
                <Link className="hover:text-evo-textMain" to="/aprender">
                  Aprender
                </Link>
              </li>
              <li>
                <Link className="hover:text-evo-textMain" to="/glossario">
                  Glossário
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-evo-textMain">
              Conta e transparência
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-evo-textSec">
              <li>
                <Link
                  className="hover:text-evo-textMain"
                  to={user ? "/app" : "/entrar"}
                >
                  {user ? "Acessar painel" : "Entrar"}
                </Link>
              </li>
              <li>
                <Link className="hover:text-evo-textMain" to="/metodologia">
                  Pesquisa e metodologia
                </Link>
              </li>
              <li>
                <Link className="hover:text-evo-textMain" to="/privacidade">
                  Privacidade e uso
                </Link>
              </li>
              <li>
                <Link className="hover:text-evo-textMain" to="/suporte">
                  Dúvidas e suporte
                </Link>
              </li>
              {!user && showRegistrationLink && (
                <li>
                  <Link className="hover:text-evo-textMain" to="/cadastro">
                    Criar conta
                  </Link>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-evo-border pt-5">
          <p className="text-sm text-evo-textSec">
            © {new Date().getFullYear()} Ediv Finance. · Versão beta
          </p>
        </div>
      </div>
    </footer>
  );
}

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-evo-bgMain text-evo-textMain">
      <SiteHeader />
      <main id="conteudo" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
