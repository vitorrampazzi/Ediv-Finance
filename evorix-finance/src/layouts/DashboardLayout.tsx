import { useEffect, useRef, useState } from 'react';
import {
  Activity, BarChart3, Bell, Briefcase, ChevronLeft, ChevronRight, LogOut, TrendingUp,
  CircleUserRound, Headset, LayoutDashboard, Settings, ShieldAlert, Star,
} from 'lucide-react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext';

const navigation = [
  { to: '/app', label: 'Visão geral', shortLabel: 'Início', icon: LayoutDashboard, end: true },
  { to: '/app/analises', label: 'Análises', shortLabel: 'Análises', icon: BarChart3, end: false },
  { to: '/app/ranking', label: 'Renda', shortLabel: 'Renda', icon: TrendingUp, end: false },
  { to: '/app/carteira', label: 'Minha carteira', shortLabel: 'Carteira', icon: Briefcase, end: false },
  { to: '/app/favoritos', label: 'Favoritos', shortLabel: 'Favoritos', icon: Star, end: false },
];

const pageTitles: Record<string, string> = {
  '/app': 'Visão geral', '/app/analises': 'Análises', '/app/ranking': 'Renda', '/app/carteira': 'Minha carteira',
  '/app/favoritos': 'Favoritos', '/app/assessoria': 'Assessoria', '/app/perfil': 'Meu perfil',
  '/app/config': 'Configurações',
};

function NavigationLink({ to, label, icon: Icon, end = false, collapsed = false }: {
  to: string; label: string; icon: typeof LayoutDashboard; end?: boolean; collapsed?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      title={collapsed ? label : undefined}
      className={({ isActive }) => `flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-evo-blueMain ${collapsed ? 'justify-center' : ''} ${isActive ? 'border border-evo-blueMain/20 bg-evo-blueMain/10 text-evo-blueMain' : 'text-evo-textSec hover:bg-evo-card hover:text-evo-textMain'}`}
    >
      <Icon size={20} aria-hidden="true" />
      {!collapsed && <span className="font-medium">{label}</span>}
    </NavLink>
  );
}

const demoNotifications = [
  { id: 1, title: 'Exemplo: variação de ativo', description: 'Este aviso é ilustrativo; não acompanha cotações.', time: 'Demonstração', icon: Activity },
  { id: 2, title: 'Exemplo: concentração de carteira', description: 'Os dados exibidos não representam uma carteira real.', time: 'Demonstração', icon: ShieldAlert },
];

