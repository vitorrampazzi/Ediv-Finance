import { Tooltip } from "../components/Tooltip";
import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
} from "framer-motion";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  LogOut,
  TrendingUp,
  CircleUserRound,
  Headset,
  Settings,
  ShieldCheck,
  House,
} from "lucide-react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useAuth } from "../context/authContext";
import { roleLabels, userCan } from "../lib/permissions";
import { NotificationsMenu } from "../components/NotificationsMenu";
import { ThemeToggle } from "../components/ThemeToggle";
import { AccountOnboarding } from "../components/AccountOnboarding";
import { requestOnboardingReplay } from "../lib/onboarding";
import { openPrivacyPreferences } from "../lib/analytics";
import { PageContent } from "../components/PageContent";
import "../components/navigation-chrome.css";

const navigation = [
  {
    to: "/app",
    label: "Início",
    shortLabel: "Início",
    icon: House,
    end: true,
    tour: "inicio",
  },
  {
    to: "/app/ranking",
    label: "Ranking de previsões",
    shortLabel: "Ranking",
    icon: TrendingUp,
    end: false,
    tour: "ranking",
  },
  {
    to: "/app/aprender",
    label: "Escola de dividendos",
    shortLabel: "Aprender",
    icon: BookOpen,
    end: false,
    tour: "aprender",
  },
];

const pageTitles: Record<string, string> = {
  "/app": "Início",
  "/app/ranking": "Ranking de previsões",
  "/app/aprender": "Aprender",
  "/app/conversas": "Dúvidas e suporte",
  "/app/atendimentos": "Atendimentos",
  "/app/assessoria": "Assessoria",
  "/app/perfil": "Meu perfil",
  "/app/config": "Configurações",
  "/app/admin": "Administração",
};

const navigationGroups = [
  {
    label: "Pesquisa e educação",
    items: navigation,
  },
];

function NavigationLink({
  to,
  label,
  icon: Icon,
  end = false,
  collapsed = false,
  tour,
}: {
  to: string;
  label: string;
  icon: typeof TrendingUp;
  end?: boolean;
  collapsed?: boolean;
  tour?: string;
}) {
  const reducedMotion = useReducedMotion();
  return (
    <Tooltip content={collapsed ? label : ""}>
      <NavLink
        to={to}
        data-tour={tour}
        end={end}
        aria-label={collapsed ? label : undefined}
        className={({ isActive }) =>
          `ediv-sidebar-link relative flex min-h-11 items-center gap-3 px-3 py-2.5 text-sm ${collapsed ? "justify-center" : ""} ${isActive ? "is-current" : ""}`
        }
      >
        {({ isActive }) => (
          <>
            {isActive && (
              <motion.span
                aria-hidden="true"
                className="ediv-sidebar-indicator"
                layoutId="sidebar-selection"
                transition={{
                  type: "spring",
                  bounce: 0,
                  duration: reducedMotion ? 0 : 0.32,
                }}
              />
            )}
            <Icon size={18} strokeWidth={1.7} aria-hidden="true" />
            {!collapsed && <span className="font-medium">{label}</span>}
          </>
        )}
      </NavLink>
    </Tooltip>
  );
}

