import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  LockKeyhole,
} from "lucide-react";
import { apiRequest } from "../lib/api";
import { useAuth } from "../context/authContext";
import { authLink, safeAuthDestination } from "../lib/authDestination";

function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-evo-border bg-evo-card p-6 shadow-2xl sm:p-8">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-evo-textSec hover:text-evo-textMain"
        >
          <img
            src="/ediv-logo.png"
            alt=""
            aria-hidden="true"
            className="h-8 w-8 object-contain mix-blend-screen"
          />
          Ediv Finance
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-evo-textSec">
          {description}
        </p>
        {children}
        <Link
          to="/"
          className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm text-evo-textSec"
        >
          <ArrowLeft size={16} /> Voltar ao site
        </Link>
        <p className="mt-6 border-t border-evo-border pt-4 text-xs leading-relaxed text-evo-textSec">
          Esta versão permite salvar operações manuais de carteira, mas não
          conecta corretoras nem movimenta dinheiro. As cotações podem ter
          atraso; nunca use a senha de outro serviço.
        </p>
      </section>
    </main>
  );
}

function ErrorMessage({ children }: { children: string }) {
  return (
    <p
      role="alert"
      className="mt-4 flex items-start gap-2 rounded-lg border border-evo-red/20 bg-evo-red/5 p-3 text-sm text-evo-red"
    >
      <CircleAlert size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
      {children}
    </p>
  );
}

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
          <input
            id="login-password"
            type="password"
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

export function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const destination = safeAuthDestination(
    new URLSearchParams(location.search).get("next"),
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [verificationUrl, setVerificationUrl] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate(destination, { replace: true });
  }, [user, navigate, destination]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setVerificationUrl("");
    setBusy(true);
    try {
      const result = await register(name, email, password, destination);
      setMessage(result.message || "Cadastro recebido.");
      setVerificationUrl(result.verificationUrl || "");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível criar a conta. Tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Criar conta grátis"
      description="Libere o ranking completo, os módulos da pesquisa e todas as aulas. Organize sua carteira e salve favoritos."
    >
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label
            htmlFor="register-name"
            className="mb-1.5 block text-sm font-medium"
          >
            Nome
          </label>
          <input
            id="register-name"
            type="text"
            autoComplete="name"
            required
            minLength={2}
            maxLength={100}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="min-h-11 w-full rounded-lg border border-evo-border bg-evo-bgMain px-3 text-evo-textMain"
          />
        </div>
        <div>
          <label
            htmlFor="register-email"
            className="mb-1.5 block text-sm font-medium"
          >
            E-mail
          </label>
          <input
            id="register-email"
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
            htmlFor="register-password"
            className="mb-1.5 block text-sm font-medium"
          >
            Senha
          </label>
          <input
            id="register-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={128}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="min-h-11 w-full rounded-lg border border-evo-border bg-evo-bgMain px-3 text-evo-textMain"
          />
          <p className="mt-1.5 text-xs text-evo-textSec">
            Use pelo menos 12 caracteres. Não reutilize a senha de outro
            serviço.
          </p>
        </div>
        {error && <ErrorMessage>{error}</ErrorMessage>}
        {message && (
          <div
            role="status"
            className="rounded-lg border border-evo-green/20 bg-evo-green/5 p-3 text-sm text-evo-green"
          >
            <p>{message}</p>
            <Link
              className="mt-3 inline-flex min-h-11 items-center underline"
              to={authLink("entrar", destination)}
            >
              Depois de confirmar o e-mail, entrar e continuar
            </Link>
            {verificationUrl && (
              <a
                href={verificationUrl}
                className="mt-2 inline-block break-all font-medium underline"
              >
                Confirmar e-mail (link de desenvolvimento)
              </a>
            )}
          </div>
        )}
        <button
          type="submit"
          disabled={busy}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-evo-primary px-4 font-semibold text-white transition hover:bg-evo-primaryHover disabled:opacity-60"
        >
          {busy ? "Criando conta…" : "Criar conta grátis"}
        </button>
      </form>
      <p className="mt-4 text-xs leading-relaxed text-evo-textSec">
        O cadastro guarda seu nome, e-mail e senha protegida para autenticação.
        Consulte nossa política de privacidade e uso. Não informe CPF, dados
        bancários ou senha da corretora.
      </p>
      <Link
        className="mt-3 block text-xs text-evo-accent underline"
        to="/privacidade"
      >
        Privacidade e uso da plataforma
      </Link>
      <p className="mt-5 text-center text-sm text-evo-textSec">
        Já tem conta?{" "}
        <Link
          to={authLink("entrar", destination)}
          className="font-semibold text-evo-accent hover:text-evo-accent"
        >
          Entrar
        </Link>
      </p>
    </AuthShell>
  );
}

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

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [devLink, setDevLink] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    setDevLink("");
    try {
      const result = await apiRequest<{
        message: string;
        developmentUrl?: string;
      }>("/api/auth/password/forgot", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setMessage(result.message);
      setDevLink(result.developmentUrl || "");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível solicitar o link.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <AuthShell
      title="Recuperar acesso"
      description="Enviaremos um link de redefinição se houver uma conta com e-mail confirmado."
    >
      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block text-sm">
          E-mail
          <input
            className="field mt-2"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        {message && (
          <p role="status" className="notice-success">
            {message}
          </p>
        )}
        {error && <ErrorMessage>{error}</ErrorMessage>}
        {devLink && (
          <a className="block break-all text-xs underline" href={devLink}>
            Link local de desenvolvimento
          </a>
        )}
        <button className="action w-full" disabled={busy}>
          {busy ? "Enviando…" : "Enviar link"}
        </button>
      </form>
      <Link to="/entrar" className="mt-4 block text-sm underline">
        Voltar ao login
      </Link>
    </AuthShell>
  );
}
export function ResetPasswordPage() {
  const [token] = useState(() => window.location.hash.slice(1));
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    window.history.replaceState(null, "", window.location.pathname);
  }, []);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password !== confirmation) {
      setError("As senhas precisam ser iguais.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await apiRequest("/api/auth/password/reset", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      setDone(true);
      setPassword("");
      setConfirmation("");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível redefinir a senha.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <AuthShell
      title="Definir nova senha"
      description="O link vale por 30 minutos e pode ser usado uma vez."
    >
      {done ? (
        <div className="notice-success mt-5">
          Senha alterada. Todas as sessões foram encerradas.{" "}
          <a className="underline" href="/entrar">
            Entrar novamente
          </a>
        </div>
      ) : !token ? (
        <p className="mt-5 text-sm">
          O link está incompleto.{" "}
          <Link className="underline" to="/recuperar-senha">
            Solicitar outro link
          </Link>
        </p>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block text-sm">
            Nova senha
            <input
              className="field mt-2"
              type="password"
              required
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            Repita a senha
            <input
              className="field mt-2"
              type="password"
              required
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
            />
          </label>
          {error && <ErrorMessage>{error}</ErrorMessage>}
          <button className="action" disabled={busy}>
            {busy ? "Salvando…" : "Alterar senha"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
