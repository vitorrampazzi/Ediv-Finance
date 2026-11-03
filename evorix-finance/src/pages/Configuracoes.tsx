import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/authContext";
import { apiRequest } from "../lib/api";
import { roleLabels } from "../lib/permissions";
import { useTheme } from "../lib/theme";
import { requestOnboardingReplay } from "../lib/onboarding";
import { openPrivacyPreferences } from "../lib/analytics";
import { PasswordInput } from "../components/PasswordInput";
import { PasswordRequirements } from "../components/PasswordRequirements";
import { SegmentedControl } from "../components/SegmentedControl";
import {
  isValidNewPassword,
  passwordMinLength,
  passwordMaxLength,
  passwordPolicyHint,
} from "../../password-policy.mjs";

// O reset global "button { font: inherit }" fica fora das camadas e anula o
// text-sm de .action; o pai define a fonte para todos os botões terem a mesma.
const buttonFont = "text-sm font-semibold";
// Botões empilhados em largura total no celular e alinhados à direita a partir de sm.
const buttonRow =
  buttonFont + " flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end";
// Mesmas regras do cadastro (registerSchema: trim, de 2 a 100).
const nameMinLength = 2;
const nameMaxLength = 100;
const nameHint = `Use de ${nameMinLength} a ${nameMaxLength} caracteres.`;

// Título e descrição à esquerda, controles à direita; uma coluna no celular.
function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="grid gap-5 border-b border-evo-border py-8 last:border-b-0 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] md:gap-12"
    >
      <div>
        <h2 id={id} className="text-base font-semibold">
          {title}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-evo-textSec">
          {description}
        </p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

function Row({
  title,
  text,
  children,
}: {
  title: string;
  text: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-evo-border py-4 first:border-t-0 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-1 text-sm text-evo-textSec">{text}</p>
      </div>
      <div className={buttonFont + " flex shrink-0 flex-col gap-3 sm:flex-row"}>
        {children}
      </div>
    </div>
  );
}

