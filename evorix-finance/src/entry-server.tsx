import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthProvider";
import { FavoritesProvider } from "./context/FavoritesProvider";
import { PublicLayout } from "./components/SiteChrome";
import { Home } from "./pages/Home";
import { Analises } from "./pages/analises";
import { Aprender, type LearningData } from "./pages/Aprender";
import { Glossario } from "./pages/Glossario";
import { RankingAccessLanding } from "./components/RankingAccessLanding";
import { Assessoria } from "./pages/Assessoria";
import { Privacidade, Suporte } from "./pages/Transparencia";
import { qaEnvironment } from "./lib/features";

// Static public content only: no sessions, database connections or external API calls.
export function render(path: string, learning: LearningData) {
  const pages: Record<string, React.ReactNode> = {
    "/": <Home />,
    "/mercado": <Analises publicView />,
    "/ranking": <RankingAccessLanding />,
    "/aprender": <Aprender initialContent={learning} />,
    "/glossario": <Glossario initialTerms={learning.glossary} />,
    "/assessoria": <Assessoria />,
    "/privacidade": <Privacidade />,
    "/suporte": <Suporte />,
  };
  if (!pages[path]) throw new Error("Unknown public route");
  return renderToString(
    <StaticRouter location={path}>
      {qaEnvironment && (
        <aside className="border-b border-evo-accent/30 bg-evo-card px-4 py-3 text-center text-xs">
          <strong>Ambiente QA</strong> · Use apenas dados fictícios nos testes.
        </aside>
      )}
      <AuthProvider initialLoading={false}>
        <FavoritesProvider>
          {path === "/" ? (
            pages[path]
          ) : (
            <PublicLayout>{pages[path]}</PublicLayout>
          )}
        </FavoritesProvider>
      </AuthProvider>
    </StaticRouter>,
  );
}
