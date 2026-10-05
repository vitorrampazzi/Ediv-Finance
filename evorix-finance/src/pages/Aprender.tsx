import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, CheckCircle2, MessageCircle } from "lucide-react";
const lessons = [
  {
    id: "ranking",
    title: "Como interpretar uma previsão",
    text: "Uma previsão descreve um cenário dependente de premissas. Preço-alvo é o preço que o autor estima em um prazo; potencial é uma variação estimada, não a probabilidade de acontecer. Leia tese, riscos, data e horizonte em conjunto. Um ranking organiza opiniões e não determina o que você deve comprar.",
    question: "O que diferencia potencial estimado de probabilidade de lucro?",
    choices: [
      "São a mesma medida",
      "Potencial é uma variação de preço; probabilidade é a chance de um evento",
      "Potencial é lucro já recebido",
    ],
    answer: 1,
    explanation:
      "Uma projeção de 20% não diz que há 20% de chance de lucro. É indispensável entender as premissas e as incertezas.",
  },
  {
    id: "risco",
    title: "Risco, diversificação e prazo",
    text: "O preço de um ativo pode cair e permanecer abaixo do custo de compra. Distribuir investimentos entre exposições diferentes pode reduzir a concentração, mas não elimina perdas. Prazo, liquidez, custos e capacidade de suportar oscilações influenciam uma decisão. Setores diferentes também podem responder ao mesmo risco econômico.",
    question: "Diversificar elimina o risco de perda?",
    choices: [
      "Sim, sempre",
      "Só quando há mais de cinco ativos",
      "Não; pode reduzir concentração, mas não elimina riscos",
    ],
    answer: 2,
    explanation:
      "O número de ativos sozinho não mede diversificação. É necessário entender suas exposições e os riscos compartilhados.",
  },
  {
    id: "dividendos",
    title: "Dividendos e renda",
    text: "Dividendos e juros sobre capital próprio são formas de distribuição de recursos aos acionistas. O valor anunciado e o recebido são informações diferentes. Pagamentos podem variar e não garantem renda constante. Um dividend yield elevado precisa ser entendido no contexto do negócio e do preço; não avalia sozinho a qualidade da empresa.",
    question: "Um pagamento anunciado equivale a dinheiro já recebido?",
    choices: [
      "Não; deve ser acompanhado até o pagamento",
      "Sim, entra imediatamente no saldo",
      "Sim, se o ativo estiver no ranking",
    ],
    answer: 0,
    explanation:
      "No Ediv, eventos anunciados ficam separados dos recebidos. Registre o valor efetivamente recebido, com a data e sua origem.",
  },
  {
    id: "carteira",
    title: "Entendendo os números da carteira",
    text: "Valor de mercado estimado é quantidade registrada multiplicada pela cotação disponível. Custo registrado é a base das operações e custos informados. Resultado não realizado é a diferença entre valor estimado e custo das posições abertas. Resultado realizado considera as vendas. Proventos recebidos são apresentados separadamente. Informações incompletas e eventos corporativos ausentes podem distorcer o acompanhamento.",
    question: "Uma valorização estimada já é lucro recebido?",
    choices: [
      "Sim",
      "Não; o ganho da posição aberta ainda não foi realizado",
      "Somente se a alta passar de 10%",
    ],
    answer: 1,
    explanation:
      "O preço pode mudar antes de uma venda. O valor estimado não é saldo disponível para saque.",
  },
];
const glossary = [
  [
    "Preço-alvo",
    "Estimativa de preço para um horizonte, baseada nas premissas de uma análise.",
  ],
  [
    "Potencial",
    "Variação estimada entre uma referência de preço e um cenário. Não é probabilidade de lucro.",
  ],
  ["Horizonte", "Prazo considerado pela análise."],
  ["Tese", "Argumentos e premissas que sustentam um cenário."],
  [
    "Liquidez",
    "Facilidade de negociar um ativo sem grandes impactos no preço.",
  ],
  [
    "Dividend yield",
    "Relação entre proventos e um preço de referência em determinado período.",
  ],
  [
    "Desdobramento",
    "Alteração da quantidade de ações e do preço unitário, sem criar riqueza por si só.",
  ],
  [
    "JCP",
    "Juros sobre capital próprio, uma modalidade de remuneração ao acionista.",
  ],
];
function readProgress(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem("ediv-learning-v1") || "[]");
    return Array.isArray(value)
      ? value.filter(
          (x) => typeof x === "string" && lessons.some((l) => l.id === x),
        )
      : [];
  } catch {
    return [];
  }
}
export function Aprender() {
  const [completed, setCompleted] = useState<string[]>(readProgress);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [current, setCurrent] = useState("100");
  const [target, setTarget] = useState("120");
  useEffect(() => {
    try {
      localStorage.setItem("ediv-learning-v1", JSON.stringify(completed));
    } catch {
      /* Browser storage may be disabled. */
    }
  }, [completed]);
  const potential =
    Number(current) > 0 && Number(target) > 0
      ? (Number(target) / Number(current) - 1) * 100
      : null;
  return (
    <section
      id="pagina-conteudo"
      className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6"
    >
      <section className="rounded-2xl border border-evo-border bg-evo-card p-6 sm:p-8">
        <BookOpen className="text-evo-accent" />
        <h1 className="mt-4 text-3xl font-bold">Aprender para entender</h1>
        <p className="mt-3 max-w-3xl leading-relaxed text-evo-textSec">
          Uma trilha curta para ler as análises com mais clareza, questionar
          premissas e entender sua carteira. Exemplos educativos não são
          recomendações de investimento.
        </p>
        <p className="mt-4 text-sm text-evo-accent">
          {completed.length} de {lessons.length} etapas concluídas · progresso
          salvo neste navegador
        </p>
        <div
          className="mt-3 h-2 rounded bg-evo-bgMain"
          role="progressbar"
          aria-label="Progresso da trilha"
          aria-valuenow={completed.length}
          aria-valuemin={0}
          aria-valuemax={lessons.length}
        >
          <div
            className="h-full rounded bg-evo-accent"
            style={{ width: (completed.length / lessons.length) * 100 + "%" }}
          />
        </div>
      </section>
      <nav aria-label="Etapas educativas" className="flex flex-wrap gap-2">
        {lessons.map((l) => (
          <a
            key={l.id}
            href={"#" + l.id}
            className="rounded-full border border-evo-border px-3 py-2 text-xs"
          >
            {l.title}
          </a>
        ))}
      </nav>
      {lessons.map((lesson) => (
        <section
          id={lesson.id}
          key={lesson.id}
          className="scroll-mt-24 rounded-xl border border-evo-border bg-evo-card p-5 sm:p-7"
        >
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-xl font-semibold">{lesson.title}</h2>
            {completed.includes(lesson.id) && (
              <CheckCircle2
                aria-label="Etapa concluída"
                className="shrink-0 text-evo-accent"
              />
            )}
          </div>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-evo-textSec">
            {lesson.text}
          </p>
          <fieldset className="mt-5 rounded-lg border border-evo-border p-4">
            <legend className="px-2 text-sm font-semibold">
              {lesson.question}
            </legend>
            <div className="grid gap-2">
              {lesson.choices.map((choice, i) => (
                <button
                  key={choice}
                  type="button"
                  aria-pressed={answers[lesson.id] === i}
                  className={
                    "min-h-11 rounded-lg border p-3 text-left text-sm " +
                    (answers[lesson.id] === i
                      ? "border-evo-accent bg-evo-accent/10"
                      : "border-evo-border hover:bg-white/5")
                  }
                  onClick={() => {
                    setAnswers((a) => ({ ...a, [lesson.id]: i }));
                    if (i === lesson.answer)
                      setCompleted((c) =>
                        c.includes(lesson.id) ? c : [...c, lesson.id],
                      );
                  }}
                >
                  {choice}
                </button>
              ))}
            </div>
            {answers[lesson.id] !== undefined && (
              <p role="status" className="mt-3 text-sm leading-relaxed">
                {answers[lesson.id] === lesson.answer
                  ? "Correto! "
                  : "Vamos revisar: "}
                {lesson.explanation}
              </p>
            )}
          </fieldset>
          <button
            className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm text-evo-accent"
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("ediv-assistant-question", {
                  detail: "Explique de forma educativa: " + lesson.title,
                }),
              )
            }
          >
            <MessageCircle size={16} /> Pedir uma explicação ao assistente
          </button>
        </section>
      ))}
      <section className="rounded-xl border border-evo-border bg-evo-card p-6">
        <h2 className="text-xl font-semibold">Explore um cenário hipotético</h2>
        <p className="mt-2 text-sm text-evo-textSec">
          Compare dois preços para entender a fórmula do potencial. Não usa
          cotações reais nem estima chances de retorno.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            Preço de referência (R$)
            <input
              className="field mt-1"
              type="number"
              min="0.01"
              step="0.01"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </label>
          <label className="text-sm">
            Preço no cenário (R$)
            <input
              className="field mt-1"
              type="number"
              min="0.01"
              step="0.01"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
          </label>
        </div>
        <p className="mt-4 font-numbers">
          {potential === null
            ? "Informe dois preços positivos."
            : "Variação hipotética: " +
              potential.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) +
              "%"}
        </p>
        <p className="mt-2 text-xs text-evo-textSec">
          Fórmula: (preço no cenário ÷ preço de referência − 1) × 100. Não
          inclui custos, impostos ou dividendos.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Glossário</h2>
        <label className="block">
          <span className="sr-only">Buscar um conceito</span>
          <input
            className="field"
            placeholder="Buscar um conceito…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <dl className="grid gap-3 sm:grid-cols-2">
          {glossary
            .filter(([term, text]) =>
              (term + " " + text).toLowerCase().includes(search.toLowerCase()),
            )
            .map(([term, text]) => (
              <div
                key={term}
                className="rounded-xl border border-evo-border bg-evo-card p-4"
              >
                <dt className="font-semibold">{term}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-evo-textSec">
                  {text}
                </dd>
              </div>
            ))}
        </dl>
      </section>
      <div className="flex flex-wrap gap-3">
        <Link to="/ranking" className="action">
          Explorar o ranking
        </Link>
        <button
          className="min-h-11 rounded-lg border border-evo-border px-4 text-sm"
          onClick={() => {
            setCompleted([]);
            setAnswers({});
          }}
        >
          Reiniciar progresso
        </button>
      </div>
      <p className="text-xs leading-relaxed text-evo-textSec">
        Fontes para aprofundar:{" "}
        <a
          href="https://www.gov.br/investidor/pt-br"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          Portal do Investidor — CVM
        </a>{" "}
        e{" "}
        <a
          href="https://borainvestir.b3.com.br/"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          Bora Investir — B3
        </a>
        . Os textos desta trilha são explicações educativas da Ediv.
      </p>
    </section>
  );
}
