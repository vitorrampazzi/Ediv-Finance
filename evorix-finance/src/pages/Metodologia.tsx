import { ArrowRight, BookOpen, FileText, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/authContext";
import { useSupportInformation } from "../hooks/useSupportInformation";
import { PageState } from "../components/PageState";

const readingSteps = [
  [
    "01",
    "Comece pela empresa",
    "Conheça o negócio, o setor e o contexto publicado pela equipe. A posição no ranking é um caminho para abrir a pesquisa de cada empresa.",
  ],
  [
    "02",
    "Leia o cenário e suas premissas",
    "Confira a tese, o preço-alvo, o potencial informado e o horizonte. Relacione esses números às premissas da publicação.",
  ],
  [
    "03",
    "Investigue os riscos",
    "Identifique os fatores que podem contrariar a tese e quais informações ainda precisam ser preenchidas.",
  ],
  [
    "04",
    "Confira período, fontes e versão",
    "Consulte as datas e fontes da pesquisa. Use o histórico para acompanhar publicações anteriores e comparar as mudanças de conteúdo.",
  ],
];

export function Metodologia() {
  const { user } = useAuth();
  const { info, loading, error, retry } = useSupportInformation();
  return (
    <article className="mx-auto max-w-6xl space-y-10 px-5 py-9 sm:px-8 md:py-14">
      <header className="border-b border-evo-border pb-8">
        <p className="text-xs font-semibold uppercase tracking-[.18em] text-evo-accent">
          Pesquisa e transparência
        </p>
        <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl">
          Conheça o caminho
          <br />
          por trás da pesquisa.
        </h1>
        <p className="mt-5 max-w-2xl text-sm leading-7 text-evo-textSec">
          A Ediv reúne pesquisas de ações e conteúdo sobre dividendos. Aqui você
          entende como as publicações são organizadas, quais informações
          procurar e como acompanhar suas versões.
        </p>
      </header>
      <section aria-labelledby="research-flow-title">
        <h2 id="research-flow-title" className="text-2xl font-semibold">
          Da pesquisa à publicação
        </h2>
        <ol className="mt-6 grid gap-5 md:grid-cols-3">
          {[
            [
              "Preparação",
              "A equipe organiza as empresas e os dados em um rascunho ou importa a planilha. Os campos mantêm a tese, os fundamentos, os riscos e as fontes juntos.",
            ],
            [
              "Revisão",
              "O editor e a prévia ajudam a conferir os dados e identificar informações pendentes. A autoria e a metodologia específica devem acompanhar a pesquisa real.",
            ],
            [
              "Publicação e histórico",
              "Cada publicação tem uma versão própria. Atualizações preservam o histórico para que você consulte o cenário que foi publicado naquela data.",
            ],
          ].map(([title, text], index) => (
            <li key={title} className="border-t-2 border-evo-accent/45 pt-5">
              <span className="font-numbers text-xs text-evo-accent">
                0{index + 1}
              </span>
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-evo-textSec">{text}</p>
            </li>
          ))}
        </ol>
      </section>
      <section
        aria-labelledby="reading-guide-title"
        className="border-t border-evo-border pt-8"
      >
        <h2 id="reading-guide-title" className="text-2xl font-semibold">
          Um roteiro para ler com contexto
        </h2>
        <dl className="mt-5 divide-y divide-evo-border">
          {readingSteps.map(([number, title, text]) => (
            <div key={number} className="py-5">
              <dt className="flex items-baseline gap-3 font-semibold">
                <span
                  aria-hidden="true"
                  className="w-9 shrink-0 font-numbers text-lg text-evo-accent"
                >
                  {number}
                </span>
                {title}
              </dt>
              <dd className="mt-2 max-w-3xl text-sm leading-7 text-evo-textSec sm:ml-12">
                {text}
              </dd>
            </div>
          ))}
        </dl>
      </section>
      <section
        aria-labelledby="methods-title"
        className="border-t border-evo-border pt-8"
      >
        <h2 id="methods-title" className="text-2xl font-semibold">
          Critérios, autoria e fontes
        </h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-evo-textSec">
          O ranking exibe os cenários e a ordem informados pelo responsável pela
          publicação. Consulte os métodos de cálculo, as premissas e as fontes
          na pesquisa correspondente. As cotações da brapi complementam a
          consulta aos dados de mercado.
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
        ) : (
          <dl className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2">
            {[
              [
                "Responsável",
                info?.professionalName ||
                  "Identificação profissional em preparação",
              ],
              [
                "Categoria e registro",
                [info?.category, info?.registration]
                  .filter(Boolean)
                  .join(" · ") || "A equipe ainda não publicou estes dados",
              ],
              [
                "Contato público",
                info?.email || "Contato em preparação; use a central de ajuda",
              ],
              [
                "Disponibilidade de resposta",
                info?.hours || "Horário de atendimento ainda não informado",
              ],
            ].map(([label, value]) => (
              <div key={label} className="border-b border-evo-border pb-4">
                <dt className="text-xs text-evo-textSec">{label}</dt>
                <dd className="mt-2 break-words text-sm">{value}</dd>
              </div>
            ))}
          </dl>
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
      <footer className="flex flex-wrap gap-3 border-t border-evo-border pt-7">
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