function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        aria-label="Avisos de demonstração"
        aria-expanded={open}
        aria-controls="demo-notifications"
        className="relative rounded-lg p-2 text-evo-textSec transition hover:bg-evo-card hover:text-evo-textMain focus-visible:outline focus-visible:outline-2 focus-visible:outline-evo-blueMain"
      >
        <Bell size={20} aria-hidden="true" />
        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-evo-blueMain" aria-hidden="true" />
      </button>
      {open && (
        <section id="demo-notifications" aria-label="Avisos de demonstração" className="absolute right-0 z-50 mt-3 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-evo-border bg-evo-card shadow-2xl">
          <div className="border-b border-evo-border p-4">
            <h2 className="text-sm font-semibold text-evo-textMain">Avisos de exemplo</h2>
            <p className="mt-1 text-xs text-evo-textSec">Não são alertas de mercado em tempo real.</p>
          </div>
          <ul className="divide-y divide-evo-border">
            {demoNotifications.map(({ id, title, description, time, icon: Icon }) => (
              <li key={id} className="flex gap-3 p-4">
                <Icon size={17} className="mt-0.5 shrink-0 text-evo-blueMain" aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium text-evo-textMain">{title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-evo-textSec">{description}</p>
                  <span className="mt-2 block text-[10px] text-evo-textSec">{time}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ProfileMenu({ name, email, onLogout }: { name: string; email: string; onLogout: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const initials = name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toLocaleUpperCase('pt-BR');

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        aria-label={`Abrir menu da conta de ${name}`}
        aria-expanded={open}
        aria-controls="demo-profile-links"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-evo-border bg-evo-card text-evo-textSec transition hover:border-evo-blueMain hover:text-evo-blueMain focus-visible:outline focus-visible:outline-2 focus-visible:outline-evo-blueMain"
      >
        <span aria-hidden="true" className="text-xs font-bold">{initials || <CircleUserRound size={20} />}</span>
      </button>
      {open && (
        <div id="demo-profile-links" className="absolute right-0 z-50 mt-3 w-60 overflow-hidden rounded-xl border border-evo-border bg-evo-card shadow-2xl">
          <div className="border-b border-evo-border p-4">
            <p className="text-sm font-semibold text-evo-textMain">{name}</p>
            <p className="mt-1 break-all text-xs text-evo-textSec">{email}</p>
          </div>
          <div className="p-2">
            <Link to="/app/perfil" onClick={() => setOpen(false)} className="flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm text-evo-textSec hover:bg-white/[0.04] hover:text-evo-textMain"><CircleUserRound size={16} aria-hidden="true" /> Perfil</Link>
            <Link to="/app/config" onClick={() => setOpen(false)} className="flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm text-evo-textSec hover:bg-white/[0.04] hover:text-evo-textMain"><Settings size={16} aria-hidden="true" /> Configurações</Link>
            {logoutError && <p role="alert" className="px-3 py-2 text-xs text-evo-red">{logoutError}</p>}
            <button type="button" onClick={async () => {
              setLogoutError('');
              try { await onLogout(); navigate('/entrar', { replace: true }); }
              catch { setLogoutError('Não foi possível encerrar a sessão. Verifique sua conexão e tente novamente.'); }
            }} className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-sm text-evo-red hover:bg-evo-red/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-evo-red">
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
  const title = pageTitles[location.pathname] ?? 'Ediv Finance';

  return (
    <div className="flex min-h-screen bg-evo-bgMain font-sans text-evo-textMain">
      <a href="#conteudo" className="sr-only z-50 rounded bg-evo-blueMain px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Pular para o conteúdo</a>
      <aside className={`hidden shrink-0 border-r border-evo-border bg-evo-bgSec transition-[width] duration-200 lg:sticky lg:top-0 lg:flex lg:h-screen lg:min-h-0 lg:flex-col ${collapsed ? 'w-20' : 'w-64'}`}>
        <Link to="/app" aria-label="Ediv Finance, visão geral" className={`flex min-h-20 items-center px-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-evo-blueMain ${collapsed ? 'justify-center' : ''}`}>
          <img src="/ediv-logo.png" alt="" aria-hidden="true" className="h-10 w-10 shrink-0 object-contain mix-blend-screen" />
          {!collapsed && <span className="ml-3 text-base font-bold tracking-tight">Ediv Finance</span>}
        </Link>
        <button type="button" onClick={() => setCollapsed(value => !value)} aria-label={collapsed ? 'Expandir navegação' : 'Recolher navegação'} className="mx-3 mb-3 flex min-h-10 items-center justify-center gap-2 rounded-lg text-xs text-evo-textSec transition hover:bg-white/[0.04] hover:text-evo-textMain focus-visible:outline focus-visible:outline-2 focus-visible:outline-evo-blueMain">
          {collapsed ? <ChevronRight size={16} aria-hidden="true" /> : <><ChevronLeft size={16} aria-hidden="true" /> Recolher</>}
        </button>
        <nav aria-label="Navegação principal" className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3">
          {navigation.map(item => <NavigationLink key={item.to} {...item} collapsed={collapsed} />)}
        </nav>
        <div className="shrink-0 border-t border-evo-border p-3">
          <NavLink to="/app/assessoria" title={collapsed ? 'Assessoria' : undefined} className={({ isActive }) => `flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-evo-blueMain ${collapsed ? 'justify-center' : ''} ${isActive ? 'border border-evo-blueMain/20 bg-evo-blueMain/10 text-evo-blueMain' : 'text-evo-textSec hover:bg-evo-card hover:text-evo-textMain'}`}>
            <Headset size={20} aria-hidden="true" />{!collapsed && <span>Assessoria</span>}
          </NavLink>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between border-b border-evo-border bg-evo-bgSec/95 px-4 backdrop-blur md:min-h-20 md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <img src="/ediv-logo.png" alt="" aria-hidden="true" className="h-8 w-8 shrink-0 object-contain mix-blend-screen lg:hidden" />
            <h1 className="truncate text-base font-semibold text-evo-textMain md:text-xl">{title}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2 md:gap-4">
            <span className="hidden rounded-full border border-evo-blueMain/20 bg-evo-blueMain/10 px-3 py-1 text-xs font-medium text-evo-blueMain sm:inline-flex">Cotações com atraso</span>
            <NotificationDropdown />
            {user && <ProfileMenu name={user.name} email={user.email} onLogout={logout} />}
          </div>
        </header>

        <main id="conteudo" className="w-full flex-1 px-4 py-5 pb-24 md:px-8 md:py-8">
          <Outlet />
          <footer className="mx-auto mt-10 max-w-7xl border-t border-evo-border pt-4 text-xs leading-relaxed text-evo-textSec">
            Cotações podem ter atraso ou indisponibilidade. As operações são registros pessoais, sem envio a corretoras. O conteúdo não constitui recomendação de investimento.
          </footer>
        </main>
      </div>

      <nav aria-label="Navegação móvel" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-evo-border bg-evo-bgSec/95 px-1 pb-[env(safe-area-inset-bottom)] pt-1 backdrop-blur lg:hidden">
        {[...navigation, { to: '/app/assessoria', shortLabel: 'Assessoria', icon: Headset, end: false }].map(({ to, shortLabel, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-[10px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-evo-blueMain ${isActive ? 'text-evo-blueMain' : 'text-evo-textSec'}`}>
            <Icon size={19} aria-hidden="true" /><span>{shortLabel}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};
