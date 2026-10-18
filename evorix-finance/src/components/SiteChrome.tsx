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
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/authContext";
import { PageContent } from "./PageContent";
import { ThemeToggle } from "./ThemeToggle";
import { openPrivacyPreferences } from "../lib/analytics";
import "./navigation-chrome.css";

export function SiteHeader({
  showRegistrationAction = true,
}: {
  showRegistrationAction?: boolean;
}) {
  const { user } = useAuth();
  const { key: routeKey } = useLocation();
  const [menuRoute, setMenuRoute] = useState<string | null>(null);
  const mobileMenuOpen = menuRoute === routeKey;
  const menuButton = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();
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
    if (!mobileMenuOpen) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuRoute(null);
        menuButton.current?.focus();
      }
    };
    const closeOnOutside = (event: PointerEvent | FocusEvent) => {
      if (!headerRef.current?.contains(event.target as Node))
        setMenuRoute(null);
    };
    const closeOnBack = () => setMenuRoute(null);
    document.addEventListener("keydown", close);
    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("focusin", closeOnOutside);
    window.addEventListener("popstate", closeOnBack);
    return () => {
      document.removeEventListener("keydown", close);
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("focusin", closeOnOutside);
      window.removeEventListener("popstate", closeOnBack);
    };
  }, [mobileMenuOpen]);
  return (
    <>
      <a
        href="#conteudo"
        className="sr-only z-50 rounded bg-evo-primary px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Pular para o conteúdo
      </a>
      <header
        ref={headerRef}
        className="ediv-site-header sticky top-0 z-40 pt-[env(safe-area-inset-top)]"
      >
        <div className="relative mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-5 md:min-h-20 md:px-8">
          <Link
            to={user ? "/app" : "/"}
            className="ediv-brand-link flex shrink-0 items-center gap-3"
            aria-label="Escola do Dividendo, página inicial"
          >
            <img
              src="/ediv-logo-clean.png"
              alt=""
              aria-hidden="true"
              className="h-10 w-10 object-contain"
            />
            <span className="hidden font-semibold tracking-tight md:inline">
              Escola do Dividendo
            </span>
          </Link>
          <nav
            aria-label="Navegação principal"
            className="ediv-public-links hidden items-center gap-2 lg:flex"
          >
            {links.map(({ to, label, Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `ediv-chrome-link inline-flex min-h-11 items-center gap-2 px-3 text-sm font-medium ${isActive ? "is-current" : ""}`
                }
              >
                <Icon size={16} aria-hidden="true" />
                {label}
              </NavLink>
            ))}
            {user ? (
              <Link to="/app" className="action ediv-chrome-primary">
                Minha conta
              </Link>
            ) : (
              <>
                <Link
                  to="/entrar"
                  className="ediv-chrome-link inline-flex min-h-11 items-center px-3 text-sm"
                >
                  Entrar
                </Link>
                {showRegistrationAction && (
                  <Link to="/cadastro" className="action ediv-chrome-primary">
                    Criar conta <ArrowRight size={15} />
                  </Link>
                )}
              </>
            )}
          </nav>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <div className="flex items-center gap-1 sm:gap-2 lg:hidden">
              <Link
                to={
                  user
                    ? "/app"
                    : showRegistrationAction
                      ? "/cadastro"
                      : "/entrar"
                }
                className={`ediv-chrome-link inline-flex min-h-11 items-center gap-1 rounded-lg px-3 text-sm font-semibold ${user || showRegistrationAction ? "ediv-chrome-primary" : ""}`}
              >
                {user
                  ? "Minha conta"
                  : showRegistrationAction
                    ? "Criar conta"
                    : "Entrar"}
                {(user || showRegistrationAction) && (
                  <ArrowRight size={14} aria-hidden="true" />
                )}
              </Link>
              <button
                ref={menuButton}
                type="button"
                onClick={() => setMenuRoute(mobileMenuOpen ? null : routeKey)}
                aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
                aria-expanded={mobileMenuOpen}
                aria-controls="public-mobile-menu"
                className="ediv-chrome-icon inline-flex h-11 w-11 items-center justify-center"
              >
                {mobileMenuOpen ? (
                  <X size={19} aria-hidden="true" />
                ) : (
                  <Menu size={19} aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
          <AnimatePresence initial={false}>
            {mobileMenuOpen && (
              <motion.nav
                id="public-mobile-menu"
                aria-label="Navegação móvel"
                initial={{
                  opacity: 0,
                  y: reducedMotion ? 0 : -6,
                  scale: reducedMotion ? 1 : 0.985,
                }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{
                  opacity: 0,
                  y: reducedMotion ? 0 : -6,
                  scale: reducedMotion ? 1 : 0.985,
                }}
                transition={{
                  type: "spring",
                  bounce: 0,
                  duration: reducedMotion ? 0.12 : 0.25,
                }}
                className="ediv-chrome-popover ediv-public-menu absolute inset-x-4 top-[calc(100%-0.25rem)] z-50 grid gap-1 p-2 lg:hidden"
              >
                {links.map(({ to, label, Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setMenuRoute(null)}
                    className={({ isActive }) =>
                      `ediv-chrome-link flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm ${isActive ? "is-current" : ""}`
                    }
                  >
                    <Icon size={17} aria-hidden="true" />
                    {label}
                  </NavLink>
                ))}
                {!user && (
                  <Link
                    to="/entrar"
                    onClick={() => setMenuRoute(null)}
                    className="ediv-chrome-link flex min-h-11 items-center px-3 text-sm"
                  >
                    Entrar
                  </Link>
                )}
              </motion.nav>
            )}
          </AnimatePresence>
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
    <footer className="site-footer ediv-site-footer">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-5 md:px-8 md:py-12">
        <div className="grid grid-cols-2 gap-x-5 gap-y-5 sm:gap-8 lg:grid-cols-[1.5fr_1fr_1fr]">
          <div className="col-span-2 lg:col-span-1">
            <Link
              to={user ? "/app" : "/"}
              className="inline-flex items-center gap-3"
              aria-label="Escola do Dividendo, página inicial"
            >
              <img
                src="/ediv-logo-clean.png"
                alt=""
                aria-hidden="true"
                className="h-9 w-9 object-contain"
              />
              <span className="font-semibold tracking-tight text-evo-textMain">
                Escola do Dividendo
              </span>
            </Link>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-evo-textSec">
              Pesquisa de ações e educação sobre dividendos.
            </p>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-evo-textMain">
              Explorar
            </h2>
            <ul className="mt-2 text-sm text-evo-textSec sm:mt-3 sm:space-y-2">
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
              Conta e ajuda
            </h2>
            <ul className="mt-2 text-sm text-evo-textSec sm:mt-3 sm:space-y-2">
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
                <button
                  type="button"
                  className="min-h-11 text-left hover:text-evo-textMain"
                  onClick={openPrivacyPreferences}
                >
                  Preferências de cookies
                </button>
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
            © {new Date().getFullYear()} Escola do Dividendo. · Versão beta
          </p>
        </div>
      </div>
    </footer>
  );
}

export function PublicLayout({ children }: { children?: ReactNode }) {
  const { pathname } = useLocation();
  const isHome = pathname === "/";
  return (
    <div className="flex min-h-screen flex-col bg-evo-bgMain text-evo-textMain">
      <SiteHeader showRegistrationAction={!isHome} />
      <main id="conteudo" className="min-w-0 flex-1">
        <PageContent>{children ?? <Outlet />}</PageContent>
      </main>
      <SiteFooter showRegistrationLink={!isHome} />
    </div>
  );
}
