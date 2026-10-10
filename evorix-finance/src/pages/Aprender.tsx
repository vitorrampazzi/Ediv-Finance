import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  BookOpen,
  CheckCircle2,
  MessageCircle,
  ArrowDown,
  ArrowRight,
  Clock3,
  ArrowLeft,
  RotateCcw,
} from "lucide-react";
import { ApiError, apiRequest } from "../lib/api";
import { authLink } from "../lib/authDestination";
import { useAuth } from "../context/authContext";
import { AccountGate } from "../components/AccountGate";
import { OrbitCoins } from "../components/OrbitCoins";
import { assistantEnabled } from "../lib/features";
import { LearningVideo } from "../components/LearningVideo";
import { LearningPractice } from "../components/LearningPractice";
import { LearningPlaylist } from "../components/LearningPlaylist";
import { LearningCourseCarousel } from "../components/LearningCourseCarousel";
import { LearningJourney } from "../components/LearningJourney";
import { LearningQuiz } from "../components/LearningQuiz";
import {
  approvedVideoEmbed,
  learningChapters,
  learningCourses,
} from "../lib/learningCatalog";

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
const lessonIds: string[] = learningChapters.map((chapter) => chapter.id);
function readProgress(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem("ediv-learning-v1") || "[]");
    return Array.isArray(value)
      ? [
          ...new Set(
            value.filter((x) => typeof x === "string" && lessonIds.includes(x)),
          ),
        ]
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
  const location = useLocation();
  const [sessionNotice, setSessionNotice] = useState("");
  return (
    <>
      {sessionNotice && !user && (
        <aside
          className="notice-error mx-auto mt-6 max-w-6xl px-5 py-4"
          role="alert"
        >
          <p>{sessionNotice}</p>
          <Link
            className="mt-2 inline-flex min-h-11 items-center underline underline-offset-4"
            to={authLink(
              "entrar",
              location.pathname + location.search + location.hash,
            )}
          >
            Entrar novamente para continuar
          </Link>
        </aside>
      )}
      <LearningSession
        key={user?.id || "visitor"}
        initialContent={initialContent}
        onSessionExpired={setSessionNotice}
      />
    </>
  );
}
function LearningSession({
  initialContent,
  onSessionExpired,
}: {
  initialContent?: LearningData;
  onSessionExpired: (message: string) => void;
}) {
  const { user, loading: authLoading, refreshSession } = useAuth();
  const userId = user?.id;
  const [content, setContent] = useState<LearningData | null>(
    initialContent ?? null,
  );
  const [revision, setRevision] = useState(0);
  const [loadedRevision, setLoadedRevision] = useState<number | null>(null);
  const loading = loadedRevision !== revision || authLoading;
  const [error, setError] = useState("");
  const [progressError, setProgressError] = useState<{
    lessonId?: string;
    message: string;
  } | null>(null);
  const [completed, setCompleted] = useState<string[]>(() =>
    user ? [] : readProgress().filter((id) => id === "ranking"),
  );
  const [progressBusy, setProgressBusy] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [resetRequested, setResetRequested] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const classroomRef = useRef<HTMLElement>(null);
  const classroomTitleRef = useRef<HTMLHeadingElement>(null);
  const selectionIntentRef = useRef<{
    destination: string;
    focusClassroom: boolean;
  } | null>(null);
  const handledLocationRef = useRef<string | null>(null);
  const queryLesson = new URLSearchParams(location.search).get("aula");
  const hashLesson = location.hash.slice(1).replace(/^leitura-/, "");
  const selectedId =
    queryLesson && lessonIds.includes(queryLesson)
      ? queryLesson
      : lessonIds.includes(hashLesson)
        ? hashLesson
        : lessonIds[0];

  function selectLesson(id: string, focusClassroom = false) {
    if (!lessonIds.includes(id)) return;
    const params = new URLSearchParams(location.search);
    params.set("aula", id);
    selectionIntentRef.current = {
      destination:
        location.pathname + "?" + params.toString() + "#sala-de-aula",
      focusClassroom,
    };
    navigate({
      pathname: location.pathname,
      search: params.toString(),
      hash: "#sala-de-aula",
    });
  }

  function retryContent() {
    setError("");
    setRevision((current) => current + 1);
  }
  useEffect(() => {
    if (authLoading) return;
    const controller = new AbortController();
    apiRequest<LearningData>("/api/learning", { signal: controller.signal })
      .then(async (data) => {
        if (!controller.signal.aborted) {
          setContent(data);
          setError("");
          if (userId)
            setCompleted([
              ...new Set(data.completed.filter((id) => lessonIds.includes(id))),
            ]);
          if (userId && data.access === "preview") await refreshSession();
        }
      })
      .catch((reason) => {
        if (!controller.signal.aborted) {
          setError(
            reason instanceof Error
              ? reason.message
              : "Não foi possível carregar as aulas.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadedRevision(revision);
      });
    return () => controller.abort();
  }, [userId, authLoading, refreshSession, revision]);
  const lessons: Lesson[] = (content?.lessons || []).map((lesson, index) =>
    !user && index > 0
      ? { id: lesson.id, title: lesson.title, locked: true }
      : lesson,
  );
  const glossary = content?.glossary || [];
  useEffect(() => {
    if (
      !content ||
      !location.hash ||
      handledLocationRef.current === location.key
    )
      return;
    const frame = window.requestAnimationFrame(() => {
      const destination = location.pathname + location.search + location.hash;
      const intent =
        selectionIntentRef.current?.destination === destination
          ? selectionIntentRef.current
          : null;
      selectionIntentRef.current = null;
      const hash = location.hash.slice(1);
      const target = lessonIds.includes(hash)
        ? classroomRef.current
        : document.getElementById(hash);
      handledLocationRef.current = location.key;
      // Playlist selection keeps document scroll and keyboard focus in place.
      // Direct links, history navigation and course CTAs still open the classroom.
      if (!intent || intent.focusClassroom) {
        target?.scrollIntoView({ block: "start", behavior: "instant" });
      }
      if (intent?.focusClassroom) {
        classroomTitleRef.current?.focus({ preventScroll: true });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [
    location.key,
    location.pathname,
    location.search,
    location.hash,
    content,
  ]);
  useEffect(() => {
    if (user) return;
    try {
      localStorage.setItem("ediv-learning-v1", JSON.stringify(completed));
    } catch {
      /* Browser storage may be disabled. */
    }
  }, [completed, user]);
  async function handleExpiredSession(message: string, lessonId?: string) {
    setSessionExpired(true);
    setProgressError({ lessonId, message });
    onSessionExpired(message);
    try {
      await refreshSession();
    } catch {
      setProgressError({
        lessonId,
        message:
          message +
          " Não foi possível verificar a sessão. Atualize esta página antes de entrar novamente.",
      });
    }
  }
  async function chooseAnswer(lesson: Lesson, answer: number) {
    if (progressBusy || loading || sessionExpired || lesson.locked) return;
    setAnswers((current) => ({ ...current, [lesson.id]: answer }));
    setProgressError(null);
    if (answer !== lesson.answer) return;
    if (completed.includes(lesson.id)) return;
    setProgressBusy(true);
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
      if (err instanceof ApiError && err.status === 401) {
        await handleExpiredSession(
          "Sua sessão expirou. A conclusão deste exercício não foi salva. Entre novamente e responda para registrar o progresso.",
          lesson.id,
        );
        return;
      }
      setProgressError({
        lessonId: lesson.id,
        message:
          err instanceof Error
            ? err.message
            : "Não foi possível salvar o progresso.",
      });
    } finally {
      setProgressBusy(false);
    }
  }
  async function resetProgress() {
    if (progressBusy || loading || sessionExpired) return;
    setProgressBusy(true);
    setProgressError(null);
    try {
      if (user)
        await apiRequest("/api/learning/progress", { method: "DELETE" });
      setCompleted([]);
      setAnswers({});
      setResetRequested(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        await handleExpiredSession(
          "Sua sessão expirou. O progresso não foi reiniciado. Entre novamente para gerenciar as conclusões.",
        );
        return;
      }
      setProgressError({
        message:
          err instanceof Error ? err.message : "Não foi possível reiniciar.",
      });
    } finally {
      setProgressBusy(false);
    }
  }
  const selectedLesson =
    lessons.find((lesson) => lesson.id === selectedId) ?? lessons[0];
  const selectedChapter =
    learningChapters.find((chapter) => chapter.id === selectedLesson?.id) ??
    learningChapters[0];
  const selectedCourse =
    learningCourses.find((course) =>
      course.chapterIds.some((id) => id === selectedLesson?.id),
    ) ?? learningCourses[0];
  const playlistItems = selectedCourse.chapterIds.flatMap((id) => {
    const lesson = lessons.find((item) => item.id === id);
    const chapter = learningChapters.find((item) => item.id === id);
    if (!lesson || !chapter) return [];
    return [
      {
        id,
        title: lesson.title,
        subtitle: chapter.subtitle,
        courseTitle: selectedCourse.title,
        readingMinutes: chapter.readingMinutes,
        videoAvailable:
          !lesson.locked && Boolean(approvedVideoEmbed(chapter.videoEmbedUrl)),
        locked: Boolean(lesson.locked),
        completed: completed.includes(id),
      },
    ];
  });
  const selectedIndex = playlistItems.findIndex(
    (item) => item.id === selectedLesson?.id,
  );
  const nextLesson = playlistItems[selectedIndex + 1];
  const previousLesson = playlistItems[selectedIndex - 1];
  const completedInCourse = playlistItems.filter(
    (item) => item.completed,
  ).length;
  const nextCourse =
    learningCourses[
      learningCourses.findIndex((course) => course.id === selectedCourse.id) + 1
    ];
  const nextCourseId =
    nextCourse?.chapterIds.find((id) => !completed.includes(id)) ??
    nextCourse?.chapterIds[0];
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
      <header className="page-intro">
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
              {completed.length} de {lessonIds.length} exercícios concluídos
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
          aria-label="Progresso dos exercícios da trilha"
          aria-valuenow={completed.length}
          aria-valuemin={0}
          aria-valuemax={lessonIds.length}
        >
          <div
            className="h-full bg-evo-accent transition-[width] motion-reduce:transition-none"
            style={{ width: (completed.length / lessonIds.length) * 100 + "%" }}
          />
        </div>
      </header>
      {loading && (
        <div
          role="status"
          className="space-y-3 border-l-2 border-evo-accent pl-4 text-sm text-evo-textSec"
        >
          <p>
            {content
              ? "Atualizando aulas e progresso…"
              : "Carregando sua trilha de aprendizado…"}
          </p>
          {!content && (
            <div
              aria-hidden="true"
              className="h-20 rounded-lg bg-evo-card/50"
            />
          )}
        </div>
      )}
      {error && (
        <div className="notice-error space-y-3">
          <p role="alert">{error}</p>
          {content && (
            <p className="text-sm">
              O conteúdo já carregado continua disponível. Tente atualizar para
              conferir seu progresso.
            </p>
          )}
          <button
            type="button"
            className="action-secondary"
            onClick={retryContent}
            disabled={loading}
          >
            <RotateCcw size={15} aria-hidden="true" /> Tentar carregar novamente
          </button>
        </div>
      )}
      {!user && !loading && content && (
        <p className="text-sm text-evo-textSec">
          A primeira aula e o glossário são abertos. Sua conta gratuita libera
          as outras aulas e salva seu progresso.
        </p>
      )}
      {content && !authLoading && (
        <LearningJourney
          lessons={lessons}
          completed={completed}
          isAuthenticated={Boolean(user)}
          onSelect={(id) => selectLesson(id, true)}
        />
      )}
      <LearningCourseCarousel
        courses={learningCourses}
        chapters={learningChapters}
        completed={completed}
        selectedCourseId={selectedCourse.id}
        onSelect={(id) => selectLesson(id, true)}
      />
      {selectedLesson && (
        <section
          ref={classroomRef}
          id="sala-de-aula"
          className="scroll-mt-24 border-t border-evo-border pt-7"
          aria-labelledby="classroom-title"
        >
          <p className="text-xs uppercase tracking-[0.14em] text-evo-textSec">
            Sala de aula · {selectedCourse.title}
          </p>
          <h2
            ref={classroomTitleRef}
            tabIndex={-1}
            id="classroom-title"
            aria-live="polite"
            className="mt-2 text-2xl font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-evo-accent"
          >
            {selectedLesson.title}
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-evo-textSec">
            <span>
              Aula {selectedIndex + 1} de {playlistItems.length}
            </span>
            <span>
              {completedInCourse} de {playlistItems.length} exercícios
              concluídos neste curso
            </span>
            <a
              className="inline-flex min-h-9 items-center gap-1 text-evo-accent underline underline-offset-4"
              href="#cursos"
            >
              <ArrowLeft size={13} aria-hidden="true" /> Todos os minicursos
            </a>
          </div>
          <div className="mt-6 overflow-hidden rounded-2xl border border-evo-border bg-evo-bgMain">
            <div className="grid min-w-0 grid-cols-1 items-start lg:grid-cols-[minmax(0,1fr)_20rem]">
              <div className="min-w-0 p-4 sm:p-5">
                {selectedLesson.locked ? (
                  <AccountGate
                    title="Entre para estudar esta aula"
                    description="Sua conta gratuita libera a leitura, o exercício e o acompanhamento do progresso."
                    next={
                      location.pathname +
                      location.search +
                      "#" +
                      selectedLesson.id
                    }
                  />
                ) : (
                  <LearningVideo
                    key={selectedLesson.id}
                    title={selectedLesson.title}
                    embedUrl={selectedChapter.videoEmbedUrl}
                    readingTarget={"#leitura-" + selectedLesson.id}
                  />
                )}
              </div>
              <LearningPlaylist
                items={playlistItems}
                selectedId={selectedLesson.id}
                onSelect={selectLesson}
              />
            </div>
          </div>
          {!selectedLesson.locked && (
            <div className="mt-5 min-w-0 max-w-4xl">
              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-evo-textSec">
                <BookOpen size={15} aria-hidden="true" />
                <span>Material de leitura disponível</span>
                <Clock3 size={15} aria-hidden="true" />
                <span>
                  {selectedChapter.readingMinutes} min de leitura estimada
                </span>
                {completed.includes(selectedLesson.id) && (
                  <span className="inline-flex items-center gap-1 text-evo-accent">
                    <CheckCircle2 size={15} aria-hidden="true" /> Exercício
                    concluído
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
                    <p className="font-semibold">Para aprofundar nas fontes</p>
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
                            <span className="sr-only">(abre em nova guia)</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </article>
              <LearningQuiz
                lesson={selectedLesson}
                selectedAnswer={answers[selectedLesson.id]}
                completed={completed.includes(selectedLesson.id)}
                busy={progressBusy}
                disabled={loading || sessionExpired}
                authenticated={Boolean(user)}
                error={
                  progressError?.lessonId === selectedLesson.id
                    ? progressError.message
                    : undefined
                }
                onAnswer={(answer) => void chooseAnswer(selectedLesson, answer)}
              />
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
            </div>
          )}
          <nav
            aria-label="Continuar o aprendizado"
            className="mt-6 flex flex-col gap-3 border-t border-evo-border pt-5 sm:flex-row sm:justify-between"
          >
            {previousLesson ? (
              <button
                type="button"
                className="action-secondary justify-center"
                onClick={() => selectLesson(previousLesson.id, true)}
              >
                <ArrowLeft size={15} aria-hidden="true" /> Aula anterior
              </button>
            ) : (
              <a href="#cursos" className="action-secondary justify-center">
                Escolher outro curso
              </a>
            )}
            {nextLesson ? (
              <button
                type="button"
                className="action justify-center"
                onClick={() => selectLesson(nextLesson.id, true)}
              >
                Próxima aula: {nextLesson.title}{" "}
                <ArrowRight size={15} aria-hidden="true" />
              </button>
            ) : nextCourseId ? (
              <button
                type="button"
                className="action justify-center"
                onClick={() => selectLesson(nextCourseId, true)}
              >
                Próximo curso: {nextCourse?.title}{" "}
                <ArrowRight size={15} aria-hidden="true" />
              </button>
            ) : (
              <a href="#laboratorio" className="action justify-center">
                Praticar no laboratório{" "}
                <ArrowRight size={15} aria-hidden="true" />
              </a>
            )}
          </nav>
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
        <Link to={user ? "/app/ranking" : "/ranking"} className="action">
          Aplicar a leitura no ranking{" "}
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
        <button
          type="button"
          className="action-secondary"
          disabled={
            progressBusy || loading || sessionExpired || completed.length === 0
          }
          onClick={() => setResetRequested(true)}
        >
          Reiniciar progresso
        </button>
        {resetRequested && (
          <section
            className="w-full rounded-lg border border-evo-border p-4"
            aria-labelledby="reset-progress-title"
          >
            <h3 id="reset-progress-title" className="font-semibold">
              Reiniciar os exercícios concluídos?
            </h3>
            <p className="mt-2 text-sm text-evo-textSec">
              As marcações de conclusão de todas as aulas serão removidas. Os
              cursos continuam disponíveis para estudar novamente.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                className="action-secondary"
                disabled={progressBusy}
                onClick={() => setResetRequested(false)}
              >
                Manter progresso
              </button>
              <button
                type="button"
                className="action"
                disabled={progressBusy || loading || sessionExpired}
                onClick={() => void resetProgress()}
              >
                {progressBusy ? "Reiniciando…" : "Confirmar reinício"}
              </button>
            </div>
          </section>
        )}
        {progressError && !progressError.lessonId && (
          <p role="alert" className="notice-error w-full">
            {progressError.message}
          </p>
        )}
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
