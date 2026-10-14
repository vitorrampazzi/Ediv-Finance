import { useEffect } from "react";
import { pageImports } from "../lib/pageImports";

type PageImporter = () => Promise<unknown>;
type ConnectionNavigator = Navigator & {
  connection?: { saveData?: boolean; effectiveType?: string };
};

const attemptedImports = new Set<PageImporter>();

const publicPages: Record<string, PageImporter> = {
  "/": pageImports.home,
  "/mercado": pageImports.analises,
  "/ranking": pageImports.ranking,
  "/aprender": pageImports.aprender,
  "/glossario": pageImports.glossario,
  "/assessoria": pageImports.assessoria,
  "/metodologia": pageImports.metodologia,
  "/privacidade": pageImports.privacidade,
  "/suporte": pageImports.suporte,
  "/entrar": pageImports.login,
  "/cadastro": pageImports.register,
  "/verificar": pageImports.verify,
  "/recuperar-senha": pageImports.forgot,
  "/redefinir-senha": pageImports.reset,
};

const memberPages: Record<string, PageImporter> = {
  "/app": pageImports.memberHome,
  "/app/analises": pageImports.analises,
  "/app/ranking": pageImports.ranking,
  "/app/carteira": pageImports.ranking,
  "/app/favoritos": pageImports.ranking,
  "/app/aprender": pageImports.aprender,
  "/app/assessoria": pageImports.assessoria,
  "/app/conversas": pageImports.conversas,
  "/app/atendimentos": pageImports.conversas,
  "/app/perfil": pageImports.perfil,
  "/app/config": pageImports.configuracoes,
  "/app/admin": pageImports.admin,
};

function normalizePath(pathname: string) {
  return pathname.replace(/\/+$/, "").toLowerCase() || "/";
}

function importsForPath(pathname: string): PageImporter[] {
  const path = normalizePath(pathname);
  const publicPage = publicPages[path];
  if (publicPage) return [publicPage];
  if (/^\/ranking\/acao\/[^/]+$/.test(path)) {
    return [pageImports.stockResearch];
  }
  const memberPage = memberPages[path];
  if (memberPage) return [pageImports.dashboard, memberPage];
  if (/^\/app\/ranking\/acao\/[^/]+$/.test(path)) {
    return [pageImports.dashboard, pageImports.stockResearch];
  }
  return [];
}

function preload(importer: PageImporter) {
  if (attemptedImports.has(importer)) return;
  attemptedImports.add(importer);
  void importer().catch(() => {
    // A later intent can retry after a temporary connection failure.
    attemptedImports.delete(importer);
  });
}

/** Warms page code only when a visitor points at, focuses or presses a link. */
export function NavigationIntent() {
  useEffect(() => {
    function handleIntent(event: Event) {
      const connection = (navigator as ConnectionNavigator).connection;
      if (
        navigator.onLine === false ||
        connection?.saveData ||
        connection?.effectiveType === "slow-2g" ||
        connection?.effectiveType === "2g"
      ) {
        return;
      }
      if (
        typeof PointerEvent !== "undefined" &&
        event instanceof PointerEvent &&
        (event.button > 0 ||
          event.ctrlKey ||
          event.metaKey ||
          event.altKey ||
          event.shiftKey)
      ) {
        return;
      }
      const anchor =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>("a[href]")
          : null;
      if (
        !anchor ||
        anchor.hasAttribute("download") ||
        (anchor.target && anchor.target !== "_self") ||
        anchor.getAttribute("aria-disabled") === "true" ||
        anchor.relList.contains("external")
      ) {
        return;
      }
      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (
        url.origin !== window.location.origin ||
        !["http:", "https:"].includes(url.protocol) ||
        url.username ||
        url.password ||
        normalizePath(url.pathname) === normalizePath(window.location.pathname)
      ) {
        return;
      }
      for (const importer of importsForPath(url.pathname)) preload(importer);
    }

    document.addEventListener("pointerover", handleIntent, { passive: true });
    document.addEventListener("focusin", handleIntent);
    document.addEventListener("pointerdown", handleIntent, { passive: true });
    return () => {
      document.removeEventListener("pointerover", handleIntent);
      document.removeEventListener("focusin", handleIntent);
      document.removeEventListener("pointerdown", handleIntent);
    };
  }, []);

  return null;
}