export const Configuracoes = () => {
  const { user, deleteAccount, refreshSession } = useAuth();
  const { theme, setPreference } = useTheme();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [nameError, setNameError] = useState("");
  const [nameNotice, setNameNotice] = useState("");
  const [nameBusy, setNameBusy] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  // Foco aplicado depois do render que monta o controle de destino.
  const focusNext = useRef("");
  useEffect(() => {
    if (!focusNext.current) return;
    document.getElementById(focusNext.current)?.focus();
    focusNext.current = "";
  });
  const toggleName = (open: boolean) => {
    setEditingName(open);
    setNameError("");
    if (open) {
      setNameDraft(user?.name ?? "");
      setNameNotice("");
    }
    focusNext.current = open ? "settings-name" : "settings-name-edit";
  };
  const saveName = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = nameDraft.trim();
    if (name.length < nameMinLength || name.length > nameMaxLength) {
      setNameError(nameHint);
      document.getElementById("settings-name")?.focus();
      return;
    }
    setNameBusy(true);
    setNameError("");
    try {
      await apiRequest("/api/auth/me", {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });
      // O topo, o Perfil e a home leem o usuário do AuthProvider.
      await refreshSession().catch(() => {});
      toggleName(false);
      setNameNotice("Nome atualizado.");
    } catch (reason) {
      setNameError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível salvar o nome.",
      );
      focusNext.current = "settings-name";
    } finally {
      setNameBusy(false);
    }
  };
  const action = async (work: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await work();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível concluir a ação.",
      );
    } finally {
      setBusy(false);
    }
  };
  const change = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValidNewPassword(password)) {
      setError(passwordPolicyHint);
      document.getElementById("settings-new-password")?.focus();
      return;
    }
    if (password !== repeat) {
      setError("As novas senhas precisam ser iguais.");
      document.getElementById("settings-confirm-password")?.focus();
      return;
    }
    void action(async () => {
      await apiRequest("/api/auth/password/change", {
        method: "POST",
        body: JSON.stringify({ currentPassword, password }),
      });
      window.location.replace("/entrar");
    });
  };
  return (
    <div className="mx-auto max-w-5xl">
      <header className="border-b border-evo-border pb-6">
        <p className="edition-label">Sua conta</p>
        <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">
          Configurações
        </h1>
        <p className="mt-2 text-sm text-evo-textSec">
          Controle seu acesso, suas preferências e os dados que você registra na
          Escola do Dividendo.
        </p>
      </header>
      {error && (
        <p id="settings-error" role="alert" className="notice-error mt-6">
          {error}
        </p>
      )}
      <Section
        id="settings-account"
        title="Conta"
        description="Dados usados para entrar e para falar com você."
      >
        <dl className="divide-y divide-evo-border text-sm">
          <div className="grid gap-1 py-3 first:pt-0 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-4">
            <dt
              id="settings-name-label"
              className="text-evo-textSec sm:flex sm:min-h-11 sm:items-center sm:self-start"
            >
              Nome
            </dt>
            <dd className="min-w-0">
              {editingName ? (
                <form onSubmit={saveName} className="grid gap-3">
                  <input
                    id="settings-name"
                    className="field"
                    aria-labelledby="settings-name-label"
                    aria-describedby="settings-name-hint"
                    aria-invalid={Boolean(nameError) || undefined}
                    type="text"
                    autoComplete="name"
                    required
                    minLength={nameMinLength}
                    maxLength={nameMaxLength}
                    readOnly={nameBusy}
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                  />
                  <p
                    id="settings-name-hint"
                    role={nameError ? "alert" : undefined}
                    className={nameError ? "text-evo-red" : "text-evo-textSec"}
                  >
                    {nameError || nameHint}
                  </p>
                  <div className={buttonRow}>
                    <button
                      type="button"
                      className="action-secondary"
                      disabled={nameBusy}
                      onClick={() => toggleName(false)}
                    >
                      Cancelar
                    </button>
                    <button className="action" disabled={nameBusy}>
                      {nameBusy ? "Salvando…" : "Salvar"}
                    </button>
                  </div>
                </form>
              ) : (
                <div
                  className={
                    buttonFont +
                    " flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                  }
                >
                  <span className="break-words font-medium">{user?.name}</span>
                  <button
                    id="settings-name-edit"
                    type="button"
                    className="action-secondary shrink-0"
                    aria-label="Editar nome"
                    onClick={() => toggleName(true)}
                  >
                    Editar
                  </button>
                </div>
              )}
              <p role="status" className="mt-2 text-evo-accent empty:hidden">
                {nameNotice}
              </p>
            </dd>
          </div>
          {[
            ["E-mail", user?.email],
            [
              "Confirmação de e-mail",
              user?.emailVerified ? "Confirmado" : "Pendente",
            ],
            ["Perfil de acesso", user ? roleLabels[user.role] : "—"],
          ].map(([label, value]) => (
            <div
              key={label}
              className="grid gap-1 py-3 first:pt-0 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-4"
            >
              <dt className="text-evo-textSec">{label}</dt>
              <dd className="break-words font-medium">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-sm text-evo-textSec">
          Para alterar o e-mail,{" "}
          <Link
            to="/app/conversas"
            className="text-evo-accent underline underline-offset-4"
          >
            fale com a equipe
          </Link>
          .
        </p>
      </Section>
      <Section
        id="settings-security"
        title="Segurança"
        description="A troca de senha encerra todas as sessões. Você precisará entrar novamente."
      >
        <form onSubmit={change} className="grid gap-4 sm:grid-cols-2">
          <div className="text-sm sm:col-span-2">
            <label htmlFor="settings-current-password" className="block">
              Senha atual
            </label>
            <PasswordInput
              id="settings-current-password"
              aria-describedby={error ? "settings-error" : undefined}
              visibilityLabel="senha atual"
              containerClassName="mt-2"
              required
              autoComplete="current-password"
              maxLength={128}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="text-sm">
            <label htmlFor="settings-new-password" className="block">
              Nova senha
            </label>
            <PasswordInput
              id="settings-new-password"
              aria-describedby={[
                "settings-password-hint",
                error && "settings-error",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-invalid={
                Boolean(
                  error === passwordPolicyHint && !isValidNewPassword(password),
                ) || undefined
              }
              visibilityLabel="nova senha"
              containerClassName="mt-2"
              required
              minLength={passwordMinLength}
              maxLength={passwordMaxLength}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <PasswordRequirements id="settings-password-hint" />
          </div>
          <div className="text-sm">
            <label htmlFor="settings-confirm-password" className="block">
              Repita a nova senha
            </label>
            <PasswordInput
              id="settings-confirm-password"
              aria-describedby={error ? "settings-error" : undefined}
              visibilityLabel="confirmação da nova senha"
              aria-invalid={
                Boolean(
                  error === "As novas senhas precisam ser iguais." &&
                  password !== repeat,
                ) || undefined
              }
              containerClassName="mt-2"
              required
              minLength={passwordMinLength}
              maxLength={passwordMaxLength}
              autoComplete="new-password"
              value={repeat}
              onChange={(e) => setRepeat(e.target.value)}
            />
          </div>
          <div className={buttonRow + " sm:col-span-2"}>
            <button className="action" disabled={busy}>
              Salvar e entrar novamente
            </button>
          </div>
        </form>
        <div className="mt-6 border-t border-evo-border pt-6">
          <Row
            title="Sessões abertas"
            text={
              confirmRevoke
                ? "Encerrar todas as sessões? Você sairá de todos os aparelhos, inclusive deste."
                : "Sai da conta em todos os navegadores e aparelhos, inclusive neste."
            }
          >
            {confirmRevoke ? (
              <>
                <button
                  id="settings-revoke-cancel"
                  type="button"
                  className="action-secondary"
                  disabled={busy}
                  onClick={() => {
                    setConfirmRevoke(false);
                    focusNext.current = "settings-revoke";
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="action bg-evo-red text-evo-bgMain hover:bg-evo-red/90"
                  disabled={busy}
                  onClick={() =>
                    void action(async () => {
                      await apiRequest("/api/auth/sessions/revoke", {
                        method: "POST",
                      });
                      window.location.replace("/entrar");
                    })
                  }
                >
                  {busy ? "Encerrando…" : "Sim, encerrar"}
                </button>
              </>
            ) : (
              <button
                id="settings-revoke"
                type="button"
                className="action-secondary"
                disabled={busy}
                onClick={() => {
                  setConfirmRevoke(true);
                  focusNext.current = "settings-revoke-cancel";
                }}
              >
                Encerrar todas as sessões
              </button>
            )}
          </Row>
        </div>
      </Section>
      <Section
        id="settings-preferences"
        title="Preferências"
        description="Ajustes guardados neste navegador."
      >
        <Row title="Tema" text="Claro ou escuro, para ler com conforto.">
          <SegmentedControl
            label="Tema da interface"
            labels={["Escuro", "Claro"]}
            selected={theme === "light" ? 1 : 0}
            onSelect={(index) => setPreference(index ? "light" : "dark")}
          />
        </Row>
        <Row
          title="Apresentação guiada"
          text="Mostra de novo o passeio pelas áreas da escola."
        >
          <button
            type="button"
            className="action-secondary"
            onClick={requestOnboardingReplay}
          >
            Rever introdução
          </button>
        </Row>
        <Row
          title="Cookies e estatísticas"
          text="Escolha se aceita estatísticas opcionais de uso."
        >
          <button
            type="button"
            className="action-secondary"
            onClick={openPrivacyPreferences}
          >
            Preferências de cookies
          </button>
        </Row>
      </Section>
      <Section
        id="settings-data"
        title="Seus dados"
        description="Uma cópia do que fica salvo na sua conta."
      >
        <p className="text-sm leading-relaxed text-evo-textSec">
          A exportação inclui os dados salvos na sua conta e registros de
          recursos usados em versões anteriores. Guarde o arquivo em um lugar
          privado.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-6">
          <Link
            to="/privacidade"
            className="inline-flex min-h-11 items-center text-sm text-evo-accent underline underline-offset-4"
          >
            Privacidade e uso
          </Link>
          <a className="action" href="/api/auth/export">
            Baixar meus dados (JSON)
          </a>
        </div>
      </Section>
      <Section
        id="settings-delete"
        title="Excluir conta"
        description="Ação permanente. Faça sua exportação antes de continuar."
      >
        <p className="text-sm leading-relaxed text-evo-textSec">
          A exclusão apaga o perfil e os dados vinculados, incluindo registros
          de versões anteriores e conversas. Cópias de segurança podem
          permanecer até expirar a retenção definida pela operação.
        </p>
        {!open ? (
          <div className={buttonRow + " mt-4"}>
            <button
              type="button"
              className="action-secondary border-evo-red/50 text-evo-red"
              onClick={() => setOpen(true)}
            >
              Solicitar exclusão
            </button>
          </div>
        ) : (
          <form
            className="mt-5 space-y-4 rounded-lg border border-evo-red/40 p-4"
            onSubmit={(event) => {
              event.preventDefault();
              void action(async () => {
                await deleteAccount(deletePassword);
                navigate("/", { replace: true });
              });
            }}
          >
            <div className="text-sm">
              <label htmlFor="delete-account-password" className="block">
                Senha atual
              </label>
              <PasswordInput
                id="delete-account-password"
                aria-describedby={error ? "settings-error" : undefined}
                visibilityLabel="senha para confirmar a exclusão"
                containerClassName="mt-2"
                autoComplete="current-password"
                required
                maxLength={128}
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
              />
            </div>
            <label className="block text-sm">
              Digite EXCLUIR
              <input
                className="field mt-2"
                required
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
              />
            </label>
            <div className={buttonRow}>
              <button
                type="button"
                className="action-secondary"
                disabled={busy}
                onClick={() => {
                  setOpen(false);
                  setDeletePassword("");
                  setConfirmation("");
                }}
              >
                Cancelar
              </button>
              <button
                disabled={busy || confirmation !== "EXCLUIR"}
                className="action bg-evo-red text-evo-bgMain hover:bg-evo-red/90"
              >
                {busy ? "Excluindo…" : "Excluir permanentemente"}
              </button>
            </div>
          </form>
        )}
      </Section>
    </div>
  );
};
