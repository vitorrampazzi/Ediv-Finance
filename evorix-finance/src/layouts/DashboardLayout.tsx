import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  LogOut,
  TrendingUp,
  CircleUserRound,
  Headset,
  Settings,
  ShieldCheck,
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

const navigation = [
  {
    to: "/app/ranking",
    label: "Ranking de previsões",
    shortLabel: "Ranking",
    icon: TrendingUp,
    end: false,
  },
  {
    to: "/app/analises",
    label: "Análises",
    shortLabel: "Análises",
    icon: BarChart3,
    end: false,
  },
  {
    to: "/app/aprender",
    label: "Escola de dividendos",
    shortLabel: "Aprender",
    icon: BookOpen,
    end: false,
  },
];

const pageTitles: Record<string, string> = {
  "/app": "Ranking de previsões",
  "/app/analises": "Análises",
  "/app/ranking": "Ranking de previsões",
  "/app/aprender": "Aprender",
  "/app/conversas": "Conversas",
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
}: {
  to: string;
  label: string;
  icon: typeof TrendingUp;
  end?: boolean;
  collapsed?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      title={collapsed ? label : undefined}
      aria-label={collapsed ? label : undefined}
      className={({ isActive }) =>
        `relative flex min-h-11 items-center gap-3 border-l-2 px-3 py-2.5 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-evo-accent ${collapsed ? "justify-center" : ""} ${isActive ? "border-evo-green bg-white/[0.03] text-evo-textMain" : "border-transparent text-evo-textSec hover:bg-white/[0.03] hover:text-evo-textMain"}`
      }
    >
      <Icon size={18} strokeWidth={1.6} aria-hidden="true" />
      {!collapsed && <span className="font-medium">{label}</span>}
    </NavLink>
  );
}

