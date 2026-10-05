// src/App.tsx
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { DashboardLayout } from './layouts/DashboardLayout';
import { Dashboard } from './pages/Dashboard';
import { Analises } from './pages/analises';
import { Carteira } from './pages/Carteira';
import { Assessoria } from './pages/Assessoria';
import { Perfil } from './pages/Perfil';
import { Configuracoes } from './pages/Configuracoes';
import { Favoritos } from './pages/Favoritos';
import { FavoritesProvider } from './context/FavoritesProvider';
import { AuthProvider } from './context/AuthProvider';
import { RequireAuth } from './components/RequireAuth';
import { LoginPage, RegisterPage, VerifyEmailPage } from './pages/Autenticacao';
import { Home } from './pages/Home';
import { PublicLayout } from './components/SiteChrome';
import { IncomeRanking } from './pages/IncomeRanking';
import { EdivAssistant } from './components/EdivAssistant';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <FavoritesProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/mercado" element={<PublicLayout><Analises publicView /></PublicLayout>} />
            <Route path="/ranking" element={<PublicLayout><IncomeRanking /></PublicLayout>} />
            <Route path="/assessoria" element={<PublicLayout><Assessoria /></PublicLayout>} />
            <Route path="/entrar" element={<LoginPage />} />
            <Route path="/cadastro" element={<RegisterPage />} />
            <Route path="/verificar" element={<VerifyEmailPage />} />
            <Route element={<RequireAuth />}>
              <Route path="/app" element={<DashboardLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="analises" element={<Analises />} />
                <Route path="ranking" element={<IncomeRanking />} />
                <Route path="carteira" element={<Carteira />} />
                <Route path="favoritos" element={<Favoritos />} />
                <Route path="assessoria" element={<Assessoria />} />
                <Route path="perfil" element={<Perfil />} />
                <Route path="config" element={<Configuracoes />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
          <EdivAssistant />
        </FavoritesProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

function NotFound() {
  return (
    <section className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center gap-4 text-center">
      <p className="font-numbers text-sm text-evo-accent">404</p>
      <h2 className="text-2xl font-bold">Página não encontrada</h2>
      <p className="text-sm leading-relaxed text-evo-textSec">O endereço pode estar incorreto ou a página pode ter sido removida.</p>
      <Link to="/" className="inline-flex min-h-11 items-center rounded-lg bg-evo-primary px-4 font-semibold text-white hover:bg-evo-primaryHover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-evo-accent">Voltar ao início</Link>
    </section>
  );
}

export default App;
