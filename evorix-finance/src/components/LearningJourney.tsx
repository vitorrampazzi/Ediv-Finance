import { ArrowRight, BookOpen, CheckCircle2, LockKeyhole } from "lucide-react";
import "./learning-workspace.css";

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
  const finished = lessons.filter((lesson) =>
    completed.includes(lesson.id),
  ).length;
  const nextLesson =
    lessons.find(
      (lesson) => !lesson.locked && !completed.includes(lesson.id),
    ) ?? lessons.find((lesson) => !completed.includes(lesson.id));
  const allFinished = lessons.length > 0 && finished === lessons.length;
  const progress = lessons.length ? (finished / lessons.length) * 100 : 0;
  const destination = nextLesson ?? lessons[0];
  if (!destination) return null;

  return (
    <section
      aria-labelledby="learning-journey-title"
      className="ediv-learning-journey"
    >
      <div className="ediv-learning-journey-copy">
        <p className="ediv-learning-eyebrow">
          {allFinished ? (
            <CheckCircle2 size={16} aria-hidden="true" />
          ) : (
            <BookOpen size={16} aria-hidden="true" />
          )}
          {allFinished ? "Trilha concluída" : "Sua próxima aula"}
        </p>
        <h2
          id="learning-journey-title"
          className="ediv-learning-journey-title"
        >
          {allFinished
            ? "Hora de revisar os fundamentos"
            : destination.title}
        </h2>
        {destination.locked && !allFinished && (
          <p className="ediv-learning-locked-note">
            <LockKeyhole size={13} aria-hidden="true" />
            Disponível com conta gratuita
          </p>
        )}
      </div>
      <div className="ediv-learning-journey-progress">
        <div className="ediv-learning-progress-label">
          <span>Exercícios concluídos</span>
          <strong>{finished}<span> / {lessons.length}</span></strong>
        </div>
        <div
          className="ediv-learning-progress-track"
          role="progressbar"
          aria-label="Exercícios concluídos na trilha"
          aria-valuemin={0}
          aria-valuemax={lessons.length}
          aria-valuenow={finished}
        >
          <span style={{ width: `${progress}%` }} />
        </div>
        <p className="ediv-learning-progress-note">
          {isAuthenticated ? "Progresso salvo na sua conta" : "Progresso salvo neste navegador"}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onSelect(destination.id)}
        className="action ediv-learning-journey-action"
      >
        {allFinished
          ? "Revisar a trilha"
          : finished > 0
            ? "Continuar estudando"
            : "Começar primeira aula"}
        <ArrowRight size={17} aria-hidden="true" />
      </button>
    </section>
  );
}
