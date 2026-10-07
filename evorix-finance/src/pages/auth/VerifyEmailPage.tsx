import { useEffect, useState } from "react";

import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

import { authLink, safeAuthDestination } from "../../lib/authDestination";

import { AuthShell, ErrorMessage } from "../../components/auth/AuthShell";
export function VerifyEmailPage() {
  const location = useLocation();
  const destination = safeAuthDestination(
    new URLSearchParams(location.search).get("next"),
  );
  const [token] = useState(() => window.location.hash.slice(1));
  const [state, setState] = useState<{
    loading: boolean;
    error: string;
    message: string;
  }>(() => ({
    loading: Boolean(token),
    error: token ? "" : "O link de confirmação está incompleto.",
    message: "",
  }));

  useEffect(() => {
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}`,
    );
    if (!token) return;

    const controller = new AbortController();
    fetch("/api/auth/verify-email", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok)
          throw new Error(
            result.error || "Não foi possível confirmar o e-mail.",
          );
        setState({
          loading: false,
          error: "",
          message: result.message || "E-mail confirmado.",
        });
      })
      .catch((reason) => {
        if (reason instanceof Error && reason.name === "AbortError") return;
        setState({
          loading: false,
          error:
            reason instanceof Error
              ? reason.message
              : "Não foi possível confirmar o e-mail.",
          message: "",
        });
      });
    return () => controller.abort();
  }, [token]);

  return (
    <AuthShell
      title="Confirmação de e-mail"
      description="Confirmamos o endereço antes de liberar o acesso à conta."
    >
      <div
        className="mt-6 rounded-xl border border-evo-border bg-evo-bgMain p-4"
        aria-live="polite"
      >
        {state.loading ? (
          <p className="text-sm text-evo-textSec">Confirmando…</p>
        ) : state.error ? (
          <ErrorMessage>{state.error}</ErrorMessage>
        ) : (
          <p className="flex items-start gap-2 text-sm text-evo-green">
            <CheckCircle2
              size={18}
              className="mt-0.5 shrink-0"
              aria-hidden="true"
            />
            {state.message}
          </p>
        )}
      </div>
      <Link
        to={authLink("entrar", destination)}
        className="mt-5 inline-flex min-h-10 items-center gap-2 text-sm font-medium text-evo-accent hover:text-evo-accent"
      >
        <ArrowLeft size={16} aria-hidden="true" /> Ir para entrar
      </Link>
    </AuthShell>
  );
}
