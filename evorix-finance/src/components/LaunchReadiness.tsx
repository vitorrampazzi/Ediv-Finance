import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, CircleAlert, Copy, Mail, RefreshCw } from "lucide-react";
import { apiRequest } from "../lib/api";

type Launch = {
  appUrl: string;
  environment: string;
  researchPublished: boolean;
  email: {
    configured: boolean;
    senderDomain: string | null;
    testOnly: boolean;
  };
  customDomain: boolean;
  professionalIdentified: boolean;
  supportConfigured: boolean;
};
type EmailCheck = {
  status: "missing" | "connected" | "error";
  checkedAt: string;
  message: string;
};

export function LaunchReadiness() {
  const [revision, setRevision] = useState(0);
  const [snapshot, setSnapshot] = useState<{
    revision: number;
    data?: Launch;
    error?: string;
  } | null>(null);
  const [check, setCheck] = useState<EmailCheck | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    apiRequest<Launch>("/api/admin/launch", { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setSnapshot({ revision, data });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setSnapshot({
            revision,
            error:
              error instanceof Error
                ? error.message
                : "Não foi possível conferir o lançamento.",
          });
      });
    return () => controller.abort();
  }, [revision]);
  const current = snapshot?.revision === revision ? snapshot : null;
  const data = current?.data;
  async function verifyEmail() {
    setBusy(true);
    setMessage("");
    setCheck(null);
    try {
      setCheck(
        await apiRequest<EmailCheck>("/api/admin/launch/email-check", {
          method: "POST",
        }),
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível verificar a conexão.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function copyLink() {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.appUrl);
      setMessage("Link copiado.");
    } catch {
      setMessage(
        "Não foi possível copiar automaticamente. Selecione o endereço exibido abaixo.",
      );
    }
  }
  return (
    <section
      aria-labelledby="launch-heading"
      className="space-y-5 rounded-xl border border-evo-border bg-evo-card p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="launch-heading" className="text-lg font-semibold">
            Preparação para divulgar
          </h2>
          <p className="mt-2 text-sm text-evo-textSec">
            Confira o ambiente e as pendências antes de convidar os seguidores.
          </p>
        </div>
        <button
          type="button"
          className="action-secondary"
          onClick={() => {
            setRevision((value) => value + 1);
            setCheck(null);
            setMessage("");
          }}
        >
          <RefreshCw size={16} aria-hidden="true" /> Atualizar situação
        </button>
      </div>
      {current?.error ? (
        <p role="alert" className="notice-error">
          {current.error}
        </p>
      ) : !data ? (
        <p role="status" className="text-sm text-evo-textSec">
          Conferindo configuração…
        </p>
      ) : (
        <>
          <div className="rounded-lg border border-evo-border bg-evo-bgMain p-4">
            <p className="text-xs font-semibold text-evo-accent">
              {data.environment} · endereço deste ambiente
            </p>
            <a
              className="mt-2 block break-all text-sm underline"
              href={data.appUrl}
              target="_blank"
              rel="noreferrer"
            >
              {data.appUrl}
            </a>
            <button
              type="button"
              className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm text-evo-accent"
              onClick={() => void copyLink()}
            >
              <Copy size={16} aria-hidden="true" /> Copiar link
            </button>
            {data.environment === "QA" && (
              <p className="mt-2 text-xs text-evo-textSec">
                Este é um endereço de teste. Use o link de produção na
                divulgação.
              </p>
            )}
          </div>
          <ul className="grid gap-3 text-sm sm:grid-cols-2">
            {[
              [
                data.researchPublished,
                "Pesquisa do ranking",
                "Publicação disponível para contas cadastradas.",
                "Aguardando a pesquisa do corretor. O exemplo permanece identificado como fictício.",
              ],
              [
                data.email.configured && !data.email.testOnly,
                "Configuração de e-mail",
                "Variáveis presentes. Confira a conexão e depois a entrega na caixa de entrada.",
                data.email.testOnly
                  ? "O remetente resend.dev permite somente testes para o dono da conta Resend. Novos cadastros públicos aguardam um domínio verificado e a atualização de MAIL_FROM."
                  : "Configure SMTP_URL e MAIL_FROM na Vercel.",
              ],
              [
                data.professionalIdentified,
                "Identificação profissional",
                "Nome, categoria e registro preenchidos. A equipe deve conferir os dados.",
                "Faltam nome, categoria e registro do responsável.",
              ],
              [
                data.supportConfigured,
                "Contato público",
                "Contato e horário preenchidos.",
                "Faltam o e-mail de suporte e o horário de resposta.",
              ],
              [
                data.customDomain,
                "Endereço com a marca",
                "Endereço próprio configurado no aplicativo.",
                "Pode divulgar o endereço Vercel; o domínio próprio será conectado depois.",
              ],
            ].map(([done, title, success, pending]) => (
              <li
                key={String(title)}
                className="flex items-start gap-3 rounded-lg border border-evo-border p-4"
              >
                {done ? (
                  <CheckCircle2
                    size={18}
                    className="shrink-0 text-evo-green"
                    aria-hidden="true"
                  />
                ) : (
                  <CircleAlert
                    size={18}
                    className="shrink-0 text-evo-textSec"
                    aria-hidden="true"
                  />
                )}
                <div>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-evo-textSec">
                    {done ? success : pending}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <div>
            <button
              type="button"
              className="action-secondary"
              disabled={busy || !data.email.configured}
              onClick={() => void verifyEmail()}
            >
              <Mail size={16} aria-hidden="true" />
              {busy ? "Verificando conexão…" : "Verificar conexão de e-mail"}
            </button>
            <p className="mt-2 text-xs leading-relaxed text-evo-textSec">
              Verifica conexão e autenticação sem enviar mensagens. Não confirma
              a verificação do domínio nem a entrega. Para concluir, faça um
              cadastro com um e-mail seu, abra a confirmação e entre na conta.
            </p>
            {data.email.senderDomain && (
              <p className="mt-2 text-xs text-evo-textSec">
                Domínio do remetente configurado: {data.email.senderDomain}
              </p>
            )}
            {check && (
              <p
                role="status"
                className={`mt-3 ${check.status === "connected" ? "notice-success" : "notice-error"}`}
              >
                {check.message} ·{" "}
                {new Date(check.checkedAt).toLocaleString("pt-BR")}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              className="action-secondary"
              to="/app/ranking#publicar-pesquisa"
            >
              Preparar pesquisa
            </Link>
            <Link className="action-secondary" to="/suporte">
              Conferir contato público
            </Link>
            <Link className="action-secondary" to="/metodologia">
              Conferir pesquisa e autoria
            </Link>
          </div>
          <details className="border-t border-evo-border pt-4">
            <summary className="min-h-11 cursor-pointer text-sm font-semibold">
              O que preencher quando o conteúdo chegar
            </summary>
            <ol className="mt-3 list-decimal space-y-3 pl-5 text-sm leading-6 text-evo-textSec">
              <li>
                Na pesquisa, informe título, autoria, categoria e registro;
                revise tese, riscos, período e fontes de cada empresa antes da
                publicação.
              </li>
              <li>
                Para a identificação pública, configure{" "}
                <code>PROFESSIONAL_NAME</code>,{" "}
                <code>PROFESSIONAL_CATEGORY</code> e{" "}
                <code>PROFESSIONAL_REGISTRATION</code> na Vercel.
              </li>
              <li>
                Para o suporte, configure <code>SUPPORT_EMAIL</code> e{" "}
                <code>SUPPORT_HOURS</code>. Esses campos são públicos; não são
                credenciais.
              </li>
              <li>
                Associe os links dos vídeos aos capítulos do curso. A leitura e
                os exercícios continuam disponíveis enquanto os vídeos estão em
                preparação.
              </li>
            </ol>
            <p className="mt-3 text-xs leading-6 text-evo-textSec">
              As variáveis de identificação e contato entram no próximo
              deployment. Os dados da autoria de cada pesquisa ficam registrados
              naquela publicação.
            </p>
          </details>
        </>
      )}
      {message && (
        <p role="status" className="text-sm text-evo-textSec">
          {message}
        </p>
      )}
    </section>
  );
}
