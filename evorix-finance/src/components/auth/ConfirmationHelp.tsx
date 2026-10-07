import { useEffect, useState } from "react";

import { Link } from "react-router-dom";

import { useAuth } from "../../context/authContext";
import { authLink } from "../../lib/authDestination";

import { ErrorMessage } from "./AuthShell";
export function ConfirmationHelp({
  email,
  destination,
  initialLink = "",
}: {
  email: string;
  destination: string;
  initialLink?: string;
}) {
  const { resendVerification } = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [link, setLink] = useState(initialLink);
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (remaining <= 0) return;
    const timer = window.setTimeout(
      () => setRemaining((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [remaining]);
  async function resend() {
    setBusy(true);
    setMessage("");
    setError("");
    setLink("");
    try {
      const result = await resendVerification(email, destination);
      setMessage(result.message || "Confira sua caixa de entrada.");
      setLink(result.verificationUrl || "");
      setRemaining(60);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Não foi possível reenviar.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mt-5 space-y-4 rounded-xl border border-evo-border bg-evo-bgMain p-4">
      <h2 className="font-semibold">Próximo passo: confirmar seu e-mail</h2>
      <p className="break-words text-sm text-evo-textSec">
        Endereço informado:{" "}
        <strong className="text-evo-textMain">{email}</strong>
      </p>
      <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-evo-textSec">
        <li>Confira a caixa de entrada, o spam e a aba de promoções.</li>
        <li>
          Abra o link de confirmação em até 30 minutos. Se houver mais de um
          e-mail, use o mais recente.
        </li>
        <li>Depois de confirmar, entre com sua senha para continuar.</li>
      </ol>
      <button
        type="button"
        className="action-secondary w-full"
        disabled={busy || remaining > 0}
        onClick={() => void resend()}
      >
        {busy
          ? "Reenviando…"
          : remaining > 0
            ? `Reenviar em ${remaining}s`
            : "Reenviar confirmação"}
      </button>
      {message && (
        <p role="status" className="notice-success">
          {message}
        </p>
      )}
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {link && (
        <a
          className="block min-h-11 text-sm text-evo-accent underline"
          href={link}
        >
          Confirmar e-mail (ambiente de desenvolvimento)
        </a>
      )}
      <Link className="action w-full" to={authLink("entrar", destination)}>
        Já confirmei, entrar e continuar
      </Link>
      <Link
        className="inline-flex min-h-11 items-center text-xs text-evo-textSec underline"
        to="/suporte"
      >
        Ainda preciso de ajuda
      </Link>
    </div>
  );
}
