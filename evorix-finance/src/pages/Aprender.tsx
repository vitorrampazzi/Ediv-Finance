import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  BookOpen,
  CheckCircle2,
  MessageCircle,
  LockKeyhole,
  ArrowDown,
  ArrowRight,
  Clock3,
} from "lucide-react";
import { apiRequest } from "../lib/api";
import { useAuth } from "../context/authContext";
import { AccountGate } from "../components/AccountGate";
import { OrbitCoins } from "../components/OrbitCoins";
import { assistantEnabled } from "../lib/features";
import { LearningVideo } from "../components/LearningVideo";
import { LearningPractice } from "../components/LearningPractice";
import { learningChapters, learningCourses } from "../lib/learningCatalog";

type Lesson = {
  id: string;
  title: string;
  locked?: boolean;
  text?: string;
  question?: string;
  choices?: string[];
  answer?: number;
  explanation?: string;
  sections?: { title: string; text: string }[];
  takeaways?: string[];
  sources?: { title: string; url: string }[];
};
export type LearningData = {
  lessons: Lesson[];
  glossary: string[][];
  access: "preview" | "full";
  completed: string[];
};
const lessonIds = ["ranking", "risco", "dividendos", "carteira"];
function readProgress(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem("ediv-learning-v1") || "[]");
    return Array.isArray(value)
      ? value.filter((x) => typeof x === "string" && lessonIds.includes(x))
      : [];
  } catch {
    return [];
  }
}
export function Aprender({
  initialContent,
}: {
  initialContent?: LearningData;
}) {
  const { user } = useAuth();
  return (
    <LearningSession
      key={user?.id || "visitor"}
      initialContent={initialContent}
    />
  );
}
function LearningSession({
  initialContent,
}: {
  initialContent?: LearningData;
}) {
  const { user, loading: authLoading, refreshSession } = useAuth();
  const userId = user?.id;
  const [content, setContent] = useState<LearningData | null>(
    initialContent ?? null,
  );
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const requestKey = userId || "visitor";
  const loading = !content && (loadedFor !== requestKey || authLoading);
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState<string[]>(() =>
    user ? [] : readProgress().filter((id) => id === "ranking"),
  );
  const [progressBusy, setProgressBusy] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const location = useLocation();
  const [selectedId, setSelectedId] = useState(() =>
    lessonIds.includes(location.hash.slice(1))
      ? location.hash.slice(1)
      : "ranking",
  );
  useEffect(() => {
    if (authLoading) return;
    const controller = new AbortController();
    apiRequest<LearningData>("/api/learning", { signal: controller.signal })
      .then(async (data) => {
        if (!controller.signal.aborted) {
          setContent(data);
          setError("");
          if (userId)
            setCompleted(data.completed.filter((id) => lessonIds.includes(id)));
          if (userId && data.access === "preview") await refreshSession();
        }
      })
      .catch((reason) => {
        if (!controller.signal.aborted) {
          setContent(null);
          setError(
            reason instanceof Error
              ? reason.message
              : "Não foi possível carregar as aulas.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadedFor(requestKey);
      });
    return () => controller.abort();
  }, [userId, authLoading, refreshSession, requestKey]);
  const lessons: Lesson[] = (content?.lessons || []).map((lesson, index) =>
    !user && index > 0
      ? { id: lesson.id, title: lesson.title, locked: true }
      : lesson,
  );
  const glossary = content?.glossary || [];
  useEffect(() => {
    if (user) return;
    try {
      localStorage.setItem("ediv-learning-v1", JSON.stringify(completed));
    } catch {
      /* Browser storage may be disabled. */
    }
  }, [completed, user]);
  async function chooseAnswer(lesson: Lesson, answer: number) {
    setAnswers((current) => ({ ...current, [lesson.id]: answer }));
    if (answer !== lesson.answer) return;
    setProgressBusy(true);
    setError("");
    try {
      if (user)
        await apiRequest("/api/learning/progress/" + lesson.id, {
          method: "PUT",
          body: JSON.stringify({ answer }),
        });
      setCompleted((current) =>
        current.includes(lesson.id) ? current : [...current, lesson.id],
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível salvar o progresso.",
      );
    } finally {
      setProgressBusy(false);
    }
  }
  async function resetProgress() {
    setProgressBusy(true);
    setError("");
    try {
      if (user)
        await apiRequest("/api/learning/progress", { method: "DELETE" });
      setCompleted([]);
      setAnswers({});
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Não foi possível reiniciar.",
      );
    } finally {
      setProgressBusy(false);
    }
  }
  const selectedLesson =
    lessons.find((lesson) => lesson.id === selectedId) ?? lessons[0];
  const selectedChapter =
    learningChapters.find((chapter) => chapter.id === selectedId) ??
    learningChapters[0];
  const selectedCourse =
    learningCourses.find((course) =>
      course.chapterIds.some((id) => id === selectedId),
    ) ?? learningCourses[0];
  const selectedIndex = lessons.findIndex(
    (lesson) => lesson.id === selectedLesson?.id,
  );
  const nextLesson = lessons[selectedIndex + 1];
  const matchingTerms = glossary.filter(([term, text]) =>
    (term + " " + text)
      .toLocaleLowerCase("pt-BR")
      .includes(search.toLocaleLowerCase("pt-BR")),
  );
  return (
    <section
      id="pagina-conteudo"
      className="mx-auto max-w-6xl space-y-9 px-4 py-8 sm:px-6"
    >
      <header className="border-b border-evo-border pb-7">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-evo-accent">
              Escola do Dividendo · Aprender
            </p>
            <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
              Entenda o negócio.
              <br />
              Entenda o dividendo.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-evo-textSec">
              Cursos, leituras e exercícios para interpretar a pesquisa do
              corretor e entender como as empresas geram e distribuem
              resultados. Comece pelos fundamentos e avance no seu ritmo.
            </p>
          </div>
          <div className="shrink-0 self-end sm:self-center">
            <OrbitCoins variant="learning" size="hero" />
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-evo-textSec">
            <strong className="text-evo-textMain">
              {completed.length} de {lessonIds.length} aulas concluídas
            </strong>{" "}
            ·{" "}
            {user
              ? "progresso salvo na sua conta"
              : "progresso salvo neste navegador"}
          </p>
          <a
            className="inline-flex min-h-11 items-center gap-2 text-sm text-evo-accent"
            href="#cursos"
          >
            Conhecer os cursos <ArrowDown size={16} aria-hidden="true" />
          </a>
        </div>
        <div
          className="mt-3 h-1 bg-evo-bgMain"
          role="progressbar"
          aria-label="Progresso da trilha"
          aria-valuenow={completed.length}
          aria-valuemin={0}
          aria-valuemax={lessonIds.length}
        >
          <div
            className="h-full bg-evo-accent transition-[width]"
            style={{ width: (completed.length / lessonIds.length) * 100 + "%" }}
          />
        </div>
      </header>
      {(loading || authLoading) && (
        <p role="status" className="text-sm text-evo-textSec">
          Carregando aulas…
        </p>
      )}
      {error && (
        <p role="alert" className="notice-error">
          {error}
        </p>
      )}
      {!user && !loading && content && (
        <p className="text-sm text-evo-textSec">
          A primeira aula e o glossário são abertos. Sua conta gratuita libera
          as outras aulas e salva seu progresso.
        </p>
      )}
      <section
        id="cursos"
        aria-labelledby="courses-title"
        className="scroll-mt-24"
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="courses-title" className="text-2xl font-semibold">
            Trilhas para estudar
          </h2>
          <p className="text-xs text-evo-textSec">
            Leituras disponíveis · vídeos em preparação
          </p>
        </div>
        <div className="mt-5 grid gap-6 md:grid-cols-2">
          {learningCourses.map((course) => {
            const count = course.chapterIds.filter((id) =>
              completed.includes(id),
            ).length;
            const minutes = learningChapters
              .filter((chapter) => course.chapterIds.includes(chapter.id))
              .reduce((sum, chapter) => sum + chapter.readingMinutes, 0);
            return (
              <article
                key={course.id}
                className="flex flex-col border-t-2 border-evo-accent/50 bg-evo-card/25 px-5 py-6 sm:px-6"
              >
                <p className="text-xs uppercase tracking-[0.12em] text-evo-accent">
                  {course.eyebrow}
                </p>
                <h3 className="mt-3 text-xl font-semibold">{course.title}</h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-evo-textSec">
                  {course.description}
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-evo-textSec">
                  <span>{course.chapterIds.length} aulas</span>
                  <span>{minutes} min de leitura estimada</span>
                  <span>
                    {count}/{course.chapterIds.length} concluídas
                  </span>
                </div>
                <a
                  href="#sala-de-aula"
                  onClick={() => setSelectedId(course.chapterIds[0])}
                  className="mt-5 inline-flex min-h-11 items-center gap-2 self-start text-sm font-semibold text-evo-accent"
                >
                  Abrir curso <ArrowRight size={16} aria-hidden="true" />
                </a>
              </article>
            );
          })}
        </div>
      </section>
      {selectedLesson && (
        <section
          id="sala-de-aula"
          className="scroll-mt-24 border-t border-evo-border pt-7"
          aria-labelledby="classroom-title"
        >
          <p className="text-xs uppercase tracking-[0.14em] text-evo-textSec">
            Sala de aula · {selectedCourse.title}
          </p>
          <h2
            id="classroom-title"
            aria-live="polite"
            className="mt-2 text-2xl font-semibold"
          >
            {selectedLesson.title}
          </h2>
          <div className="mt-6 grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_17rem]">
            <div className="order-last min-w-0 lg:order-first">
              {selectedLesson.locked ? (
                <AccountGate
                  title="Entre para estudar esta aula"
                  description="Sua conta gratuita libera a leitura, o exercício e o acompanhamento do progresso."
                  next={location.pathname + "#" + selectedLesson.id}
                />
              ) : (
                <>
                  <LearningVideo
                    key={selectedLesson.id}
                    title={selectedLesson.title}
                    embedUrl={selectedChapter.videoEmbedUrl}
                    readingTarget={"#leitura-" + selectedLesson.id}
                  />
                  <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-evo-textSec">
                    <BookOpen size={15} aria-hidden="true" />
                    <span>Material de leitura disponível</span>
                    <Clock3 size={15} aria-hidden="true" />
                    <span>
                      {selectedChapter.readingMinutes} min de leitura estimada
                    </span>
                    {completed.includes(selectedLesson.id) && (
                      <span className="inline-flex items-center gap-1 text-evo-accent">
                        <CheckCircle2 size={15} aria-hidden="true" /> Aula
                        concluída
                      </span>
                    )}
                  </div>
                  <article
                    id={"leitura-" + selectedLesson.id}
                    className="scroll-mt-24 py-7"
                    aria-labelledby="reading-title"
                  >
                    <h3 id="reading-title" className="text-lg font-semibold">
                      Para entender esta aula
                    </h3>
                    <p className="mt-4 text-sm leading-7 text-evo-textSec">
                      {selectedLesson.text}
                    </p>
                    {selectedLesson.sections?.map((part) => (
                      <section key={part.title} className="mt-6">
                        <h4 className="font-semibold">{part.title}</h4>
                        <p className="mt-2 text-sm leading-7 text-evo-textSec">
                          {part.text}
                        </p>
                      </section>
                    ))}
                    {!!selectedLesson.takeaways?.length && (
                      <aside className="mt-7 border-l-2 border-evo-accent pl-5">
                        <h4 className="font-semibold">
                          Leve estes pontos com você
                        </h4>
                        <ul className="mt-3 list-disc space-y-2 pl-4 text-sm leading-relaxed text-evo-textSec">
                          {selectedLesson.takeaways.map((takeaway) => (
                            <li key={takeaway}>{takeaway}</li>
                          ))}
                        </ul>
                      </aside>
                    )}
                    {!!selectedLesson.sources?.length && (
                      <div className="mt-6 text-xs leading-relaxed text-evo-textSec">
                        <p className="font-semibold">
                          Para aprofundar nas fontes
                        </p>
                        <ul className="mt-2 space-y-2">
                          {selectedLesson.sources.map((source) => (
                            <li key={source.url}>
                              <a
                                className="underline underline-offset-4"
                                href={source.url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {source.title}{" "}
                                <span className="sr-only">
                                  (abre em nova guia)
                                </span>
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </article>
                  <fieldset className="border-y border-evo-border px-0 py-5">
                    <legend className="pr-3 font-semibold">
                      Confira o que aprendeu
                    </legend>
                    <p className="mb-4 text-sm leading-relaxed">
                      {selectedLesson.question}
                    </p>
                    <div className="grid gap-2">
                      {(selectedLesson.choices || []).map((choice, index) => (
                        <button
                          key={choice}
                          type="button"
                          disabled={progressBusy || loading}
                          aria-pressed={answers[selectedLesson.id] === index}
                          className={
                            "min-h-11 border p-3 text-left text-sm " +
                            (answers[selectedLesson.id] === index
                              ? "border-evo-accent bg-evo-accent/10"
                              : "border-evo-border hover:bg-white/5")
                          }
                          onClick={() =>
                            void chooseAnswer(selectedLesson, index)
                          }
                        >
                          {choice}
                        </button>
                      ))}
                    </div>
                    {answers[selectedLesson.id] !== undefined && (
                      <p
                        role="status"
                        className="mt-4 border-l-2 border-evo-accent pl-4 text-sm leading-relaxed"
                      >
                        {answers[selectedLesson.id] === selectedLesson.answer
                          ? "Correto! "
                          : "Vamos revisar: "}
                        {selectedLesson.explanation}
                      </p>
                    )}
                    {progressBusy && (
                      <p
                        role="status"
                        className="mt-3 text-xs text-evo-textSec"
                      >
                        Salvando progresso…
                      </p>
                    )}
                  </fieldset>
                  {assistantEnabled && (
                    <button
                      className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm text-evo-accent"
                      onClick={() =>
                        window.dispatchEvent(
                          new CustomEvent("ediv-assistant-question", {
                            detail:
                              "Explique de forma educativa: " +
                              selectedLesson.title,
                          }),
                        )
                      }
                    >
                      <MessageCircle size={16} aria-hidden="true" /> Pedir uma
                      explicação ao assistente
                    </button>
                  )}
                  {nextLesson && (
                    <a
                      className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-evo-accent"
                      href="#sala-de-aula"
                      onClick={() => setSelectedId(nextLesson.id)}
                    >
                      Próxima aula: {nextLesson.title}
                      <ArrowRight size={16} aria-hidden="true" />
                    </a>
                  )}
                </>
              )}
            </div>
            <nav
              aria-label="Aulas e capítulos do curso"
              className="order-first border-t border-evo-border pt-4 lg:order-last lg:border-t-0 lg:border-l lg:pl-5 lg:pt-0"
            >
              <h3 className="text-sm font-semibold">Seu roteiro de estudo</h3>
              {learningCourses.map((course) => (
                <div key={course.id} className="mt-5">
                  <p className="mb-2 text-xs uppercase tracking-[0.08em] text-evo-textSec">
                    {course.id === "pesquisa"
                      ? "01 · Pesquisa de ações"
                      : "02 · Dividendos"}
                  </p>
                  <ol className="space-y-1">
                    {course.chapterIds.map((id) => {
                      const lesson = lessons.find((item) => item.id === id);
                      const chapter = learningChapters.find(
                        (item) => item.id === id,
                      );
                      if (!lesson || !chapter) return null;
                      return (
                        <li key={id}>
                          <button
                            id={id}
                            type="button"
                            aria-current={
                              selectedId === id ? "step" : undefined
                            }
                            onClick={() => setSelectedId(id)}
                            className={
                              "flex min-h-14 w-full items-start justify-between gap-3 border-l-2 px-3 py-3 text-left " +
                              (selectedId === id
                                ? "border-evo-accent bg-evo-accent/5"
                                : "border-transparent hover:bg-white/5")
                            }
                          >
                            <span className="min-w-0">
                              <span className="block text-sm font-medium">
                                {lesson.title}
                              </span>
                              <span className="mt-1 block text-xs leading-relaxed text-evo-textSec">
                                {chapter.subtitle}
                              </span>
                            </span>
                            {lesson.locked ? (
                              <LockKeyhole
                                size={16}
                                className="mt-1 shrink-0 text-evo-textSec"
                                aria-label="Requer conta"
                              />
                            ) : completed.includes(id) ? (
                              <CheckCircle2
                                size={16}
                                className="mt-1 shrink-0 text-evo-accent"
                                aria-label="Concluída"
                              />
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              ))}
              <p className="mt-6 text-xs leading-relaxed text-evo-textSec">
                As gravações serão publicadas após a preparação e revisão do
                corretor. O progresso é registrado pelos exercícios de cada
                aula.
              </p>
            </nav>
          </div>
        </section>
      )}
      <LearningPractice />
      <section aria-labelledby="learning-glossary-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="learning-glossary-title" className="text-2xl font-semibold">
            Um conceito por vez
          </h2>
          <Link
            to="/glossario"
            className="inline-flex min-h-11 items-center gap-2 text-sm text-evo-accent"
          >
            Abrir glossário completo <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
        <label className="mt-4 block">
          <span className="sr-only">Buscar um conceito</span>
          <input
            className="field"
            placeholder="Buscar dividendo, payout, data-ex…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <dl className="mt-3 grid gap-x-6 sm:grid-cols-2">
          {matchingTerms.map(([term, text]) => (
            <div key={term} className="border-b border-evo-border py-4">
              <dt className="font-semibold">{term}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-evo-textSec">
                {text}
              </dd>
            </div>
          ))}
        </dl>
        {glossary.length > 0 && matchingTerms.length === 0 && (
          <p role="status" className="mt-4 text-sm text-evo-textSec">
            Nenhum conceito encontrado. Tente outro termo.
          </p>
        )}
      </section>
      <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-evo-border pt-6">
        <Link to="/ranking" className="action">
          Aplicar a leitura no ranking{" "}
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
        <button
          type="button"
          className="action-secondary"
          disabled={progressBusy || loading}
          onClick={() => void resetProgress()}
        >
          Reiniciar progresso
        </button>
        <p className="w-full text-xs leading-relaxed text-evo-textSec">
          Conteúdo educativo da Ediv. Os exemplos são fictícios e não indicam o
          que comprar ou vender. Consulte também o{" "}
          <a
            href="https://www.gov.br/investidor/pt-br"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            Portal do Investidor — CVM
          </a>{" "}
          e as fontes oficiais indicadas em cada aula.
        </p>
      </footer>
    </section>
  );
}