function ProfileMenu({
  name,
  email,
  onLogout,
}: {
  name: string;
  email: string;
  onLogout: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const { user } = useAuth();
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("pt-BR");

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node))
        setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={`Abrir menu da conta de ${name}`}
        aria-expanded={open}
        aria-controls="demo-profile-links"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-evo-border bg-evo-card text-evo-textSec transition hover:border-evo-accent hover:text-evo-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-evo-accent"
      >
        <span aria-hidden="true" className="text-xs font-bold">
          {initials || <CircleUserRound size={20} />}
        </span>
      </button>
      {open && (
        <div
          id="demo-profile-links"
          className="absolute right-0 z-50 mt-3 w-60 overflow-hidden rounded-xl border border-evo-border bg-evo-card shadow-2xl"
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
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-evo-accent"
              >
                <ShieldCheck size={16} /> Administração
              </Link>
            )}
            {userCan(user, "rankings:write") && (
              <Link
                to="/app/ranking"
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-evo-accent"
              >
                <TrendingUp size={16} /> Publicar pesquisa
              </Link>
            )}
            <Link
              to="/app/perfil"
              onClick={() => setOpen(false)}
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
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-evo-textSec"
            >
              <Headset size={16} />{" "}
              {userCan(user, "support:manage") ? "Atendimentos" : "Conversas"}
            </Link>
            <Link
              to="/aprender"
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-evo-textSec"
            >
              Sobre a escola
            </Link>
            <Link
              to="/app/config"
              onClick={() => setOpen(false)}
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
              onClick={async () => {
                setLogoutError("");
                try {
                  await onLogout();
                  navigate("/entrar", { replace: true });
                } catch {
                  setLogoutError(
                    "Não foi possível encerrar a sessão. Verifique sua conexão e tente novamente.",
                  );
                }
              }}
              className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-sm text-evo-red hover:bg-evo-red/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-evo-red"
            >
              <LogOut size={16} aria-hidden="true" /> Sair da conta
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export const DashboardLayout = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const title = location.pathname.startsWith("/app/ranking/acao/")
    ? "Caderno da empresa"
    : (pageTitles[location.pathname] ?? "Ediv Finance");

  return (
    <div className="account-workspace flex min-h-screen bg-evo-bgMain font-sans text-evo-textMain">
      <a
        href="#conteudo"
        className="sr-only z-50 rounded bg-evo-primary px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Pular para o conteúdo
      </a>
      <aside
        className={`hidden shrink-0 border-r border-evo-border/70 bg-evo-bgMain transition-[width] duration-200 motion-reduce:transition-none lg:sticky lg:top-0 lg:flex lg:h-screen lg:min-h-0 lg:flex-col ${collapsed ? "w-20" : "w-60"}`}
      >
        <Link
          to="/app/ranking"
          aria-label="Ediv Finance, ranking de previsões"
          className={`flex min-h-24 items-center px-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-evo-accent ${collapsed ? "justify-center" : ""}`}
        >
          <img
            src="/ediv-logo.png"
            alt=""
            aria-hidden="true"
            className="h-10 w-10 shrink-0 object-contain mix-blend-screen"
          />
          {!collapsed && (
            <span className="ml-3 text-base font-semibold tracking-tight">
              Ediv Finance
            </span>
          )}
        </Link>
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          aria-label={collapsed ? "Expandir navegação" : "Recolher navegação"}
          className="mx-4 mb-5 flex min-h-10 items-center justify-center gap-2 border-y border-evo-border/60 text-xs text-evo-textSec transition hover:bg-white/[0.03] hover:text-evo-textMain focus-visible:outline focus-visible:outline-2 focus-visible:outline-evo-accent"
        >
          {collapsed ? (
            <ChevronRight size={16} aria-hidden="true" />
          ) : (
            <>
              <ChevronLeft size={16} aria-hidden="true" /> Recolher
            </>
          )}
        </button>
        <nav
          aria-label="Navegação principal"
          className="min-h-0 flex-1 space-y-7 overflow-y-auto px-4 pb-5"
        >
          {navigationGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              {!collapsed && (
                <p className="mb-3 px-3 text-[10px] font-medium uppercase tracking-[.14em] text-evo-textSec">
                  {group.label}
                </p>
              )}
              {group.items.map((item) => (
                <NavigationLink key={item.to} {...item} collapsed={collapsed} />
              ))}
            </div>
          ))}
          {(userCan(user, "users:read") || userCan(user, "support:manage")) && (
            <div className="space-y-1 border-t border-evo-border/60 pt-4">
              {!collapsed && (
                <p className="mb-3 px-3 text-[10px] font-medium uppercase tracking-[.14em] text-evo-textSec">
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
        </nav>
        <div className="shrink-0 border-t border-evo-border/70 p-4">
          <NavLink
            to="/app/conversas"
            title={collapsed ? "Dúvidas e suporte" : undefined}
            aria-label={collapsed ? "Dúvidas e suporte" : undefined}
            className={({ isActive }) =>
              `flex min-h-11 items-center gap-3 border-l-2 px-3 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-evo-accent ${collapsed ? "justify-center" : ""} ${isActive ? "border-evo-green text-evo-textMain" : "border-transparent text-evo-textSec hover:bg-white/[0.03] hover:text-evo-textMain"}`
            }
          >
            <Headset size={18} strokeWidth={1.6} aria-hidden="true" />
            {!collapsed && <span>Dúvidas e suporte</span>}
          </NavLink>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-3 border-b border-evo-border/70 bg-evo-bgMain/95 px-4 backdrop-blur md:min-h-20 md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src="/ediv-logo.png"
              alt=""
              aria-hidden="true"
              className="h-8 w-8 shrink-0 object-contain mix-blend-screen lg:hidden"
            />
            <div className="min-w-0">
              <p className="hidden text-[10px] uppercase tracking-[.16em] text-evo-textSec sm:block">
                Seu espaço Ediv
              </p>
              <p className="truncate text-sm font-medium text-evo-textMain sm:mt-1 md:text-base">
                {title}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 md:gap-4">
            <Link
              to="/app/conversas"
              aria-label="Dúvidas e suporte"
              className="inline-flex min-h-11 min-w-11 items-center justify-center text-evo-textSec transition hover:text-evo-textMain focus-visible:outline focus-visible:outline-2 focus-visible:outline-evo-accent"
            >
              <Headset size={20} />
            </Link>
            <NotificationsMenu key={user?.id} />
            {user && (
              <ProfileMenu
                name={user.name}
                email={user.email}
                onLogout={logout}
              />
            )}
          </div>
        </header>

        <main
          id="conteudo"
          className="w-full flex-1 px-4 pt-6 pb-24 md:px-8 md:pt-10 lg:pb-8"
        >
          <Outlet />
          <footer className="mx-auto mt-10 max-w-7xl border-t border-evo-border pt-4 text-xs leading-relaxed text-evo-textSec">
            Pesquisa e educação sobre ações e dividendos. Previsões dependem de
            premissas e não garantem retorno.{" "}
            <Link to="/privacidade" className="ml-2 underline">
              Privacidade
            </Link>{" "}
            <Link to="/app/conversas" className="ml-2 underline">
              Contato
            </Link>
          </footer>
        </main>
      </div>

      <nav
        aria-label="Navegação móvel"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-evo-border bg-evo-bgMain/95 px-1 pb-[env(safe-area-inset-bottom)] pt-1 backdrop-blur lg:hidden"
      >
        {navigation.map(({ to, shortLabel, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex min-h-14 flex-col items-center justify-center gap-1 border-t-2 text-[10px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-evo-accent ${isActive ? "border-evo-green text-evo-textMain" : "border-transparent text-evo-textSec"}`
            }
          >
            <Icon size={19} strokeWidth={1.6} aria-hidden="true" />
            <span>{shortLabel}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};