function ProfileMenu({
  name,
  email,
  onLogout,
  onRestart,
}: {
  name: string;
  email: string;
  onLogout: () => Promise<void>;
  onRestart: () => void;
}) {
  const { key: routeKey } = useLocation();
  const [menuRoute, setMenuRoute] = useState<string | null>(null);
  const open = menuRoute === routeKey;
  const [logoutError, setLogoutError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const { user } = useAuth();
  const ref = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const reducedMotion = useReducedMotion();
  const navigate = useNavigate();
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("pt-BR");

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: PointerEvent | FocusEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node))
        setMenuRoute(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuRoute(null);
        trigger.current?.focus();
      }
    };
    const closeOnBack = () => setMenuRoute(null);
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("focusin", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("popstate", closeOnBack);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("focusin", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("popstate", closeOnBack);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <Tooltip
        content={`${initials ? initials + " · " : ""}${open ? "Fechar" : "Abrir"} menu da conta de ${name}`}
      >
        <button
          ref={trigger}
          data-tour="conta"
          type="button"
          onClick={() => setMenuRoute(open ? null : routeKey)}
          aria-label={`${open ? "Fechar" : "Abrir"} menu da conta de ${name}${initials ? " · " + initials : ""}`}
          aria-expanded={open}
          aria-controls="demo-profile-links"
          className="ediv-chrome-icon ediv-account-avatar flex h-11 w-11 items-center justify-center rounded-full"
        >
          <span aria-hidden="true" className="text-xs font-bold">
            {initials || <CircleUserRound size={20} />}
          </span>
        </button>
      </Tooltip>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id="demo-profile-links"
            initial={{
              opacity: 0,
              y: reducedMotion ? 0 : -5,
              scale: reducedMotion ? 1 : 0.97,
            }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{
              opacity: 0,
              y: reducedMotion ? 0 : -5,
              scale: reducedMotion ? 1 : 0.97,
            }}
            transition={{
              type: "spring",
              bounce: 0,
              duration: reducedMotion ? 0.12 : 0.25,
            }}
            className="ediv-chrome-popover ediv-profile-popover absolute right-0 z-50 mt-3 w-72 overflow-y-auto"
          >
            <div className="border-b border-evo-border p-4">
              <p className="text-sm font-semibold text-evo-textMain">{name}</p>
              <p className="mt-1 break-all text-xs text-evo-textSec">{email}</p>
              <p className="mt-2 text-xs text-evo-accent">
                {user && roleLabels[user.role]}
              </p>
            </div>
            <div className="p-2">
              {userCan(user, "users:read") && (
                <Link
                  to="/app/admin"
                  onClick={() => setMenuRoute(null)}
                  className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-evo-accent"
                >
                  <ShieldCheck size={16} /> Administração
                </Link>
              )}
              {userCan(user, "rankings:write") && (
                <Link
                  to="/app/ranking"
                  onClick={() => setMenuRoute(null)}
                  className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-evo-accent"
                >
                  <TrendingUp size={16} /> Publicar pesquisa
                </Link>
              )}
              <Link
                to="/app/perfil"
                onClick={() => setMenuRoute(null)}
                className="flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm text-evo-textSec hover:bg-white/[0.04] hover:text-evo-textMain"
              >
                <CircleUserRound size={16} aria-hidden="true" /> Perfil
              </Link>
              <Link
                to={
                  userCan(user, "support:manage")
                    ? "/app/atendimentos"
                    : "/app/conversas"
                }
                onClick={() => setMenuRoute(null)}
                className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-evo-textSec"
              >
                <Headset size={16} />{" "}
                {userCan(user, "support:manage") ? "Atendimentos" : "Conversas"}
              </Link>
              <Link
                to="/app"
                onClick={() => setMenuRoute(null)}
                className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-evo-textSec"
              >
                Início da Escola do Dividendo
              </Link>
              <Link
                to="/app/config"
                onClick={() => setMenuRoute(null)}
                className="flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm text-evo-textSec hover:bg-white/[0.04] hover:text-evo-textMain"
              >
                <Settings size={16} aria-hidden="true" /> Configurações
              </Link>
              {logoutError && (
                <p role="alert" className="px-3 py-2 text-xs text-evo-red">
                  {logoutError}
                </p>
              )}
              <button
                type="button"
                className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm text-evo-textSec hover:bg-evo-bgSec"
                onClick={() => {
                  setMenuRoute(null);
                  onRestart();
                }}
              >
                <BookOpen size={16} aria-hidden="true" /> Rever introdução
              </button>
              <button
                type="button"
                disabled={loggingOut}
                onClick={async () => {
                  if (loggingOut) return;
                  setLogoutError("");
                  setLoggingOut(true);
                  try {
                    await onLogout();
                    navigate("/entrar", { replace: true });
                  } catch {
                    setLogoutError(
                      "Não foi possível encerrar a sessão. Verifique sua conexão e tente novamente.",
                    );
                    setLoggingOut(false);
                  }
                }}
                className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-sm text-evo-red hover:bg-evo-red/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-evo-red disabled:cursor-wait disabled:opacity-60"
              >
                <LogOut size={16} aria-hidden="true" />
                {loggingOut ? "Saindo…" : "Sair da conta"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const DashboardLayout = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const title = location.pathname.startsWith("/app/ranking/acao/")
    ? "Caderno da empresa"
    : (pageTitles[location.pathname] ?? "");

  return (
    <div className="account-workspace flex min-h-screen bg-evo-bgMain font-sans text-evo-textMain">
      <nav aria-label="Atalho para o conteúdo">
        <a
          href="#conteudo"
          className="sr-only z-50 rounded bg-evo-primary px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Pular para o conteúdo
        </a>
      </nav>
      <aside
        className={`ediv-account-sidebar hidden shrink-0 transition-[width] duration-200 motion-reduce:transition-none lg:sticky lg:top-0 lg:flex lg:h-screen lg:min-h-0 lg:flex-col ${collapsed ? "w-20" : "w-60"}`}
      >
        <div className="flex min-h-20 shrink-0 items-center justify-center px-3">
          <Tooltip
            content={
              collapsed ? "Expandir menu lateral" : "Recolher menu lateral"
            }
          >
            <button
              type="button"
              onClick={() => setCollapsed((value) => !value)}
              aria-label={
                collapsed ? "Expandir menu lateral" : "Recolher menu lateral"
              }
              aria-expanded={!collapsed}
              aria-controls="account-sidebar-navigation"
              className="ediv-sidebar-logo ediv-chrome-icon group relative flex h-14 w-14 items-center justify-center rounded-xl"
            >
              <img
                src="/ediv-logo-clean.png"
                alt=""
                aria-hidden="true"
                className="h-10 w-10 object-contain"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -right-1 bottom-0 flex size-6 items-center justify-center rounded-full border border-evo-border bg-evo-bgInset text-evo-accent opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none [@media(hover:none)]:opacity-100"
              >
                {collapsed ? (
                  <ChevronRight size={15} />
                ) : (
                  <ChevronLeft size={15} />
                )}
              </span>
            </button>
          </Tooltip>
        </div>
        <div
          aria-hidden="true"
          className="mx-4 mb-4 shrink-0 border-b border-evo-border/50"
        />
        <nav
          id="account-sidebar-navigation"
          aria-label="Navegação principal"
          className="min-h-0 flex-1 space-y-7 overflow-y-auto px-4 pb-5"
        >
          <LayoutGroup id="account-sidebar">
            {navigationGroups.map((group) => (
              <div key={group.label} className="space-y-1">
                {!collapsed && (
                  <p className="ediv-navigation-caption mb-3 px-3 text-xs font-medium">
                    {group.label}
                  </p>
                )}
                {group.items.map((item) => (
                  <NavigationLink
                    key={item.to}
                    {...item}
                    collapsed={collapsed}
                  />
                ))}
              </div>
            ))}
            {(userCan(user, "users:read") ||
              userCan(user, "support:manage")) && (
              <div className="ediv-navigation-management space-y-1 pt-4">
                {!collapsed && (
                  <p className="ediv-navigation-caption mb-3 px-3 text-xs font-medium">
                    Gestão
                  </p>
                )}
                {userCan(user, "users:read") && (
                  <NavigationLink
                    to="/app/admin"
                    label="Administração"
                    icon={ShieldCheck}
                    collapsed={collapsed}
                  />
                )}
                {userCan(user, "support:manage") && (
                  <NavigationLink
                    to="/app/atendimentos"
                    label="Atendimentos"
                    icon={Headset}
                    collapsed={collapsed}
                  />
                )}
              </div>
            )}
          </LayoutGroup>
        </nav>
        <div className="shrink-0 border-t border-evo-border/70 p-4">
          <Tooltip content={collapsed ? "Dúvidas e suporte" : ""}>
            <NavLink
              to="/app/conversas"
              aria-label={collapsed ? "Dúvidas e suporte" : undefined}
              className={({ isActive }) =>
                `ediv-sidebar-link flex min-h-11 items-center gap-3 px-3 text-sm ${collapsed ? "justify-center" : ""} ${isActive ? "is-current" : ""}`
              }
            >
              <Headset size={18} strokeWidth={1.6} aria-hidden="true" />
              {!collapsed && <span>Dúvidas e suporte</span>}
            </NavLink>
          </Tooltip>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="ediv-account-header sticky top-0 z-20 flex min-h-16 items-center justify-between gap-2 px-4 pt-[env(safe-area-inset-top)] md:min-h-20 md:gap-3 md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src="/ediv-logo-clean.png"
              alt=""
              aria-hidden="true"
              className="h-8 w-8 shrink-0 object-contain lg:hidden"
            />
            {title && (
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-evo-textMain md:text-base">
                  {title}
                </p>
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2 md:gap-4">
            <span data-tour="tema" className="inline-flex">
              <ThemeToggle />
            </span>
            <Tooltip content="Dúvidas e suporte">
              <Link
                to="/app/conversas"
                data-tour="suporte"
                aria-label="Dúvidas e suporte"
                className="ediv-chrome-icon inline-flex min-h-11 min-w-11 items-center justify-center"
              >
                <Headset size={20} />
              </Link>
            </Tooltip>
            <NotificationsMenu key={user?.id} />
            {user && (
              <ProfileMenu
                name={user.name}
                email={user.email}
                onLogout={logout}
                onRestart={requestOnboardingReplay}
              />
            )}
          </div>
        </header>

        <main
          id="conteudo"
          tabIndex={-1}
          className="w-full min-w-0 flex-1 px-4 pt-4 pb-[calc(5rem+env(safe-area-inset-bottom))] md:px-8 md:pt-10 lg:pb-8"
        >
          <PageContent key={user?.id}>
            <Outlet />
          </PageContent>
          <footer className="ediv-account-footer mx-auto mt-10 max-w-7xl p-5 text-sm leading-relaxed text-evo-textSec">
            Escola do Dividendo · Ações e dividendos.{" "}
            <Link to="/privacidade" className="ml-2 underline">
              Privacidade
            </Link>{" "}
            <Link to="/app/conversas" className="ml-2 underline">
              Contato
            </Link>
            <button
              type="button"
              className="ml-2 min-h-11 underline"
              onClick={openPrivacyPreferences}
            >
              Preferências de cookies
            </button>
          </footer>
        </main>
      </div>

      <MobileNavigation />
      <AccountOnboarding />
    </div>
  );
};

function MobileNavigation() {
  const reducedMotion = useReducedMotion();
  return (
    <LayoutGroup id="account-mobile">
      <nav
        aria-label="Navegação móvel"
        className="ediv-mobile-navigation fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 px-1 pb-[env(safe-area-inset-bottom)] pt-1 lg:hidden"
      >
        {navigation.map(({ to, shortLabel, icon: Icon, end, tour }) => (
          <NavLink
            key={to}
            to={to}
            data-tour={tour}
            end={end}
            className={({ isActive }) =>
              `ediv-mobile-navigation-link flex min-h-14 flex-col items-center justify-center gap-1 text-xs font-medium ${isActive ? "is-current" : ""}`
            }
          >
            {({ isActive }) => (
              <>
                <span className="ediv-mobile-navigation-icon">
                  {isActive && (
                    <motion.span
                      aria-hidden="true"
                      className="ediv-mobile-selection"
                      layoutId="mobile-selection"
                      transition={{
                        type: "spring",
                        bounce: 0,
                        duration: reducedMotion ? 0 : 0.3,
                      }}
                    />
                  )}
                  <Icon
                    size={20}
                    strokeWidth={isActive ? 1.9 : 1.6}
                    aria-hidden="true"
                  />
                </span>
                <span>{shortLabel}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </LayoutGroup>
  );
}
