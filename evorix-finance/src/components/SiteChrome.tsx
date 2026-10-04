import { ArrowRight, BarChart3, Headset, Menu, TrendingUp, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/authContext';

export function SiteHeader() {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <a href="#conteudo" className="sr-only z-50 rounded bg-evo-blueMain px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Pular para o conteúdo</a>
      <header className="border-b border-evo-border bg-evo-bgMain/90 backdrop-blur">
        <div className="relative mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-5 md:min-h-20 md:px-8">
          <Link to="/" className="flex shrink-0 items-center gap-3" aria-label="Ediv Finance, página inicial">
            <img src="/ediv-logo.png" alt="" aria-hidden="true" className="h-10 w-10 object-contain mix-blend-screen" />
            <span className="hidden font-semibold tracking-tight text-evo-textMain md:inline">Ediv Finance</span>
          </Link>

          <nav aria-label="Navegação principal" className="hidden items-center gap-1 md:flex lg:gap-2">
            <NavLink to="/" end className={({ isActive }) => `inline-flex min-h-10 items-center rounded-lg px-2 text-sm font-medium transition hover:bg-evo-card lg:px-3 ${isActive ? 'text-evo-textMain' : 'text-evo-textSec hover:text-evo-textMain'}`}>
              Início
            </NavLink>
            <NavLink to="/mercado" className={({ isActive }) => `inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm font-medium transition hover:bg-evo-card lg:px-3 ${isActive ? 'text-evo-textMain' : 'text-evo-textSec hover:text-evo-textMain'}`}>
              <BarChart3 size={16} aria-hidden="true" /> Mercado
            </NavLink>
            <NavLink to="/ranking" className={({ isActive }) => `inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-medium transition hover:bg-evo-card lg:px-3 ${isActive ? 'text-evo-textMain' : 'text-evo-textSec hover:text-evo-textMain'}`}>
              <TrendingUp size={16} aria-hidden="true" /> Renda
            </NavLink>
            <NavLink to="/assessoria" className={({ isActive }) => `inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-medium transition hover:bg-evo-card lg:px-3 ${isActive ? 'text-evo-blueMain' : 'text-evo-textSec hover:text-evo-textMain'}`}>
              <Headset size={16} aria-hidden="true" /><span>Assessoria</span>
            </NavLink>
            {user ? (
              <Link to="/app" className="inline-flex min-h-10 items-center rounded-lg bg-evo-blueMain px-3 text-sm font-semibold text-white transition hover:bg-evo-blueSec sm:px-4">Minha conta</Link>
            ) : (
              <>
                <Link to="/entrar" className="inline-flex min-h-10 items-center rounded-lg px-2 text-sm font-medium text-evo-textSec transition hover:bg-evo-card hover:text-evo-textMain lg:px-3">Entrar</Link>
                <Link to="/cadastro" className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-evo-blueMain px-3 text-sm font-semibold text-white transition hover:bg-evo-blueSec sm:px-4">Criar conta <ArrowRight size={15} aria-hidden="true" /></Link>
              </>
            )}
          </nav>

          <div className="flex items-center gap-2 md:hidden">
            {user ? (
              <Link to="/app" className="inline-flex min-h-10 items-center rounded-lg bg-evo-blueMain px-3 text-xs font-semibold text-white transition hover:bg-evo-blueSec">Minha conta</Link>
            ) : (
              <Link to="/cadastro" className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-evo-blueMain px-3 text-xs font-semibold text-white transition hover:bg-evo-blueSec">Criar conta <ArrowRight size={14} aria-hidden="true" /></Link>
            )}
            <button type="button" onClick={() => setMobileMenuOpen(value => !value)} aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'} aria-expanded={mobileMenuOpen} aria-controls="public-mobile-menu" className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-evo-border text-evo-textSec hover:bg-evo-card hover:text-evo-textMain focus-visible:outline focus-visible:outline-2 focus-visible:outline-evo-blueMain">
              {mobileMenuOpen ? <X size={19} aria-hidden="true" /> : <Menu size={19} aria-hidden="true" />}
            </button>
          </div>

          {mobileMenuOpen && <nav id="public-mobile-menu" aria-label="Navegação móvel" className="absolute inset-x-4 top-[calc(100%-0.25rem)] z-50 grid gap-1 rounded-xl border border-evo-border bg-evo-card p-2 shadow-2xl md:hidden">
            <NavLink to="/" end onClick={() => setMobileMenuOpen(false)} className={({ isActive }) => `flex min-h-11 items-center rounded-lg px-3 text-sm font-medium ${isActive ? 'bg-evo-blueMain/10 text-evo-blueMain' : 'text-evo-textSec hover:bg-white/[0.04] hover:text-evo-textMain'}`}>Início</NavLink>
            <NavLink to="/mercado" onClick={() => setMobileMenuOpen(false)} className={({ isActive }) => `flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium ${isActive ? 'bg-evo-blueMain/10 text-evo-blueMain' : 'text-evo-textSec hover:bg-white/[0.04] hover:text-evo-textMain'}`}><BarChart3 size={17} aria-hidden="true" /> Mercado</NavLink>
            <NavLink to="/ranking" onClick={() => setMobileMenuOpen(false)} className={({ isActive }) => `flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium ${isActive ? 'bg-evo-blueMain/10 text-evo-blueMain' : 'text-evo-textSec hover:bg-white/[0.04] hover:text-evo-textMain'}`}><TrendingUp size={17} aria-hidden="true" /> Renda</NavLink>
            <NavLink to="/assessoria" onClick={() => setMobileMenuOpen(false)} className={({ isActive }) => `flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium ${isActive ? 'bg-evo-blueMain/10 text-evo-blueMain' : 'text-evo-textSec hover:bg-white/[0.04] hover:text-evo-textMain'}`}><Headset size={17} aria-hidden="true" /> Assessoria</NavLink>
            {!user && <Link to="/entrar" onClick={() => setMobileMenuOpen(false)} className="flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-evo-textSec hover:bg-white/[0.04] hover:text-evo-textMain">Entrar</Link>}
          </nav>}
        </div>
      </header>
    </>
  );
}

