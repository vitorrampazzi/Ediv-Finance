import { ArrowRight, BarChart3, Headset } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/authContext';

export function SiteHeader() {
  const { user } = useAuth();

  return (
    <>
      <a href="#conteudo" className="sr-only z-50 rounded bg-evo-blueMain px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Pular para o conteúdo</a>
      <header className="border-b border-evo-border bg-evo-bgMain/90 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-5 py-3 md:min-h-20 md:px-8">
          <Link to="/" className="flex shrink-0 items-center gap-3" aria-label="Evorix Finance, página inicial">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-evo-blueMain to-evo-green font-bold text-white">E</span>
            <span className="hidden font-semibold tracking-tight text-evo-textMain sm:inline">Evorix Finance</span>
          </Link>

          <nav aria-label="Navegação principal" className="flex items-center gap-1 sm:gap-2">
            <NavLink to="/" end className={({ isActive }) => `hidden min-h-10 items-center rounded-lg px-3 text-sm font-medium transition hover:bg-evo-card sm:inline-flex ${isActive ? 'text-evo-textMain' : 'text-evo-textSec hover:text-evo-textMain'}`}>
              Início
            </NavLink>
            <NavLink to="/mercado" className={({ isActive }) => `hidden min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium transition hover:bg-evo-card sm:inline-flex ${isActive ? 'text-evo-textMain' : 'text-evo-textSec hover:text-evo-textMain'}`}>
              <BarChart3 size={16} aria-hidden="true" /> Mercado
            </NavLink>
            <NavLink to="/assessoria" className={({ isActive }) => `inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-medium transition hover:bg-evo-card sm:px-3 ${isActive ? 'text-evo-blueMain' : 'text-evo-textSec hover:text-evo-textMain'}`}>
              <Headset size={16} aria-hidden="true" /><span>Assessoria</span>
            </NavLink>
            {user ? (
              <Link to="/app" className="inline-flex min-h-10 items-center rounded-lg bg-evo-blueMain px-3 text-sm font-semibold text-white transition hover:bg-evo-blueSec sm:px-4">Minha conta</Link>
            ) : (
              <>
                <Link to="/entrar" className="hidden min-h-10 items-center rounded-lg px-3 text-sm font-medium text-evo-textSec transition hover:bg-evo-card hover:text-evo-textMain sm:inline-flex">Entrar</Link>
                <Link to="/cadastro" className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-evo-blueMain px-3 text-sm font-semibold text-white transition hover:bg-evo-blueSec sm:px-4">Criar conta <ArrowRight size={15} aria-hidden="true" /></Link>
              </>
            )}
          </nav>
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
            <Link to="/" className="inline-flex items-center gap-3" aria-label="Evorix Finance, página inicial">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-evo-blueMain to-evo-green text-sm font-bold text-white">E</span>
              <span className="font-semibold tracking-tight text-evo-textMain">Evorix Finance</span>
            </Link>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-evo-textSec">Uma ferramenta para organizar informações financeiras pessoais e acompanhar ativos com mais clareza.</p>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-evo-textMain">Explorar</h2>
            <ul className="mt-3 space-y-2 text-sm text-evo-textSec">
              <li><Link className="hover:text-evo-textMain" to="/">Início</Link></li>
              <li><Link className="hover:text-evo-textMain" to="/mercado">Mercado</Link></li>
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
          <p className="text-xs leading-relaxed text-evo-textSec">Cotações podem ter atraso, indisponibilidade ou divergência em relação à fonte. O Evorix não é corretora, não executa ordens e não movimenta dinheiro. As informações são educativas e não constituem recomendação de investimento.</p>
          <p className="mt-4 text-xs text-evo-textSec">© {new Date().getFullYear()} Evorix Finance. Organização financeira pessoal.</p>
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
