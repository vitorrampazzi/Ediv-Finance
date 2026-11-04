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
import { lazyPage } from "./lib/lazyPage";
const DashboardLayout = lazy(() =>
  pageImports.dashboard().then((module) => ({
    default: module.DashboardLayout,
  })),
);
const Assessoria = lazyPage(
  () => pageImports.assessoria().then((module) => module.Assessoria),
  ["/assessoria"],
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
const Glossario = lazyPage(
  () => pageImports.glossario().then((module) => module.Glossario),
  ["/glossario"],
);
import { AuthProvider } from "./context/AuthProvider";
import { useAuth } from "./context/authContext";
import { RequireAuth } from "./components/RequireAuth";
import { RequirePermission } from "./components/RequirePermission";
const AdminPage = lazy(() =>
  pageImports.admin().then((module) => ({ default: module.AdminPage })),
);
const LoginPage = lazyPage(
  () => pageImports.login().then((module) => module.LoginPage),
  ["/entrar"],
);
const RegisterPage = lazyPage(
  () => pageImports.register().then((module) => module.RegisterPage),
  ["/cadastro"],
);
const VerifyEmailPage = lazyPage(
  () => pageImports.verify().then((module) => module.VerifyEmailPage),
  ["/verificar"],
);
const ForgotPasswordPage = lazyPage(
  () => pageImports.forgot().then((module) => module.ForgotPasswordPage),
  ["/recuperar-senha"],
);
const ResetPasswordPage = lazyPage(
  () => pageImports.reset().then((module) => module.ResetPasswordPage),
  ["/redefinir-senha"],
);
const Home = lazyPage(
  () => pageImports.home().then((module) => module.Home),
  ["/"],
);
const MemberHome = lazy(() =>
  pageImports.memberHome().then((module) => ({
    default: module.MemberHome,
  })),
);
import { PublicLayout } from "./components/SiteChrome";
const IncomeRanking = lazyPage(
  () => pageImports.ranking().then((module) => module.IncomeRanking),
  ["/ranking"],
);
const PublicStock = lazy(() =>
  pageImports.publicStock().then((module) => ({
    default: module.PublicStock,
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

const Aprender = lazyPage(
  () => pageImports.aprender().then((module) => module.Aprender),
  ["/aprender"],
);
const Conversas = lazy(() =>
  pageImports.conversas().then((module) => ({ default: module.Conversas })),
);
const Privacidade = lazyPage(
  () => pageImports.privacidade().then((module) => module.Privacidade),
  ["/privacidade"],
);
const Suporte = lazyPage(
  () => pageImports.suporte().then((module) => module.Suporte),
  ["/suporte"],
);
const Metodologia = lazyPage(
  () => pageImports.metodologia().then((module) => module.Metodologia),
  ["/metodologia"],
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
                <Route
                  path="/mercado"
                  element={<Navigate to="/ranking" replace />}
                />
                <Route path="/ranking" element={<IncomeRanking />} />
                <Route path="/ranking/acao/:ticker" element={<PublicStock />} />
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
                  <Route
                    path="analises"
                    element={<Navigate to="/app/ranking" replace />}
                  />
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
              <Route
                path="*"
                element={
                  <PublicLayout>
                    <NotFound />
                  </PublicLayout>
                }
              />
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
      <h1 className="text-2xl font-bold">Página não encontrada</h1>
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
