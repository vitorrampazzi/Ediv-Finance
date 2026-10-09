import { CheckCircle2, RotateCcw } from "lucide-react";

type QuizLesson = {
  question?: string;
  choices?: string[];
  answer?: number;
  explanation?: string;
};

export function LearningQuiz({
  lesson,
  selectedAnswer,
  completed,
  busy,
  disabled,
  authenticated,
  error,
  onAnswer,
}: {
  lesson: QuizLesson;
  selectedAnswer?: number;
  completed: boolean;
  busy: boolean;
  disabled: boolean;
  authenticated: boolean;
  error?: string;
  onAnswer: (answer: number) => void;
}) {
  return (
    <fieldset className="border-y border-evo-border px-0 py-5">
      <legend className="pr-3 font-semibold">Confira o que aprendeu</legend>
      <p className="mb-4 text-sm leading-relaxed">{lesson.question}</p>
      <p className="mb-4 text-xs leading-relaxed text-evo-textSec">
        Responder corretamente conclui esta aula na trilha. Assistir ao vídeo
        não marca o exercício automaticamente.
      </p>
      <div className="grid gap-2">
        {(lesson.choices || []).map((choice, index) => (
          <button
            key={choice}
            type="button"
            disabled={busy || disabled}
            aria-pressed={selectedAnswer === index}
            className={
              "min-h-11 border p-3 text-left text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-evo-accent disabled:cursor-wait disabled:opacity-60 " +
              (selectedAnswer === index
                ? "border-evo-accent bg-evo-accent/10"
                : "border-evo-border hover:bg-white/5")
            }
            onClick={() => onAnswer(index)}
          >
            {choice}
          </button>
        ))}
      </div>
      {selectedAnswer !== undefined && (
        <p
          role="status"
          className="mt-4 border-l-2 border-evo-accent pl-4 text-sm leading-relaxed"
        >
          {selectedAnswer === lesson.answer ? "Correto! " : "Vamos revisar: "}
          {lesson.explanation}
        </p>
      )}
      {busy && (
        <p role="status" className="mt-3 text-xs text-evo-textSec">
          Salvando progresso…
        </p>
      )}
      {completed && (
        <p
          role="status"
          className="mt-4 flex items-center gap-2 text-sm text-evo-accent"
        >
          <CheckCircle2 size={16} aria-hidden="true" /> Exercício concluído e
          progresso {authenticated ? "salvo na sua conta" : "salvo neste navegador"}.
        </p>
      )}
      {error && (
        <div className="notice-error mt-4 space-y-3">
          <p role="alert">
            {error} Sua resposta está nesta tela, mas a conclusão ainda não foi salva.
          </p>
          <button
            type="button"
            className="action-secondary"
            disabled={busy || disabled || selectedAnswer === undefined}
            onClick={() => {
              if (selectedAnswer !== undefined) onAnswer(selectedAnswer);
            }}
          >
            <RotateCcw size={15} aria-hidden="true" /> Tentar salvar novamente
          </button>
        </div>
      )}
    </fieldset>
  );
}
