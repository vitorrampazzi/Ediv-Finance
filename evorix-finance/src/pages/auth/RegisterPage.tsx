import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../../context/authContext";
import { authLink, safeAuthDestination } from "../../lib/authDestination";
import { PasswordInput } from "../../components/PasswordInput";
import { ResearchAvailability } from "../../components/ResearchAvailability";
import { useRegistrationAvailability } from "../../hooks/useRegistrationAvailability";

import { AuthShell, ErrorMessage } from "../../components/auth/AuthShell";
import { ConfirmationHelp } from "../../components/auth/ConfirmationHelp";
export function RegisterPage() {
  const availability = useRegistrationAvailability();
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
  const [submittedEmail, setSubmittedEmail] = useState("");

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
      setSubmittedEmail(email.trim());
      setPassword("");
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
      description="Estude os conceitos, conheça o formato da pesquisa, organize sua carteira e salve favoritos. Sem cobrança nesta versão."
    >
      {!message && availability.current?.available && <ResearchAvailability />}
      {message ? (
        <>
          <p role="status" className="mt-5 notice-success">
            {message}
          </p>
          <ConfirmationHelp
            email={submittedEmail}
            destination={destination}
            initialLink={verificationUrl}
          />
          <button
            type="button"
            className="mt-3 inline-flex min-h-11 items-center text-sm text-evo-accent underline"
            onClick={() => {
              setMessage("");
              setVerificationUrl("");
              setError("");
            }}
          >
            Corrigir o endereço informado
          </button>
        </>
      ) : !availability.current ? (
        <p role="status" className="mt-5 text-sm text-evo-textSec">
          Conferindo disponibilidade do cadastro…
        </p>
      ) : availability.current.error ? (
        <div className="mt-5 space-y-3">
          <ErrorMessage>{availability.current.error}</ErrorMessage>
          <button
            type="button"
            className="action-secondary"
            onClick={availability.retry}
          >
            Tentar novamente
          </button>
        </div>
      ) : !availability.current.available ? (
        <div className="mt-5 space-y-4 rounded-xl border border-evo-border bg-evo-bgMain p-4">
          <h2 className="font-semibold">Novos cadastros em preparação</h2>
          <p role="status" className="text-sm leading-relaxed text-evo-textSec">
            {availability.current.message}
          </p>
          <Link className="action w-full" to="/aprender">
            Explorar primeira aula
          </Link>
          <Link className="action-secondary w-full" to="/mercado">
            Ver o mercado
          </Link>
        </div>
      ) : (
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
            <PasswordInput
              id="register-password"
              aria-describedby="register-password-hint"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={128}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="min-h-11 w-full rounded-lg border border-evo-border bg-evo-bgMain px-3 text-evo-textMain"
            />
            <p
              id="register-password-hint"
              className="mt-1.5 text-xs text-evo-textSec"
            >
              Use pelo menos 12 caracteres. Não reutilize a senha de outro
              serviço.
            </p>
          </div>
          {error && <ErrorMessage>{error}</ErrorMessage>}
          <button
            type="submit"
            disabled={busy}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-evo-primary px-4 font-semibold text-white transition hover:bg-evo-primaryHover disabled:opacity-60"
          >
            {busy ? "Criando conta…" : "Criar conta grátis"}
          </button>
        </form>
      )}
      {!message && availability.current?.available && error && email && (
        <ConfirmationHelp
          key={email}
          email={email.trim()}
          destination={destination}
        />
      )}
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
