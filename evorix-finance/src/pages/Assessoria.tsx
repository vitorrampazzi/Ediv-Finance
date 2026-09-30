import { CalendarClock, MessageCircle, ShieldCheck } from 'lucide-react';
import { Card } from '../components/Card';
import { OrbitCoins } from '../components/OrbitCoins';

const serviceSteps = [
  { icon: MessageCircle, title: 'Conversa inicial', description: 'Conhecer objetivos, horizonte e dúvidas antes de discutir qualquer estratégia.' },
  { icon: ShieldCheck, title: 'Análise adequada ao perfil', description: 'Considerar tolerância a risco, situação financeira e necessidades individuais.' },
  { icon: CalendarClock, title: 'Acompanhamento combinado', description: 'Definir frequência de revisão e custos antes de contratar um serviço.' },
];

export const Assessoria = () => (
  <div className="mx-auto max-w-7xl space-y-8">
    <section className="relative overflow-hidden rounded-2xl border border-evo-border bg-evo-card p-6 md:p-10">
      <div className="absolute -right-12 -top-16 h-64 w-64 rounded-full bg-evo-blueMain/10 blur-3xl" aria-hidden="true" />
      <div className="relative z-10 flex flex-col-reverse items-center gap-6 md:flex-row md:justify-between">
        <div className="max-w-2xl">
          <span className="inline-flex rounded-full border border-yellow-500/20 bg-yellow-500/10 px-3 py-1 text-xs font-medium text-yellow-300">Prévia da interface</span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-evo-textMain md:text-4xl">Assessoria financeira</h2>
          <p className="mt-3 max-w-xl leading-relaxed text-evo-textSec">Esta tela apresenta uma ideia de como informações sobre assessoria poderiam ser organizadas. Não há profissionais, credenciais, preços ou agenda disponíveis neste protótipo.</p>
        </div>
        <div aria-hidden="true"><OrbitCoins variant="premium" size="sm" /></div>
      </div>
    </section>

    <section aria-labelledby="expect-title">
      <h3 id="expect-title" className="text-xl font-bold text-evo-textMain">O que avaliar ao buscar assessoria</h3>
      <p className="mt-1 text-sm text-evo-textSec">Exemplos de tópicos informativos; não são uma oferta de serviço.</p>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        {serviceSteps.map(({ icon: Icon, title, description }) => (
          <Card key={title} className="flex flex-col gap-3">
            <Icon size={24} className="text-evo-blueMain" aria-hidden="true" />
            <h4 className="font-bold text-evo-textMain">{title}</h4>
            <p className="text-sm leading-relaxed text-evo-textSec">{description}</p>
          </Card>
        ))}
      </div>
    </section>

    <div role="status" className="rounded-xl border border-evo-border bg-evo-bgSec p-4 text-sm leading-relaxed text-evo-textSec">
      Contratação, contato com assessor e agendamento não estão habilitados. Não informe dados financeiros ou pessoais nesta demonstração.
    </div>
  </div>
);
