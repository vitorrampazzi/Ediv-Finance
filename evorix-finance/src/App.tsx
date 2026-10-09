import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Link, Navigate } from "react-router-dom";
const DashboardLayout = lazy(() =>
  import("./layouts/DashboardLayout").then((module) => ({
    default: module.DashboardLayout,
  })),
);
const Analises = lazy(() =>
  import("./pages/analises").then((module) => ({ default: module.Analises })),
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
import { PageErrorBoundary } from "./components/PageErrorBoundary";
import { PageMetadata } from "./components/PageMetadata";
const Glossario = lazy(() =>
  import("./pages/Glossario").then((module) => ({ default: module.Glossario })),
);
import { AuthProvider } from "./context/AuthProvider";
import { RequireAuth } from "./components/RequireAuth";
import { RequirePermission } from "./components/RequirePermission";
const AdminPage = lazy(() =>
  import("./pages/Admin").then((module) => ({ default: module.AdminPage })),
);
const LoginPage = lazy(() =>
  import("./pages/auth/LoginPage").then((module) => ({
    default: module.LoginPage,
  })),
);
const RegisterPage = lazy(() =>
  import("./pages/auth/RegisterPage").then((module) => ({
    default: module.RegisterPage,
  })),
);
const VerifyEmailPage = lazy(() =>
  import("./pages/auth/VerifyEmailPage").then((module) => ({
    default: module.VerifyEmailPage,
  })),
);
const ForgotPasswordPage = lazy(() =>
  import("./pages/auth/ForgotPasswordPage").then((module) => ({
    default: module.ForgotPasswordPage,
  })),
);
const ResetPasswordPage = lazy(() =>
  import("./pages/auth/ResetPasswordPage").then((module) => ({
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
const StockResearch = lazy(() =>
  import("./pages/StockResearch").then((module) => ({
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
const Metodologia = lazy(() =>
  import("./pages/Metodologia").then((module) => ({
    default: module.Metodologia,
  })),
);
function App() {
  return (
    <BrowserRouter>
      <PageMetadata />
      {qaEnvironment && (
        <aside className="border-b border-evo-accent/30 bg-evo-card px-4 py-3 text-center text-xs text-evo-textMain">
          <strong>POC · Ambiente QA</strong> · Pesquisa de ações e escola de
          dividendos. Use apenas dados fictícios nesta avaliação.
        </aside>
      )}
      <AuthProvider>
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
                path="/glossario"
                element={
                  <PublicLayout>
                    <Glossario />
                  </PublicLayout>
                }
              />
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
                path="/ranking/acao/:ticker"
                element={
                  <PublicLayout>
                    <StockResearch />
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
                path="/metodologia"
                element={
                  <PublicLayout>
                    <Metodologia />
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
              <Route path="/recuperar-senha" element={<ForgotPasswordPage />} />
              <Route path="/redefinir-senha" element={<ResetPasswordPage />} />
              <Route path="/entrar" element={<LoginPage />} />
              <Route path="/cadastro" element={<RegisterPage />} />
              <Route path="/verificar" element={<VerifyEmailPage />} />
              <Route element={<RequireAuth />}>
                <Route path="/app" element={<DashboardLayout />}>
                  <Route
                    index
                    element={<Navigate to="/app/ranking" replace />}
                  />
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
