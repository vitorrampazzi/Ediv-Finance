import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LockKeyhole } from "lucide-react";

import { useAuth } from "../../context/authContext";
import { authLink, safeAuthDestination } from "../../lib/authDestination";
import { PasswordInput } from "../../components/PasswordInput";

import { AuthShell, ErrorMessage } from "../../components/auth/AuthShell";
import { SessionStatus } from "../../components/SessionStatus";
import { ConfirmationHelp } from "../../components/auth/ConfirmationHelp";
import { ApiError } from "../../lib/api";
export function LoginPage() {
  const { user, loading, sessionError, login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const destination = safeAuthDestination(
    new URLSearchParams(location.search).get("next") ||
      (location.state as { from?: string } | null)?.from,
  );

  useEffect(() => {
    if (user) navigate(destination, { replace: true });
  }, [user, destination, navigate]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setVerificationEmail("");
    setBusy(true);
    try {
      await login(email, password);
      navigate(destination, { replace: true });
    } catch (reason) {
      if (reason instanceof ApiError && reason.code === "EMAIL_NOT_VERIFIED") {
        setVerificationEmail(email.trim());
        setPassword("");
      }
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível entrar. Tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  };

  if (loading || (!user && sessionError)) return <SessionStatus />;

  return (
    <AuthShell
      title="Entrar na conta"
      description="Use seu e-mail e sua senha para acessar o painel."
    >
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label
            htmlFor="login-email"
            className="mb-1.5 block text-sm font-medium"
          >
            E-mail
          </label>
          <input
            id="login-email"
            aria-describedby={error ? "login-error" : undefined}
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setVerificationEmail("");
              setError("");
            }}
            className="min-h-11 w-full rounded-lg border border-evo-border bg-evo-bgMain px-3 text-evo-textMain"
          />
        </div>
        <div>
          <label
            htmlFor="login-password"
            className="mb-1.5 block text-sm font-medium"
          >
            Senha
          </label>
          <PasswordInput
            id="login-password"
            aria-describedby={error ? "login-error" : undefined}
            autoComplete="current-password"
            required
            maxLength={128}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="min-h-11 w-full rounded-lg border border-evo-border bg-evo-bgMain px-3 text-evo-textMain"
          />
        </div>
        {error && <ErrorMessage id="login-error">{error}</ErrorMessage>}
        <button
          type="submit"
          disabled={busy}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-evo-primary px-4 font-semibold text-white transition hover:bg-evo-primaryHover disabled:opacity-60"
        >
          <LockKeyhole size={17} aria-hidden="true" />
          {busy ? "Entrando…" : "Entrar"}
        </button>
      </form>
      {verificationEmail && (
        <ConfirmationHelp
          key={verificationEmail}
          email={verificationEmail}
          destination={destination}
        />
      )}
      <div className="mt-4 flex flex-col items-start gap-2 border-t border-evo-border pt-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-2">
        <Link
          to="/recuperar-senha"
          className="inline-flex min-h-11 items-center py-2 text-sm text-evo-accent underline underline-offset-4"
        >
          Esqueci minha senha
        </Link>
      </div>
      <p className="mt-5 text-center text-sm text-evo-textSec">
        Ainda não tem conta?{" "}
        <Link
          to={authLink("cadastro", destination)}
          className="font-semibold text-evo-accent hover:text-evo-accent"
        >
          Criar conta
        </Link>
      </p>
    </AuthShell>
  );
}
