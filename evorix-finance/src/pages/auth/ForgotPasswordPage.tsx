import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";

import { apiRequest } from "../../lib/api";

import { AuthShell, ErrorMessage } from "../../components/auth/AuthShell";
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
