import { Tooltip } from "./Tooltip";
import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { X } from "lucide-react";
import { useAuth } from "../context/authContext";
import { analyticsPage } from "../../analytics-policy.mjs";
import {
  analyticsController,
  chooseAnalytics,
  useAnalyticsConsent,
  useAnalyticsAvailable,
} from "../lib/analytics";
import { qaEnvironment } from "../lib/features";
import "./privacy-consent.css";

export function PrivacyConsent() {
  const { pathname } = useLocation();
  const { user, loading, sessionError } = useAuth();
  const consent = useAnalyticsConsent();
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  const audienceAllowed =
    !loading &&
    !sessionError &&
    !qaEnvironment &&
    (!user || user.role === "USER");
  const available = useAnalyticsAvailable();

  useEffect(() => {
    const analytics = analyticsController();
    analytics.update({ choice: consent.choice, pathname, audienceAllowed });
  }, [consent.choice, pathname, audienceAllowed]);
  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener("ediv:privacy-preferences", show);
    return () => window.removeEventListener("ediv:privacy-preferences", show);
  }, []);
  useEffect(() => {
    const element = dialog.current;
    if (!open) {
      element?.close();
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element?.showModal();
    return () => {
      element?.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);
  const enabled = available && !qaEnvironment;
  const banner =
    enabled &&
    audienceAllowed &&
    Boolean(analyticsPage(pathname)) &&
    consent.choice === null &&
    !open;
  const select = (choice: "granted" | "denied") => {
    chooseAnalytics(choice);
    setOpen(false);
  };
  const actions = (
    <div className="ediv-consent-actions">
      <button
        type="button"
        className="action-secondary"
        onClick={() => select("denied")}
      >
        Somente necessários
      </button>
      <button
        type="button"
        className="action-secondary"
        onClick={() => select("granted")}
      >
        Permitir estatísticas
      </button>
    </div>
  );

  return (
    <>
      {banner && (
        <aside
          className="ediv-consent-banner"
          data-account={pathname.startsWith("/app")}
          role="region"
          aria-labelledby={`${id}-banner-title`}
        >
          <div>
            <h2 id={`${id}-banner-title`}>Você escolhe os cookies</h2>
            <p>
              Usamos armazenamento necessário para acesso e preferências. Com
              sua permissão, o Google Analytics mede o uso das páginas para
              melhorar a escola. Você pode recusar e continuar usando o site.
            </p>
            <Link to="/privacidade#estatisticas" className="ediv-consent-link">
              Entenda os dados usados
            </Link>
          </div>
          {actions}
        </aside>
      )}
      <dialog
        ref={dialog}
        className="ediv-consent-dialog"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`}
        onCancel={() => setOpen(false)}
        onClose={() => setOpen(false)}
      >
        <header>
          <h2 id={`${id}-title`}>Preferências de cookies</h2>
          <Tooltip content={"Fechar preferências"}>
            <button
              type="button"
              className="ediv-consent-close"
              aria-label="Fechar preferências"
              onClick={() => setOpen(false)}
            >
              <X size={20} aria-hidden="true" />
            </button>
          </Tooltip>
        </header>
        <p id={`${id}-description`}>
          Os recursos necessários mantêm sua sessão, segurança e escolhas neste
          navegador. As estatísticas são opcionais e não condicionam o acesso à
          conta.
        </p>
        <section>
          <h3>Necessários · sempre ativos</h3>
          <p>
            Login, proteção contra abuso, aparência, introdução e preferências
            de privacidade.
          </p>
        </section>
        <section>
          <h3>
            Estatísticas ·{" "}
            {consent.choice === "granted" ? "permitidas" : "não permitidas"}
          </h3>
          <p>
            Google Analytics: páginas acessadas, identificadores de cookies e
            informações técnicas de navegação. Não enviamos nome, e-mail, senha,
            mensagens, buscas ou tokens de acesso.
          </p>
        </section>
        {!enabled && (
          <p className="ediv-consent-status" role="status">
            O Google Analytics ainda não está ativo neste ambiente. Nenhum dado
            de estatística é enviado daqui.
          </p>
        )}
        {!consent.persisted && (
          <p className="ediv-consent-status" role="status">
            O navegador bloqueou o salvamento. Sua escolha vale apenas nesta
            sessão.
          </p>
        )}
        <p>
          Escolha atual:{" "}
          <strong>
            {consent.choice === "granted"
              ? "estatísticas permitidas"
              : consent.choice === "denied"
                ? "somente necessários"
                : "nenhuma autorização para estatísticas"}
          </strong>
          . Você pode mudar a escolha aqui a qualquer momento. Ela será
          solicitada novamente após seis meses.
        </p>
        <Link
          to="/privacidade#estatisticas"
          className="ediv-consent-link"
          onClick={() => setOpen(false)}
        >
          Consultar privacidade e cookies
        </Link>
        {actions}
      </dialog>
    </>
  );
}
