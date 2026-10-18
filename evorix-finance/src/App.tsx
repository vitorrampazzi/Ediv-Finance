import { lazy, Suspense } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  Navigate,
  Outlet,
} from "react-router-dom";
import { PageContent, PageLoading } from "./components/PageContent";
import { NavigationIntent } from "./components/NavigationIntent";
import { PrivacyConsent } from "./components/PrivacyConsent";
import { pageImports } from "./lib/pageImports";
const DashboardLayout = lazy(() =>
  pageImports.dashboard().then((module) => ({
    default: module.DashboardLayout,
  })),
);
const Analises = lazy(() =>
  pageImports.analises().then((module) => ({ default: module.Analises })),
);
const Assessoria = lazy(() =>
  pageImports.assessoria().then((module) => ({
    default: module.Assessoria,
  })),
);
const Perfil = lazy(() =>
  pageImports.perfil().then((module) => ({ default: module.Perfil })),
);
const Configuracoes = lazy(() =>
  pageImports.configuracoes().then((module) => ({
    default: module.Configuracoes,
  })),
);
import { PageErrorBoundary } from "./components/PageErrorBoundary";
import { PageMetadata } from "./components/PageMetadata";
const Glossario = lazy(() =>
  pageImports.glossario().then((module) => ({ default: module.Glossario })),
);
import { AuthProvider } from "./context/AuthProvider";
import { useAuth } from "./context/authContext";
import { RequireAuth } from "./components/RequireAuth";
import { RequirePermission } from "./components/RequirePermission";
const AdminPage = lazy(() =>
  pageImports.admin().then((module) => ({ default: module.AdminPage })),
);
const LoginPage = lazy(() =>
  pageImports.login().then((module) => ({
    default: module.LoginPage,
  })),
);
const RegisterPage = lazy(() =>
  pageImports.register().then((module) => ({
    default: module.RegisterPage,
  })),
);
const VerifyEmailPage = lazy(() =>
  pageImports.verify().then((module) => ({
    default: module.VerifyEmailPage,
  })),
);
const ForgotPasswordPage = lazy(() =>
  pageImports.forgot().then((module) => ({
    default: module.ForgotPasswordPage,
  })),
);
const ResetPasswordPage = lazy(() =>
  pageImports.reset().then((module) => ({
    default: module.ResetPasswordPage,
  })),
);
const Home = lazy(() =>
  pageImports.home().then((module) => ({ default: module.Home })),
);
const MemberHome = lazy(() =>
  pageImports.memberHome().then((module) => ({
    default: module.MemberHome,
  })),
);
import { PublicLayout } from "./components/SiteChrome";
const IncomeRanking = lazy(() =>
  pageImports.ranking().then((module) => ({
    default: module.IncomeRanking,
  })),
);
const StockResearch = lazy(() =>
  pageImports.stockResearch().then((module) => ({
    default: module.StockResearch,
  })),
);
import { assistantEnabled, qaEnvironment } from "./lib/features";
const EdivAssistant = assistantEnabled
  ? lazy(() =>
      import("./components/EdivAssistant").then((module) => ({
        default: module.EdivAssistant,
      })),
    )
  : null;

const Aprender = lazy(() =>
  pageImports.aprender().then((module) => ({ default: module.Aprender })),
);
const Conversas = lazy(() =>
  pageImports.conversas().then((module) => ({ default: module.Conversas })),
);
const Privacidade = lazy(() =>
  pageImports.privacidade().then((module) => ({
    default: module.Privacidade,
  })),
);
const Suporte = lazy(() =>
  pageImports.suporte().then((module) => ({
    default: module.Suporte,
  })),
);
const Metodologia = lazy(() =>
  pageImports.metodologia().then((module) => ({
    default: module.Metodologia,
  })),
);
function App() {
  return (
    <BrowserRouter>
      <PageMetadata />
      <NavigationIntent />
      {qaEnvironment && (
        <aside className="border-b border-evo-accent/30 bg-evo-card px-4 py-3 text-center text-xs text-evo-textMain">
          <strong>POC · Ambiente QA</strong> · Pesquisa de ações e escola de
          dividendos. Use apenas dados fictícios nesta avaliação.
        </aside>
      )}
      <AuthProvider>
        <PrivacyConsent />
        <PageErrorBoundary>
          <Suspense fallback={<PageLoading />}>
            <Routes>
              <Route element={<PublicLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/glossario" element={<Glossario />} />
                <Route path="/mercado" element={<Analises publicView />} />
                <Route path="/ranking" element={<IncomeRanking />} />
                <Route
                  path="/ranking/acao/:ticker"
                  element={<StockResearch />}
                />
                <Route path="/assessoria" element={<Assessoria />} />
                <Route path="/aprender" element={<Aprender />} />
                <Route path="/metodologia" element={<Metodologia />} />
                <Route path="/privacidade" element={<Privacidade />} />
                <Route path="/suporte" element={<Suporte />} />
              </Route>
              <Route
                element={
                  <PageContent>
                    <Outlet />
                  </PageContent>
                }
              >
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
              </Route>
              <Route element={<RequireAuth />}>
                <Route path="/app" element={<DashboardLayout />}>
                  <Route index element={<MemberHome />} />
                  <Route path="aprender" element={<Aprender />} />
                  <Route path="conversas" element={<Conversas />} />
                  <Route
                    element={<RequirePermission permission="support:manage" />}
                  >
                    <Route
                      path="atendimentos"
                      element={<Conversas teamView />}
                    />
                  </Route>
                  <Route path="analises" element={<Analises />} />
                  <Route path="ranking" element={<IncomeRanking />} />
                  <Route
                    path="ranking/acao/:ticker"
                    element={<StockResearch />}
                  />
                  <Route
                    path="carteira"
                    element={<Navigate to="/app/ranking" replace />}
                  />
                  <Route
                    path="favoritos"
                    element={<Navigate to="/app/ranking" replace />}
                  />
                  <Route path="assessoria" element={<Assessoria />} />
                  <Route path="perfil" element={<Perfil />} />
                  <Route path="config" element={<Configuracoes />} />
                  <Route
                    element={<RequirePermission permission="users:read" />}
                  >
                    <Route path="admin" element={<AdminPage />} />
                  </Route>
                </Route>
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </PageErrorBoundary>
        {EdivAssistant && (
          <Suspense fallback={null}>
            <EdivAssistant />
          </Suspense>
        )}
      </AuthProvider>
    </BrowserRouter>
  );
}

function NotFound() {
  const { user } = useAuth();
  return (
    <section className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center gap-4 text-center">
      <p className="font-numbers text-sm text-evo-accent">404</p>
      <h2 className="text-2xl font-bold">Página não encontrada</h2>
      <p className="text-sm leading-relaxed text-evo-textSec">
        O endereço pode estar incorreto ou a página pode ter sido removida.
      </p>
      <Link
        to={user ? "/app" : "/"}
        className="inline-flex min-h-11 items-center rounded-lg bg-evo-primary px-4 font-semibold text-white hover:bg-evo-primaryHover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-evo-accent"
      >
        Voltar ao início
      </Link>
    </section>
  );
}

export default App;
