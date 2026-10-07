import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";

import { apiRequest } from "../../lib/api";

import { PasswordInput } from "../../components/PasswordInput";

import { AuthShell, ErrorMessage } from "../../components/auth/AuthShell";
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
          <div className="text-sm">
            <label htmlFor="reset-password" className="block">
              Nova senha
            </label>
            <PasswordInput
              id="reset-password"
              visibilityLabel="nova senha"
              containerClassName="mt-2"
              required
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="text-sm">
            <label htmlFor="reset-password-confirmation" className="block">
              Repita a senha
            </label>
            <PasswordInput
              id="reset-password-confirmation"
              visibilityLabel="confirmação da senha"
              containerClassName="mt-2"
              required
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
            />
          </div>
          {error && <ErrorMessage>{error}</ErrorMessage>}
          <button className="action" disabled={busy}>
            {busy ? "Salvando…" : "Alterar senha"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
