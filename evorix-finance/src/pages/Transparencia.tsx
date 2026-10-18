import { Clock3, Headphones, Mail, MessageCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/authContext";
import { assistantEnabled } from "../lib/features";
import { authLink } from "../lib/authDestination";
import { useSupportInformation } from "../hooks/useSupportInformation";
import { SupportHelpCenter } from "../components/support/SupportHelpCenter";
import { openPrivacyPreferences } from "../lib/analytics";
export function Suporte() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { info, loading, error } = useSupportInformation();
  const contact = (topic?: string) => {
    const destination =
      "/app/conversas" + (topic ? "?topic=" + encodeURIComponent(topic) : "");
    navigate(user ? destination : authLink("entrar", destination));
  };
  return (
    <section className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:space-y-10 sm:px-6 sm:py-12">
      <header className="border-b border-evo-border pb-7">
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[.16em] text-evo-accent">
          <Headphones size={16} aria-hidden="true" />
          Central de ajuda · Escola do Dividendo
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          Dúvidas e suporte
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-evo-textSec">
          Encontre respostas e converse com a equipe.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button className="action" type="button" onClick={() => contact()}>
            <MessageCircle size={16} aria-hidden="true" />
            {user ? "Abrir minhas conversas" : "Entrar e falar com a equipe"}
          </button>
          <Link to="/recuperar-senha" className="action-secondary">
            Preciso recuperar meu acesso
          </Link>
        </div>
      </header>
      <SupportHelpCenter publicView={!user} onContact={contact} />
      <section
        aria-labelledby="contact-information-title"
        className="space-y-5 border-t border-evo-border pt-7"
      >
        <h2 id="contact-information-title" className="text-xl font-semibold">
          Como falar com a Escola do Dividendo
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="min-w-0 border-l-2 border-evo-border pl-5">
            <h3 className="inline-flex items-center gap-2 text-sm font-semibold">
              <MessageCircle
                size={17}
                className="text-evo-accent"
                aria-hidden="true"
              />
              Conversas da sua conta
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-evo-textSec">
              Suas mensagens ficam registradas em um atendimento privado. Você
              pode continuar o assunto e consultar as respostas quando precisar.
            </p>
            <button
              type="button"
              onClick={() => contact()}
              className="mt-3 min-h-11 text-sm text-evo-accent underline underline-offset-4"
            >
              {user ? "Acompanhar atendimento" : "Entrar para acompanhar"}
            </button>
          </div>
          <div className="min-w-0 border-l-2 border-evo-border pl-5">
            <h3 className="inline-flex items-center gap-2 text-sm font-semibold">
              <Clock3
                size={17}
                className="text-evo-accent"
                aria-hidden="true"
              />
              Disponibilidade de resposta
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-evo-textSec">
              {info?.hours ||
                "Envie suas perguntas a qualquer hora. As respostas seguem a disponibilidade da equipe; o horário de atendimento ainda será informado."}
            </p>
          </div>
          {info?.email && (
            <div className="min-w-0 border-l-2 border-evo-border pl-5">
              <h3 className="inline-flex items-center gap-2 text-sm font-semibold">
                <Mail
                  size={17}
                  className="text-evo-accent"
                  aria-hidden="true"
                />
                Contato público
              </h3>
              <a
                className="mt-3 inline-flex min-h-11 break-all text-sm text-evo-accent underline"
                href={"mailto:" + info.email}
              >
                {info.email}
              </a>
            </div>
          )}
          {info?.professionalName && (
            <div className="min-w-0 border-l-2 border-evo-border pl-5">
              <h3 className="text-sm font-semibold">
                Responsável pelo atendimento
              </h3>
              <p className="mt-3 break-words text-sm">
                {info.professionalName}
              </p>
              {info.category && (
                <p className="mt-1 text-xs text-evo-textSec">{info.category}</p>
              )}
              {info.registration && (
                <p className="mt-1 text-xs text-evo-textSec">
                  Registro: {info.registration}
                </p>
              )}
            </div>
          )}
        </div>
        {loading && (
          <p role="status" className="text-xs text-evo-textSec">
            Carregando informações de contato…
          </p>
        )}
        {error && (
          <p role="status" className="notice-error">
            {error} As respostas rápidas continuam disponíveis acima.
          </p>
        )}
      </section>
    </section>
  );
}
export function Privacidade() {
  return (
    <section className="mx-auto max-w-4xl space-y-8 px-5 py-12">
      <header>
        <p className="text-sm text-evo-accent">
          Transparência · versão de 17/10/2026
        </p>
        <h1 className="mt-2 text-3xl font-bold">
          Privacidade e uso da plataforma
        </h1>
      </header>
      {[
        [
          "O que a Escola do Dividendo oferece",
          "A Escola do Dividendo oferece pesquisas de ações e educação sobre dividendos. Você pode ler cenários por empresa, estudar indicadores, consultar cotações e acompanhar sua formação.",
        ],
        [
          "Dados da sua conta",
          "Guardamos nome, e-mail, senha com hash, sessões, progresso educativo, preferências e conversas enviadas à equipe. Dados de recursos usados em versões anteriores permanecem sujeitos à exportação e à exclusão da conta. Usamos os dados para autenticar e oferecer as funções que você solicita. Não pedimos senha da corretora ou dados bancários.",
        ],
        [
          "Fornecedores e transmissão",
          "O aplicativo é hospedado na Vercel e usa MySQL gerenciado para os dados. E-mails de confirmação e recuperação passam pelo serviço transacional configurado. Consultas de mercado enviam tickers ao provedor de cotações. Estes fornecedores podem tratar dados fora do Brasil conforme seus serviços.",
        ],
        ...(assistantEnabled
          ? [
              [
                "Assistente educativo experimental",
                "Disponível neste ambiente de avaliação. Após sua confirmação no chat, a pergunta e o histórico recente são enviados ao Google Gemini. No plano gratuito, o conteúdo pode ser usado para melhorar serviços e passar por revisão humana. A Escola do Dividendo não envia automaticamente sua carteira ou perfil e não grava esse histórico no banco. Respostas podem conter erros; confira fontes oficiais. A opção local processa perguntas apenas no navegador.",
              ],
            ]
          : []),
        [
          "Compartilhamento com a equipe",
          "As mensagens que você envia são acessíveis à equipe autorizada de atendimento e continuam no histórico até a exclusão da conta. Compartilhamentos autorizados em versões anteriores podem ser revogados na própria conversa. Não envie senhas ou dados desnecessários.",
        ],
        [
          "Controle dos dados",
          "Nas configurações você pode exportar seus registros, alterar a senha, encerrar sessões e excluir a conta. O cookie de sessão mantém o login neste navegador por até 90 dias, com expiração no servidor após 30 dias sem uso. Você pode sair pelo menu da conta a qualquer momento. O progresso das aulas fica na sua conta após o login; o progresso de visitante fica neste navegador. Você pode reiniciá-lo na página Aprender. Não é usado para publicidade.",
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
      <section id="estatisticas" className="scroll-mt-28">
        <h2 className="text-lg font-semibold">
          Estatísticas opcionais e cookies
        </h2>
        <p className="mt-2 text-sm leading-7 text-evo-textSec">
          Quando configurado, o Google Analytics 4 ajuda a entender quais
          páginas são mais usadas. A ferramenta só é carregada após você
          permitir estatísticas. Recusar mantém o acesso ao site e à conta. A
          escolha fica neste navegador por até seis meses e pode ser alterada
          abaixo.
        </p>
        <p className="mt-2 text-sm leading-7 text-evo-textSec">
          Com a permissão, o Google pode tratar identificadores de cookies,
          páginas acessadas e informações técnicas de navegação, inclusive fora
          do Brasil. Não enviamos nome, e-mail, senha, mensagens, dados da
          conta, buscas ou tokens. Endereços são reduzidos a rotas conhecidas,
          sem parâmetros ou fragmentos. Páginas de autenticação, perfil,
          configurações, suporte e administração ficam fora da medição.
          Publicidade, sinais do Google e personalização de anúncios ficam
          desativados nesta integração.
        </p>
        <p className="mt-2 text-sm leading-7 text-evo-textSec">
          Os cookies necessários mantêm autenticação e proteção contra abuso. O
          armazenamento local também guarda aparência, introdução, progresso de
          visitante e suas preferências de cookies. Ao retirar a permissão de
          estatísticas, bloqueamos novos envios e removemos os cookies de
          Analytics acessíveis neste domínio; a retirada não apaga
          automaticamente dados já enviados ao Google.
        </p>
        <button
          type="button"
          className="action-secondary mt-4"
          onClick={openPrivacyPreferences}
        >
          Alterar preferências de cookies
        </button>
        <a
          href="https://policies.google.com/technologies/partner-sites?hl=pt-BR"
          target="_blank"
          rel="noreferrer"
          className="mt-3 block min-h-11 text-sm text-evo-accent underline"
        >
          Como o Google usa dados de sites parceiros
        </a>
      </section>
      <Link className="action" to="/suporte">
        Contato e suporte
      </Link>
    </section>
  );
}
