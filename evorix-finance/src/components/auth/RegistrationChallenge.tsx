import { useEffect, useRef, useState } from "react";
import { useTheme } from "../../lib/theme";

interface TurnstileApi {
  render(
    container: HTMLElement,
    options: {
      sitekey: string;
      action: "register";
      theme: "dark" | "light";
      size: "flexible" | "compact";
      "response-field": false;
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
      "timeout-callback": () => void;
    },
  ): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let loadingScript: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (loadingScript) return loadingScript;
  loadingScript = new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    const timer = window.setTimeout(() => finish(false), 15000);
    function finish(loaded: boolean) {
      window.clearTimeout(timer);
      script.onload = null;
      script.onerror = null;
      if (loaded && window.turnstile) resolve(window.turnstile);
      else {
        script.remove();
        reject(
          new Error("Não foi possível carregar a verificação de segurança."),
        );
      }
    }
    script.onload = () => finish(true);
    script.onerror = () => finish(false);
    document.head.append(script);
  }).catch((error: unknown) => {
    loadingScript = null;
    throw error;
  });
  return loadingScript;
}

export function RegistrationChallenge({
  siteKey,
  resetKey,
  onToken,
}: {
  siteKey: string;
  resetKey: number;
  onToken: (token: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<{ api: TurnstileApi; id: string } | null>(null);
  const [issue, setIssue] = useState("");
  const [ready, setReady] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const { theme } = useTheme();

  useEffect(() => {
    let cancelled = false;
    onToken("");
    void loadTurnstile()
      .then((api) => {
        if (cancelled || !container.current) return;
        const id = api.render(container.current, {
          sitekey: siteKey,
          action: "register",
          theme,
          size:
            container.current.getBoundingClientRect().width < 300
              ? "compact"
              : "flexible",
          "response-field": false,
          callback: (token) => {
            if (cancelled) return;
            setIssue("");
            onToken(token);
          },
          "expired-callback": () => {
            if (!cancelled) onToken("");
          },
          "error-callback": () => {
            if (cancelled) return;
            onToken("");
            setIssue(
              "A verificação de segurança não foi concluída. Tente novamente.",
            );
          },
          "timeout-callback": () => {
            if (cancelled) return;
            onToken("");
            setIssue("A verificação expirou. Tente novamente.");
          },
        });
        widget.current = { api, id };
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          onToken("");
          setIssue(
            "Não foi possível carregar a verificação de segurança. Confira sua conexão e tente novamente.",
          );
        }
      });
    return () => {
      cancelled = true;
      if (widget.current) {
        widget.current.api.remove(widget.current.id);
        widget.current = null;
      }
    };
  }, [siteKey, onToken, attempt, theme]);

  useEffect(() => {
    onToken("");
    if (widget.current) widget.current.api.reset(widget.current.id);
  }, [resetKey, onToken]);

  return (
    <div className="space-y-2">
      <div ref={container} className="min-h-[65px] w-full" />
      {!ready && !issue && (
        <p role="status" className="text-sm text-evo-textSec">
          Carregando verificação de segurança…
        </p>
      )}
      {issue && (
        <div className="space-y-1">
          <p role="alert" className="text-sm text-evo-textSec">
            {issue}
          </p>
          <button
            type="button"
            className="min-h-11 text-sm text-evo-accent underline"
            onClick={() => {
              onToken("");
              setIssue("");
              setReady(false);
              setAttempt((value) => value + 1);
            }}
          >
            Tentar verificação novamente
          </button>
        </div>
      )}
    </div>
  );
}
