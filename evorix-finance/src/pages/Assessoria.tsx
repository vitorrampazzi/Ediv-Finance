import {
  ArrowRight,
  BookOpenCheck,
  CalendarClock,
  CircleCheck,
  Clock3,
  MessageCircle,
  ShieldCheck,
  Target,
  TrendingUp,
  UserRoundCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "../components/Card";

const benefits = [
  {
    icon: MessageCircle,
    title: "Envie perguntas a qualquer hora",
    description:
      "Você pode escrever 24 horas por dia. As respostas humanas chegam em horário comercial; o prazo e a janela de atendimento serão informados antes da contratação.",
  },
  {
    icon: TrendingUp,
    title: "Orientações sobre sua carteira",
    description:
      "Converse sobre os ativos e objetivos que cadastrou e receba explicações contextualizadas, dentro da atividade e das credenciais do profissional.",
  },
  {
    icon: Target,
    title: "Acompanhamento dos objetivos",
    description:
      "Organize metas, prazos e prioridades financeiras e acompanhe sua evolução ao longo do tempo.",
  },
  {
    icon: BookOpenCheck,
    title: "Conteúdo que ajuda a decidir",
    description:
      "Materiais educativos e explicações em linguagem simples, conectados às dúvidas que aparecem no seu dia a dia.",
  },
  {
    icon: CalendarClock,
    title: "Encontro educativo periódico",
    description:
      "Espaço para aprender sobre investimentos e fazer perguntas em grupo, com calendário publicado no plano.",
  },
  {
    icon: CircleCheck,
    title: "Resumo depois de cada conversa",
    description:
      "Um registro dos pontos discutidos e das tarefas combinadas para você retomar quando precisar.",
  },
];

const readiness = [
  "Identificação, categoria profissional, credenciais e vínculo institucional",
  "Horários comerciais e prazo máximo de resposta",
  "Preço, cobrança, renovação e regras de cancelamento",
  "Como os dados da carteira serão acessados e protegidos",
];

export const Assessoria = () => (
  <section
    id="pagina-conteudo"
    className="mx-auto max-w-7xl space-y-8 px-5 py-6 md:px-8 md:py-10"
  >
    <section className="relative overflow-hidden rounded-2xl border border-evo-border bg-evo-card p-6 md:p-10">
      <div
        className="absolute -right-12 -top-16 h-64 w-64 rounded-full bg-evo-accent/10 blur-3xl"
        aria-hidden="true"
      />
      <div className="relative z-10 grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-yellow-500/20 bg-yellow-500/10 px-3 py-1 text-xs font-medium text-yellow-300">
            <Clock3 size={14} aria-hidden="true" /> Pré-lançamento · R$
            29,90/mês
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-evo-textMain md:text-4xl">
            Acompanhamento financeiro com conversa humana
          </h2>
          <p className="mt-4 max-w-2xl leading-relaxed text-evo-textSec">
            A proposta é combinar orientação acessível, acompanhamento da
            carteira e respostas claras para suas dúvidas. Você pode enviar uma
            mensagem a qualquer hora; o atendimento humano acontece em horário
            comercial.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="#beneficios"
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-evo-primary px-4 font-semibold text-white hover:bg-evo-primaryHover"
            >
              Ver benefícios <ArrowRight size={16} aria-hidden="true" />
            </a>
            <Link to="/suporte" className="action">
              Contato e atendimento
            </Link>
            <span className="inline-flex min-h-11 items-center rounded-lg border border-evo-border px-4 text-sm text-evo-textSec">
              Assinatura ainda não disponível
            </span>
          </div>
        </div>
        <div
          className="hidden h-36 w-36 items-center justify-center rounded-full border border-evo-accent/20 bg-evo-accent/5 text-evo-accent md:flex"
          aria-hidden="true"
        >
          <UserRoundCheck size={64} strokeWidth={1.2} />
        </div>
      </div>
    </section>

    <section
      id="beneficios"
      aria-labelledby="benefits-title"
      className="scroll-mt-6 space-y-4"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[.18em] text-evo-accent">
          O que estamos planejando
        </p>
        <h3
          id="benefits-title"
          className="mt-2 text-xl font-bold text-evo-textMain"
        >
          Benefícios para acompanhar suas finanças
        </h3>
        <p className="mt-1 text-sm text-evo-textSec">
          A disponibilidade de cada item será confirmada na oferta final do
          plano.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {benefits.map(({ icon: Icon, title, description }) => (
          <Card key={title} className="flex flex-col gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-evo-accent/10 text-evo-accent">
              <Icon size={20} aria-hidden="true" />
            </span>
            <h4 className="font-semibold text-evo-textMain">{title}</h4>
            <p className="text-sm leading-relaxed text-evo-textSec">
              {description}
            </p>
          </Card>
        ))}
      </div>
    </section>

    <section className="grid gap-5 lg:grid-cols-[1fr_.9fr]">
      <Card glow="blue" className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.18em] text-evo-accent">
            Assinatura Ediv
          </p>
          <h3 className="mt-2 text-xl font-bold">
            Acompanhamento por R$ 29,90 ao mês
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-evo-textSec">
            A proposta reúne canal de dúvidas, acompanhamento educativo da
            carteira e encontros temáticos. Os limites de cada benefício serão
            informados junto às condições finais.
          </p>
        </div>
        <div className="rounded-xl border border-evo-border bg-evo-bgMain p-4">
          <p className="text-sm font-medium text-evo-textMain">
            Mensalidade proposta
          </p>
          <p className="mt-1 font-numbers text-3xl font-bold text-evo-textMain">
            R$ 29,90
            <span className="ml-1 text-sm font-normal text-evo-textSec">
              /mês
            </span>
          </p>
          <p className="mt-2 text-xs leading-relaxed text-evo-textSec">
            Valor informado para o plano. Nenhuma cobrança será feita nesta
            página; a assinatura ainda não está à venda.
          </p>
        </div>
        <p className="text-xs leading-relaxed text-evo-textSec">
          Antes de contratar, você verá o preço final, renovação, cancelamento,
          horários, tempo de resposta, limites de uso e os benefícios incluídos.
        </p>
      </Card>

      <Card glow="none" className="space-y-4">
        <div>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-evo-green/10 text-evo-green">
            <ShieldCheck size={20} aria-hidden="true" />
          </span>
          <h3 className="mt-3 text-lg font-semibold">
            Transparência antes da contratação
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-evo-textSec">
            Vamos publicar estes detalhes e as credenciais profissionais antes
            de oferecer o serviço.
          </p>
        </div>
        <ul className="space-y-3">
          {readiness.map((item) => (
            <li
              key={item}
              className="flex items-start gap-2 text-sm text-evo-textSec"
            >
              <CircleCheck
                size={16}
                className="mt-0.5 shrink-0 text-evo-green"
                aria-hidden="true"
              />
              {item}
            </li>
          ))}
        </ul>
      </Card>
    </section>

    <section className="rounded-xl border border-evo-border bg-evo-bgSec p-5 md:p-6">
      <h3 className="font-semibold text-evo-textMain">
        Como funcionam recomendações personalizadas?
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-evo-textSec">
        Recomendações individualizadas sobre valores mobiliários dependem do
        enquadramento e das autorizações aplicáveis à atividade. Registro como
        assessor vinculado a uma instituição não é automaticamente o mesmo que
        autorização para consultoria independente. A identificação, as
        credenciais, o vínculo e os limites de atuação serão apresentados antes
        da contratação. A Ediv Finance não envia ordens nem movimenta
        investimentos.
      </p>
    </section>
  </section>
);
