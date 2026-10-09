import { useState } from "react";
import { Calculator } from "lucide-react";

const exercises = {
  yield: {
    title: "Dividend yield",
    description:
      "Relacione o provento por ação de um período ao preço de referência.",
    firstLabel: "Proventos por ação no período (R$)",
    secondLabel: "Preço de referência (R$)",
    firstValue: "2",
    secondValue: "40",
    formula: "(Proventos por ação ÷ preço de referência) × 100",
    resultLabel: "DY do exemplo",
    note: "Período do exemplo: 12 meses. Um DY histórico não promete o mesmo pagamento no futuro.",
  },
  payout: {
    title: "Payout",
    description: "Compare a distribuição com o lucro líquido do mesmo período.",
    firstLabel: "Valor distribuído (R$ milhões)",
    secondLabel: "Lucro líquido (R$ milhões)",
    firstValue: "50",
    secondValue: "100",
    formula: "(Valor distribuído ÷ lucro líquido) × 100",
    resultLabel: "Payout do exemplo",
    note: "Uma leitura simplificada. Com lucro zero ou negativo, a divisão não é uma referência útil. Valores acima de 100% precisam de contexto.",
  },
  potential: {
    title: "Potencial de preço",
    description:
      "Veja a diferença entre um preço no cenário e a referência da análise.",
    firstLabel: "Preço no cenário (R$)",
    secondLabel: "Preço de referência (R$)",
    firstValue: "120",
    secondValue: "100",
    formula: "(Preço no cenário ÷ preço de referência − 1) × 100",
    resultLabel: "Variação hipotética",
    note: "Não inclui dividendos, custos ou impostos e não estima a probabilidade de o cenário acontecer.",
  },
};
type ExerciseId = keyof typeof exercises;

export function LearningPractice() {
  const [mode, setMode] = useState<ExerciseId>("yield");
  const [values, setValues] = useState(() =>
    Object.fromEntries(
      Object.entries(exercises).map(([id, exercise]) => [
        id,
        { first: exercise.firstValue, second: exercise.secondValue },
      ]),
    ),
  );
  const exercise = exercises[mode];
  const inputs = values[mode];
  const numerator = Number(inputs.first);
  const denominator = Number(inputs.second);
  const calculated =
    (numerator / denominator - (mode === "potential" ? 1 : 0)) * 100;
  const result =
    inputs.first.trim() &&
    inputs.second.trim() &&
    Number.isFinite(numerator) &&
    Number.isFinite(denominator) &&
    numerator >= (mode === "potential" ? 0.01 : 0) &&
    denominator > 0 &&
    Number.isFinite(calculated)
      ? calculated
      : null;
  function setInput(name: "first" | "second", value: string) {
    setValues((current) => ({
      ...current,
      [mode]: { ...current[mode], [name]: value },
    }));
  }
  return (
    <section
      id="laboratorio"
      className="scroll-mt-24 border-y border-evo-border py-7"
      aria-labelledby="learning-lab-title"
    >
      <div className="flex items-center gap-2 text-evo-accent">
        <Calculator size={18} aria-hidden="true" />
        <p className="text-xs font-semibold uppercase tracking-[0.14em]">
          Laboratório de conceitos
        </p>
      </div>
      <h2 id="learning-lab-title" className="mt-3 text-2xl font-semibold">
        Aprenda mudando os números
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-evo-textSec">
        Experimente fórmulas com valores fictícios. Esta atividade não consulta
        cotações nem faz uma previsão de investimento.
      </p>
      <div
        className="mt-5 flex flex-wrap gap-2"
        role="group"
        aria-label="Escolher fórmula educativa"
      >
        {(Object.keys(exercises) as ExerciseId[]).map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={mode === id}
            onClick={() => setMode(id)}
            className={
              "min-h-11 border px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-evo-accent " +
              (mode === id
                ? "border-evo-accent text-evo-accent"
                : "border-evo-border text-evo-textSec")
            }
          >
            {exercises[id].title}
          </button>
        ))}
      </div>
      <p className="mt-5 text-sm text-evo-textSec">{exercise.description}</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm">
          {exercise.firstLabel}
          <input
            className="field mt-2"
            type="number"
            min={mode === "potential" ? "0.01" : "0"}
            step="0.01"
            value={inputs.first}
            onChange={(event) => setInput("first", event.target.value)}
          />
        </label>
        <label className="text-sm">
          {exercise.secondLabel}
          <input
            className="field mt-2"
            type="number"
            min="0.01"
            step="0.01"
            value={inputs.second}
            onChange={(event) => setInput("second", event.target.value)}
          />
        </label>
      </div>
      <output className="mt-5 block font-numbers text-xl" aria-live="polite">
        {result === null
          ? "Informe valores válidos e uma base maior que zero."
          : exercise.resultLabel +
            ": " +
            result.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) +
            "%"}
      </output>
      <p className="mt-3 text-xs leading-relaxed text-evo-textSec">
        Fórmula: {exercise.formula}. {exercise.note}
      </p>
    </section>
  );
}
