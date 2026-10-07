import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LockKeyhole } from "lucide-react";

import { useAuth } from "../../context/authContext";
import { authLink, safeAuthDestination } from "../../lib/authDestination";
import { PasswordInput } from "../../components/PasswordInput";

import { AuthShell, ErrorMessage } from "../../components/auth/AuthShell";
export function LoginPage() {
  const { user, login, resendVerification } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [resendUrl, setResendUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
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
    setMessage("");
    setBusy(true);
    try {
      await login(email, password);
      navigate(destination, { replace: true });
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível entrar. Tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setError("");
    setMessage("");
    setResendUrl("");
    setResending(true);
    try {
      const result = await resendVerification(email, destination);
      setMessage(result.message || "Confira sua caixa de entrada.");
      setResendUrl(result.verificationUrl || "");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível reenviar o link.",
      );
    } finally {
      setResending(false);
    }
  };

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
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
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
            autoComplete="current-password"
            required
            maxLength={128}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="min-h-11 w-full rounded-lg border border-evo-border bg-evo-bgMain px-3 text-evo-textMain"
          />
        </div>
        {error && <ErrorMessage>{error}</ErrorMessage>}
        {message && (
          <p
            role="status"
            className="rounded-lg border border-evo-green/20 bg-evo-green/5 p-3 text-sm text-evo-green"
          >
            {message}
          </p>
        )}
        {resendUrl && (
          <a
            href={resendUrl}
            className="block break-all text-sm text-evo-accent underline"
          >
            Confirmar e-mail (link de desenvolvimento)
          </a>
        )}
        <button
          type="submit"
          disabled={busy}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-evo-primary px-4 font-semibold text-white transition hover:bg-evo-primaryHover disabled:opacity-60"
        >
          <LockKeyhole size={17} aria-hidden="true" />
          {busy ? "Entrando…" : "Entrar"}
        </button>
      </form>
      <Link
        to="/recuperar-senha"
        className="mt-3 inline-flex min-h-11 items-center text-sm text-evo-accent underline"
      >
        Esqueci minha senha
      </Link>
      <button
        type="button"
        disabled={resending || !email}
        onClick={resend}
        className="mt-3 min-h-10 text-left text-xs text-evo-textSec underline decoration-evo-border underline-offset-4 hover:text-evo-textMain disabled:opacity-50"
      >
        {resending ? "Enviando…" : "Reenviar confirmação de e-mail"}
      </button>
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