export function SiteFooter() {
  const { user } = useAuth();

  return (
    <footer className="border-t border-evo-border bg-evo-bgSec/70">
      <div className="mx-auto max-w-7xl px-5 py-9 md:px-8 md:py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <Link to="/" className="inline-flex items-center gap-3" aria-label="Ediv Finance, página inicial">
              <img src="/ediv-logo.png" alt="" aria-hidden="true" className="h-9 w-9 object-contain mix-blend-screen" />
              <span className="font-semibold tracking-tight text-evo-textMain">Ediv Finance</span>
            </Link>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-evo-textSec">Uma ferramenta para organizar informações financeiras pessoais e acompanhar ativos com mais clareza.</p>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-evo-textMain">Explorar</h2>
            <ul className="mt-3 space-y-2 text-sm text-evo-textSec">
              <li><Link className="hover:text-evo-textMain" to="/">Início</Link></li>
              <li><Link className="hover:text-evo-textMain" to="/mercado">Mercado</Link></li>
              <li><Link className="hover:text-evo-textMain" to="/ranking">Renda</Link></li>
              <li><Link className="hover:text-evo-textMain" to="/assessoria">Assessoria</Link></li>
            </ul>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-evo-textMain">Sua conta</h2>
            <ul className="mt-3 space-y-2 text-sm text-evo-textSec">
              <li><Link className="hover:text-evo-textMain" to={user ? '/app' : '/entrar'}>{user ? 'Acessar painel' : 'Entrar'}</Link></li>
              {!user && <li><Link className="hover:text-evo-textMain" to="/cadastro">Criar conta</Link></li>}
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-evo-border pt-5">
          <p className="text-xs leading-relaxed text-evo-textSec">Cotações podem ter atraso, indisponibilidade ou divergência em relação à fonte. A Ediv Finance não é corretora, não executa ordens e não movimenta dinheiro. As informações são educativas e não constituem recomendação de investimento.</p>
          <p className="mt-4 text-xs text-evo-textSec">© {new Date().getFullYear()} Ediv Finance. Escola do Dividendo.</p>
        </div>
      </div>
    </footer>
  );
}

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-evo-bgMain text-evo-textMain">
      <SiteHeader />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
