import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card } from "../components/Card";
import { useAuth } from "../context/authContext";
import { apiRequest } from "../lib/api";
import { PasswordInput } from "../components/PasswordInput";
export const Configuracoes = () => {
  const { deleteAccount } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
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
    if (password !== repeat) {
      setError("As novas senhas precisam ser iguais.");
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
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Conta e segurança</h1>
        <p className="mt-2 text-sm text-evo-textSec">
          Controle seu acesso e os dados que você registra na Ediv.
        </p>
      </header>
      {error && (
        <p role="alert" className="notice-error">
          {error}
        </p>
      )}
      <Card glow="none">
        <h2 className="text-lg font-semibold">Alterar senha</h2>
        <p className="mt-2 text-sm text-evo-textSec">
          Use pelo menos 12 caracteres. A alteração encerra todas as sessões.
        </p>
        <form onSubmit={change} className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="text-sm sm:col-span-2">
            <label htmlFor="settings-current-password" className="block">
              Senha atual
            </label>
            <PasswordInput
              id="settings-current-password"
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
              visibilityLabel="nova senha"
              containerClassName="mt-2"
              required
              minLength={12}
              maxLength={128}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="text-sm">
            <label htmlFor="settings-confirm-password" className="block">
              Repita a nova senha
            </label>
            <PasswordInput
              id="settings-confirm-password"
              visibilityLabel="confirmação da nova senha"
              containerClassName="mt-2"
              required
              minLength={12}
              maxLength={128}
              autoComplete="new-password"
              value={repeat}
              onChange={(e) => setRepeat(e.target.value)}
            />
          </div>
          <button className="action sm:col-span-2" disabled={busy}>
            Salvar e entrar novamente
          </button>
        </form>
      </Card>
      <Card glow="none">
        <h2 className="text-lg font-semibold">Sessões e cópia dos dados</h2>
        <p className="mt-2 text-sm text-evo-textSec">
          A exportação inclui os dados salvos na sua conta e registros de
          recursos usados em versões anteriores. Guarde o arquivo em um lugar
          privado.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a className="action" href="/api/auth/export">
            Baixar meus dados (JSON)
          </a>
          <button
            className="action"
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
            Encerrar todas as sessões
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <Link to="/privacidade" className="underline">
            Privacidade e uso
          </Link>
          <Link to="/app/conversas" className="underline">
            Falar com a equipe
          </Link>
        </div>
      </Card>
      <Card glow="none" className="border-evo-red/40">
        <h2 className="text-lg font-semibold">Excluir minha conta</h2>
        <p className="mt-2 text-sm text-evo-textSec">
          A exclusão apaga o perfil e os registros vinculados, incluindo
          carteira, eventos e conversas. Faça sua exportação antes de continuar.
          Cópias de segurança podem permanecer até expirar a retenção definida
          pela operação.
        </p>
        {!open ? (
          <button
            className="mt-4 min-h-11 rounded-lg border border-evo-red/40 px-4"
            onClick={() => setOpen(true)}
          >
            Solicitar exclusão
          </button>
        ) : (
          <form
            className="mt-5 space-y-4"
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
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="action"
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
                className="min-h-11 rounded-lg bg-evo-red px-4 font-semibold text-evo-bgMain disabled:opacity-50"
              >
                {busy ? "Excluindo…" : "Excluir permanentemente"}
              </button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
};
