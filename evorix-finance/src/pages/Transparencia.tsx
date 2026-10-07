import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/authContext";
import { apiRequest } from "../lib/api";
import { assistantEnabled } from "../lib/features";
type Information = {
  email: string;
  hours: string;
  professionalName: string;
  category: string;
  registration: string;
};
export function Suporte() {
  const { user } = useAuth();
  const [info, setInfo] = useState<Information | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    apiRequest<Information>("/api/support/information", {
      signal: controller.signal,
    })
      .then(setInfo)
      .catch(() => {
        if (!controller.signal.aborted)
          setError("Os contatos não puderam ser carregados.");
      });
    return () => controller.abort();
  }, []);
  return (
    <section className="mx-auto max-w-4xl space-y-6 px-5 py-12">
      <h1 className="text-3xl font-bold">Contato e suporte</h1>
      <p className="text-evo-textSec">
        Envie perguntas pelo atendimento da conta. As mensagens ficam
        registradas para a equipe responder; não há promessa de resposta
        imediata nem atendimento humano contínuo.
      </p>
      {error && (
        <p role="alert" className="notice-error">
          {error}
        </p>
      )}
      <dl className="grid gap-5 rounded-xl border border-evo-border bg-evo-card p-5 sm:grid-cols-2">
        {[
          ["E-mail público", info?.email],
          ["Horário de resposta", info?.hours],
          ["Nome profissional", info?.professionalName],
          ["Categoria", info?.category],
          ["Registro", info?.registration],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-sm text-evo-textSec">{label}</dt>
            <dd className="mt-1 min-h-6 break-words">
              {value || "Não informado"}
            </dd>
          </div>
        ))}
      </dl>
      <Link className="action" to={user ? "/app/conversas" : "/entrar"}>
        Abrir atendimento
      </Link>
      <p className="text-sm text-evo-textSec">
        A assinatura de assessoria está em preparação e ainda não é vendida.
        Informações de autoria de cada ranking aparecem na própria publicação.
      </p>
    </section>
  );
}
export function Privacidade() {
  return (
    <section className="mx-auto max-w-4xl space-y-8 px-5 py-12">
      <header>
        <p className="text-sm text-evo-accent">
          Transparência · versão de 06/10/2026
        </p>
        <h1 className="mt-2 text-3xl font-bold">
          Privacidade e uso da plataforma
        </h1>
      </header>
      {[
        [
          "O que a Ediv oferece",
          "A Ediv Finance oferece conteúdo educativo, um ranking de previsões e registros pessoais de carteira. Projeções dependem de premissas e podem falhar. O site não é corretora, não executa ordens e não movimenta dinheiro. Cotações dependem da disponibilidade do provedor.",
        ],
        [
          "Dados da sua conta",
          "Guardamos nome, e-mail, senha com hash, sessões, operações, eventos informados, favoritos, preferências e conversas enviadas à equipe. Usamos esses dados para autenticar, calcular os registros e oferecer as funções que você solicita. Não pedimos senha da corretora ou dados bancários.",
        ],
        [
          "Fornecedores e transmissão",
          "O aplicativo é hospedado na Vercel e usa MySQL gerenciado para os dados. E-mails de confirmação e recuperação passam pelo serviço transacional configurado. Consultas de mercado enviam tickers ao provedor de cotações. Estes fornecedores podem tratar dados fora do Brasil conforme seus serviços.",
        ],
        ...(assistantEnabled
          ? [
              [
                "Assistente educativo experimental",
                "Disponível neste ambiente de avaliação. Após sua confirmação no chat, a pergunta e o histórico recente são enviados ao Google Gemini. No plano gratuito, o conteúdo pode ser usado para melhorar serviços e passar por revisão humana. A Ediv não envia automaticamente sua carteira ou perfil e não grava esse histórico no banco. Respostas podem conter erros; confira fontes oficiais. A opção local processa perguntas apenas no navegador.",
              ],
            ]
          : []),
        [
          "Compartilhamento com a equipe",
          "Ao abrir uma conversa, você pode autorizar a visualização das operações da sua carteira pela equipe. A escolha vem desmarcada e pode ser revogada. As mensagens escritas por você continuam no atendimento até a exclusão da conta. Não envie senhas ou dados desnecessários.",
        ],
        [
          "Controle dos dados",
          "Nas configurações você pode exportar seus registros, alterar a senha, encerrar sessões e excluir a conta. O cookie de sessão é necessário para login. O progresso das aulas é salvo neste navegador e pode ser apagado na página Aprender. Não é usado para publicidade.",
        ],
        [
          "Retenção e operação",
          "Os registros permanecem enquanto a conta existe, até você excluí-los. Logs técnicos e contadores de segurança são usados para investigar falhas e limitar abuso. Cópias de segurança podem conservar registros até sua expiração; a retenção e o responsável pela operação precisam ser definidos antes do lançamento comercial.",
        ],
        [
          "Responsável e condições comerciais",
          "Os dados de identificação profissional e o contato público ainda não foram informados e não são apresentados como credenciais verificadas. A assessoria está em pré-lançamento, sem cobrança. Identificação do responsável, política final de retenção e condições contratuais devem ser concluídas antes da contratação.",
        ],
      ].map(([title, body]) => (
        <section key={title}>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="mt-2 text-sm leading-7 text-evo-textSec">{body}</p>
        </section>
      ))}
      <Link className="action" to="/suporte">
        Contato e suporte
      </Link>
    </section>
  );
}
