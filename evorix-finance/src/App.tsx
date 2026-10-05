import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
const DashboardLayout = lazy(() =>
  import("./layouts/DashboardLayout").then((module) => ({
    default: module.DashboardLayout,
  })),
);
const Dashboard = lazy(() =>
  import("./pages/Dashboard").then((module) => ({ default: module.Dashboard })),
);
const Analises = lazy(() =>
  import("./pages/analises").then((module) => ({ default: module.Analises })),
);
const Carteira = lazy(() =>
  import("./pages/Carteira").then((module) => ({ default: module.Carteira })),
);
const Assessoria = lazy(() =>
  import("./pages/Assessoria").then((module) => ({
    default: module.Assessoria,
  })),
);
const Perfil = lazy(() =>
  import("./pages/Perfil").then((module) => ({ default: module.Perfil })),
);
const Configuracoes = lazy(() =>
  import("./pages/Configuracoes").then((module) => ({
    default: module.Configuracoes,
  })),
);
const Favoritos = lazy(() =>
  import("./pages/Favoritos").then((module) => ({ default: module.Favoritos })),
);
import { PageErrorBoundary } from "./components/PageErrorBoundary";
import { FavoritesProvider } from "./context/FavoritesProvider";
import { AuthProvider } from "./context/AuthProvider";
import { RequireAuth } from "./components/RequireAuth";
const LoginPage = lazy(() =>
  import("./pages/Autenticacao").then((module) => ({
    default: module.LoginPage,
  })),
);
const RegisterPage = lazy(() =>
  import("./pages/Autenticacao").then((module) => ({
    default: module.RegisterPage,
  })),
);
const VerifyEmailPage = lazy(() =>
  import("./pages/Autenticacao").then((module) => ({
    default: module.VerifyEmailPage,
  })),
);
const ForgotPasswordPage = lazy(() =>
  import("./pages/Autenticacao").then((module) => ({
    default: module.ForgotPasswordPage,
  })),
);
const ResetPasswordPage = lazy(() =>
  import("./pages/Autenticacao").then((module) => ({
    default: module.ResetPasswordPage,
  })),
);
const Home = lazy(() =>
  import("./pages/Home").then((module) => ({ default: module.Home })),
);
import { PublicLayout } from "./components/SiteChrome";
const IncomeRanking = lazy(() =>
  import("./pages/IncomeRanking").then((module) => ({
    default: module.IncomeRanking,
  })),
);
import { EdivAssistant } from "./components/EdivAssistant";

const Aprender = lazy(() =>
  import("./pages/Aprender").then((module) => ({ default: module.Aprender })),
);
const Conversas = lazy(() =>
  import("./pages/Conversas").then((module) => ({ default: module.Conversas })),
);
const Privacidade = lazy(() =>
  import("./pages/Transparencia").then((module) => ({
    default: module.Privacidade,
  })),
);
const Suporte = lazy(() =>
  import("./pages/Transparencia").then((module) => ({
    default: module.Suporte,
  })),
);
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <FavoritesProvider>
          <PageErrorBoundary>
            <Suspense
              fallback={
                <p
                  role="status"
                  className="p-10 text-center text-sm text-evo-textSec"
                >
                  Carregando página…
                </p>
              }
            >
              <Routes>
                <Route path="/" element={<Home />} />
                <Route
                  path="/mercado"
                  element={
                    <PublicLayout>
                      <Analises publicView />
                    </PublicLayout>
                  }
                />
                <Route
                  path="/ranking"
                  element={
                    <PublicLayout>
                      <IncomeRanking />
                    </PublicLayout>
                  }
                />
                <Route
                  path="/assessoria"
                  element={
                    <PublicLayout>
                      <Assessoria />
                    </PublicLayout>
                  }
                />
                <Route
                  path="/aprender"
                  element={
                    <PublicLayout>
                      <Aprender />
                    </PublicLayout>
                  }
                />
                <Route
                  path="/privacidade"
                  element={
                    <PublicLayout>
                      <Privacidade />
                    </PublicLayout>
                  }
                />
                <Route
                  path="/suporte"
                  element={
                    <PublicLayout>
                      <Suporte />
                    </PublicLayout>
                  }
                />
                <Route
                  path="/recuperar-senha"
                  element={<ForgotPasswordPage />}
                />
                <Route
                  path="/redefinir-senha"
                  element={<ResetPasswordPage />}
                />
                <Route path="/entrar" element={<LoginPage />} />
                <Route path="/cadastro" element={<RegisterPage />} />
                <Route path="/verificar" element={<VerifyEmailPage />} />
                <Route element={<RequireAuth />}>
                  <Route path="/app" element={<DashboardLayout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="aprender" element={<Aprender />} />
                    <Route path="conversas" element={<Conversas />} />
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
            </Suspense>
          </PageErrorBoundary>
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
      <p className="text-sm leading-relaxed text-evo-textSec">
        O endereço pode estar incorreto ou a página pode ter sido removida.
      </p>
      <Link
        to="/"
        className="inline-flex min-h-11 items-center rounded-lg bg-evo-primary px-4 font-semibold text-white hover:bg-evo-primaryHover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-evo-accent"
      >
        Voltar ao início
      </Link>
    </section>
  );
}

export default App;
