import { ArrowRight, BookOpen, FileText, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/authContext";
import { useSupportInformation } from "../hooks/useSupportInformation";
import { PageState } from "../components/PageState";

const publishingSteps = [
  [
    "Editar ou importar",
    "A equipe escreve a pesquisa no editor ou importa uma planilha com os dados da empresa.",
  ],
  [
    "Organizar os dados",
    "Tese, indicadores, riscos e fontes de cada empresa ficam juntos no mesmo registro, com as mesmas regras de conferência da importação.",
  ],
  [
    "Conferir a prévia",
    "Antes de publicar, confira a prévia. Qualquer mudança de conteúdo ou de autoria exige uma nova prévia.",
  ],
  [
    "Publicar",
    "Cada publicação gera uma versão própria e preserva as anteriores. Salvar um rascunho não publica nada.",
  ],
];

const readingSteps = [
  [
    "Comece pelo negócio",
    "Entenda o setor, a posição da empresa e as barreiras que a protegem. O ranking leva à pesquisa de cada empresa.",
  ],
  [
    "Confira as premissas",
    "Leia o potencial e o horizonte informados junto das premissas da publicação, sem tomá-los como promessa.",
  ],
  [
    "Entenda a margem de segurança",
    "A margem é (preço-teto − cotação) ÷ preço-teto. O preço-teto usa a premissa de 6,81% de yield. Margem positiva indica cotação abaixo do preço-teto.",
  ],
  [
    "Leia os indicadores com cautela",
    "O DY da pesquisa é o dividendo projetado por ação dividido pelo preço da pesquisa. O P/L projetado é o preço dividido pelo lucro esperado por ação. Um DY alto, sozinho, não indica uma boa escolha: pode vir de uma queda de preço ou de um pagamento que não se repete.",
  ],
  [
    "Investigue os riscos",
    "Identifique os fatores que podem contrariar a tese e as informações que ainda estão pendentes.",
  ],
  [
    "Confira período, fontes e versão",
    "Consulte as datas e fontes da pesquisa. Use o histórico para comparar as versões publicadas em cada data.",
  ],
];

export function Metodologia() {
  const { user } = useAuth();
  const { info, loading, error, retry } = useSupportInformation();
  const contactRows = [
    ["Responsável", info?.professionalName],
    [
      "Categoria e registro",
      [info?.category, info?.registration].filter(Boolean).join(" · "),
    ],
    ["Contato público", info?.email],
    ["Horário de atendimento", info?.hours],
  ].filter((row): row is [string, string] => Boolean(row[1]));

  return (
    <article className="mx-auto max-w-6xl space-y-10 px-5 py-9 sm:px-8 md:py-14">
      <header className="pb-8">
        <p className="text-xs font-semibold uppercase tracking-[.18em] text-evo-accent">
          Pesquisa e transparência
        </p>
        <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl">
          Conheça o caminho
          <br />
          por trás da pesquisa.
        </h1>
        <p className="mt-5 max-w-2xl text-sm leading-7 text-evo-textSec">
          A Escola do Dividendo reúne pesquisas de ações e conteúdo sobre
          dividendos. Aqui você entende como as publicações são feitas, o que
          procurar nelas e como acompanhar suas versões.
        </p>
      </header>
      <section aria-labelledby="research-flow-title">
        <h2 id="research-flow-title" className="text-2xl font-semibold">
          Da pesquisa à publicação
        </h2>
        <ol className="mt-6 grid list-decimal gap-5 pl-6 marker:font-semibold marker:text-evo-accent sm:grid-cols-2 lg:grid-cols-4">
          {publishingSteps.map(([title, text]) => (
            <li key={title} className="border-t-2 border-evo-accent/45 pt-5">
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-evo-textSec">{text}</p>
            </li>
          ))}
        </ol>
      </section>
      <section
        aria-labelledby="philosophy-title"
        className="pt-8"
      >
        <h2 id="philosophy-title" className="text-2xl font-semibold">
          O que a escola procura
        </h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-evo-textSec">
          A escola estuda empresas pagadoras de dividendos que liderem seus
          setores e tenham barreiras de entrada, com posição competitiva sólida
          e histórico de distribuição. Dá preferência a negócios relevantes para
          a economia brasileira e a proventos consistentes, sem depender de
          eventos extraordinários. Bancos, seguros, saneamento e energia
          elétrica estão entre os setores prioritários.
        </p>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-evo-textSec">
          O centro da análise é a evolução do negócio, não a oscilação diária da
          cotação. Dividendos e resultados futuros não são garantidos, as
          políticas podem mudar, e a análise considera os riscos e o preço pago.
        </p>
      </section>
      <section
        aria-labelledby="reading-guide-title"
        className="pt-8"
      >
        <h2 id="reading-guide-title" className="text-2xl font-semibold">
          Um roteiro para ler com contexto
        </h2>
        <dl className="mt-5 divide-y divide-evo-border">
          {readingSteps.map(([title, text]) => (
            <div key={title} className="py-5">
              <dt className="font-semibold">{title}</dt>
              <dd className="mt-2 max-w-3xl text-sm leading-7 text-evo-textSec">
                {text}
              </dd>
            </div>
          ))}
        </dl>
      </section>
      <section
        aria-labelledby="methods-title"
        className="pt-8"
      >
        <h2 id="methods-title" className="text-2xl font-semibold">
          Critérios, autoria e fontes
        </h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-evo-textSec">
          O ranking exibe os cenários e a ordem informados pelo responsável pela
          publicação. Consulte os métodos de cálculo, as premissas e as fontes
          na pesquisa correspondente. Confira a data de referência de cada
          informação antes de comparar os cenários.
        </p>
        {loading ? (
          <p role="status" className="mt-5 text-sm text-evo-textSec">
            Carregando informações da equipe…
          </p>
        ) : error ? (
          <div className="mt-5">
            <PageState
              kind="error"
              title="As informações da equipe não puderam ser carregadas"
              description={error}
              onAction={retry}
              actionLabel="Tentar novamente"
            />
          </div>
        ) : contactRows.length > 0 ? (
          <dl className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2">
            {contactRows.map(([label, value]) => (
              <div key={label} className="border-b border-evo-border pb-4">
                <dt className="text-xs text-evo-textSec">{label}</dt>
                <dd className="mt-2 break-words text-sm">{value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-5 max-w-3xl text-sm leading-7 text-evo-textSec">
            O responsável e o contato público ainda não foram informados aqui.
            Para tirar dúvidas, use a{" "}
            <Link className="text-evo-accent underline" to="/suporte">
              central de ajuda
            </Link>
            .
          </p>
        )}
        {info?.email && (
          <a
            className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm text-evo-accent underline"
            href={"mailto:" + info.email}
          >
            <Mail size={16} aria-hidden="true" /> Falar com a equipe
          </a>
        )}
      </section>
      <footer className="flex flex-wrap gap-3 pt-7">
        <Link className="action" to={user ? "/app/ranking" : "/ranking"}>
          <FileText size={16} aria-hidden="true" /> Explorar a pesquisa{" "}
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
        <Link
          className="action-secondary"
          to={user ? "/app/aprender" : "/aprender"}
        >
          <BookOpen size={16} aria-hidden="true" /> Aprender a interpretar
        </Link>
        <Link className="action-secondary" to="/suporte">
          Dúvidas e suporte
        </Link>
      </footer>
    </article>
  );
}
