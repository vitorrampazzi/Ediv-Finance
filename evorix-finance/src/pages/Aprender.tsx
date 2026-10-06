import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  CheckCircle2,
  MessageCircle,
  LockKeyhole,
} from "lucide-react";
import { apiRequest } from "../lib/api";
import { useAuth } from "../context/authContext";
import { AccountGate } from "../components/AccountGate";
import { OrbitCoins } from "../components/OrbitCoins";

type Lesson = {
  id: string;
  title: string;
  locked?: boolean;
  text?: string;
  question?: string;
  choices?: string[];
  answer?: number;
  explanation?: string;
};
type LearningData = {
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
export function Aprender() {
  const { user } = useAuth();
  return <LearningSession key={user?.id || "visitor"} />;
}
function LearningSession() {
  const { user, loading: authLoading, refreshSession } = useAuth();
  const userId = user?.id;
  const [content, setContent] = useState<LearningData | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const requestKey = userId || "visitor";
  const loading = loadedFor !== requestKey || authLoading;
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState<string[]>(() =>
    user ? [] : readProgress().filter((id) => id === "ranking"),
  );
  const [progressBusy, setProgressBusy] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [current, setCurrent] = useState("100");
  const [target, setTarget] = useState("120");
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
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <BookOpen className="text-evo-accent" />
            <h1 className="mt-4 text-3xl font-bold">Aprender para entender</h1>
            <p className="mt-3 max-w-3xl leading-relaxed text-evo-textSec">
              Uma trilha curta para ler as análises com mais clareza, questionar
              premissas e entender sua carteira. Exemplos educativos não são
              recomendações de investimento.
            </p>
          </div>
          <div className="shrink-0 self-end sm:self-center">
            <OrbitCoins variant="learning" size="hero" />
          </div>
        </div>
        <p className="mt-4 text-sm text-evo-accent">
          {completed.length} de {lessonIds.length} etapas concluídas · progresso
          {user ? "salvo na sua conta" : "salvo neste navegador"}
        </p>
        <div
          className="mt-3 h-2 rounded bg-evo-bgMain"
          role="progressbar"
          aria-label="Progresso da trilha"
          aria-valuenow={completed.length}
          aria-valuemin={0}
          aria-valuemax={lessonIds.length}
        >
          <div
            className="h-full rounded bg-evo-accent"
            style={{ width: (completed.length / lessonIds.length) * 100 + "%" }}
          />
        </div>
      </section>
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
          A primeira aula e o glossário são abertos. Crie sua conta gratuita
          para acessar a trilha completa.
        </p>
      )}
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
      {lessons.map((lesson) =>
        lesson.locked ? (
          <section
            id={lesson.id}
            key={lesson.id}
            className="scroll-mt-24 rounded-xl border border-evo-border bg-evo-card p-5 sm:p-7"
          >
            <div className="flex items-center gap-3">
              <LockKeyhole
                size={18}
                className="text-evo-accent"
                aria-hidden="true"
              />
              <h2 className="text-xl font-semibold">{lesson.title}</h2>
            </div>
            <p className="mt-3 text-sm text-evo-textSec">
              Esta etapa faz parte da trilha completa para contas gratuitas.
            </p>
          </section>
        ) : (
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
                {(lesson.choices || []).map((choice, i) => (
                  <button
                    key={choice}
                    type="button"
                    disabled={progressBusy || loading}
                    aria-pressed={answers[lesson.id] === i}
                    className={
                      "min-h-11 rounded-lg border p-3 text-left text-sm " +
                      (answers[lesson.id] === i
                        ? "border-evo-accent bg-evo-accent/10"
                        : "border-evo-border hover:bg-white/5")
                    }
                    onClick={() => void chooseAnswer(lesson, i)}
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
        ),
      )}
      {!user && !loading && content && (
        <AccountGate
          title="Continue aprendendo"
          description="Crie sua conta gratuita para liberar todas as aulas, exercícios e os recursos de pesquisa da Ediv."
          next="/aprender"
        />
      )}
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
          disabled={progressBusy || loading}
          onClick={() => void resetProgress()}
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
