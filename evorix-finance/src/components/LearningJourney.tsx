import { ArrowRight, BookOpen, CheckCircle2, LockKeyhole } from "lucide-react";

type JourneyLesson = { id: string; title: string; locked?: boolean };

export function LearningJourney({
  lessons,
  completed,
  isAuthenticated,
  onSelect,
}: {
  lessons: JourneyLesson[];
  completed: string[];
  isAuthenticated: boolean;
  onSelect: (id: string) => void;
}) {
  const finished = lessons.filter((lesson) => completed.includes(lesson.id)).length;
  const nextLesson =
    lessons.find((lesson) => !lesson.locked && !completed.includes(lesson.id)) ??
    lessons.find((lesson) => !completed.includes(lesson.id));
  const allFinished = lessons.length > 0 && finished === lessons.length;
  const destination = nextLesson ?? lessons[0];
  if (!destination) return null;

  return (
    <section
      aria-labelledby="learning-journey-title"
      className="grid gap-5 border-y border-evo-border bg-evo-card/30 px-5 py-6 sm:px-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
    >
      <div>
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-evo-accent">
          {allFinished ? <CheckCircle2 size={16} aria-hidden="true" /> : <BookOpen size={16} aria-hidden="true" />}
          Seu percurso
        </p>
        <h2 id="learning-journey-title" className="mt-3 text-xl font-semibold">
          {allFinished
            ? "Fundamentos concluídos. Continue revisando."
            : finished > 0
              ? "Continue de onde sua trilha parou"
              : "Comece pela leitura de uma pesquisa"}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-evo-textSec">
          {allFinished
            ? "Você acertou os exercícios de todas as aulas disponíveis. Revisite os conceitos ou pratique no laboratório abaixo."
            : `Próxima etapa: ${destination.title}. Cada exercício respondido corretamente registra uma aula concluída.`}
        </p>
        <p className="mt-3 text-xs leading-5 text-evo-textSec">
          {finished} de {lessons.length} exercícios concluídos · {isAuthenticated ? "salvos na sua conta" : "salvos neste navegador"}
          {destination.locked && !allFinished && (
            <span className="ml-2 inline-flex items-center gap-1">
              <LockKeyhole size={12} aria-hidden="true" /> Próxima aula com conta gratuita
            </span>
          )}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onSelect(destination.id)}
        className="action justify-center md:max-w-56"
      >
        {allFinished ? "Revisar a trilha" : finished > 0 ? "Continuar estudando" : "Começar primeira aula"}
        <ArrowRight size={17} aria-hidden="true" />
      </button>
    </section>
  );
}
