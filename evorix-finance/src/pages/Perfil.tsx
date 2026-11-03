import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Download, Headset, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/authContext";
import { apiRequest } from "../lib/api";
import { roleLabels } from "../lib/permissions";
import { learningChapters } from "../lib/learningCatalog";

const lessonIds: string[] = learningChapters.map((chapter) => chapter.id);

const shortcuts = [
  {
    Icon: ShieldCheck,
    title: "Segurança e acesso",
    text: "Trocar a senha e encerrar sessões abertas.",
    to: "/app/config#settings-security",
  },
  {
    Icon: Download,
    title: "Seus dados",
    text: "Baixar uma cópia ou solicitar a exclusão da conta.",
    to: "/app/config#settings-data",
  },
  {
    Icon: Headset,
    title: "Dúvidas e suporte",
    text: "Falar com a equipe da Escola do Dividendo.",
    to: "/app/conversas",
  },
];

export const Perfil = () => {
  const { user } = useAuth();
  const [completed, setCompleted] = useState<string[] | null>(null);
  const [progressError, setProgressError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    apiRequest<{ completed: string[] }>("/api/learning", {
      signal: controller.signal,
    })
      .then((data) =>
        setCompleted(
          [...new Set(data.completed)].filter((id) => lessonIds.includes(id)),
        ),
      )
      .catch(() => {
        if (!controller.signal.aborted) setProgressError(true);
      });
    return () => controller.abort();
  }, []);

  const name = user?.name ?? "";
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("pt-BR");
  const since = user?.createdAt ? new Date(user.createdAt) : null;
  const next = completed && lessonIds.find((id) => !completed.includes(id));

  return (
    <section className="mx-auto max-w-4xl">
      <header className="flex flex-col gap-5 border-b border-evo-border pb-8 sm:flex-row sm:items-center sm:gap-6">
        <span
          aria-hidden="true"
          className="ediv-account-avatar flex h-20 w-20 shrink-0 items-center justify-center rounded-full text-2xl font-semibold"
        >
          {initials}
        </span>
        <div className="min-w-0">
          <p className="edition-label">Meu perfil</p>
          <h1 className="mt-1 break-words text-2xl font-semibold sm:text-3xl">
            {name}
          </h1>
          <p className="mt-1 break-all text-sm text-evo-textSec">
            {user?.email}
          </p>
          <ul className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <li className="rounded-full border border-evo-accent/40 px-2.5 py-1 font-medium text-evo-accent">
              {user ? roleLabels[user.role] : "—"}
            </li>
            <li className="rounded-full border border-evo-border px-2.5 py-1 text-evo-textSec">
              E-mail {user?.emailVerified ? "confirmado" : "pendente"}
            </li>
            {since && !Number.isNaN(since.getTime()) && (
              <li className="px-1 text-evo-textSec">
                Membro desde{" "}
                {since.toLocaleDateString("pt-BR", {
                  month: "long",
                  year: "numeric",
                })}
              </li>
            )}
          </ul>
        </div>
      </header>

      <section
        aria-labelledby="profile-learning"
        className="border-b border-evo-border py-8"
      >
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <div>
            <p className="edition-label">Aulas e exercícios</p>
            <h2
              id="profile-learning"
              className="mt-2 text-xl font-semibold sm:text-2xl"
            >
              Seus estudos
            </h2>
          </div>
          <Link
            className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-evo-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-evo-accent"
            to={
              next ? `/app/aprender?aula=${next}#sala-de-aula` : "/app/aprender"
            }
          >
            {completed && !next
              ? "Rever as aulas"
              : completed?.length
                ? "Continuar estudando"
                : "Começar a primeira aula"}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        {completed ? (
          <>
            <p className="mt-4 text-sm">
              <strong className="font-numbers text-lg font-semibold">
                {completed.length} de {lessonIds.length}
              </strong>{" "}
              <span className="text-evo-textSec">exercícios concluídos</span>
            </p>
            <div
              className="mt-3 h-1.5 overflow-hidden rounded-full bg-evo-bgSec"
              role="progressbar"
              aria-label="Progresso dos exercícios"
              aria-valuenow={completed.length}
              aria-valuemin={0}
              aria-valuemax={lessonIds.length}
            >
              <div
                className="h-full rounded-full bg-evo-accent"
                style={{
                  width: (completed.length / lessonIds.length) * 100 + "%",
                }}
              />
            </div>
          </>
        ) : (
          <p role="status" className="mt-4 text-sm text-evo-textSec">
            {progressError
              ? "Não foi possível carregar seu progresso agora. Ele continua salvo nas aulas."
              : "Carregando seu progresso…"}
          </p>
        )}
      </section>

      <section aria-labelledby="profile-shortcuts" className="py-8">
        <h2
          id="profile-shortcuts"
          className="text-xl font-semibold sm:text-2xl"
        >
          Atalhos da conta
        </h2>
        <ul className="mt-4 border-t border-evo-border">
          {shortcuts.map(({ Icon, title, text, to }) => (
            <li key={to} className="border-b border-evo-border">
              <Link
                to={to}
                className="group grid min-h-11 grid-cols-[1.25rem_minmax(0,1fr)_1rem] items-center gap-4 py-4 transition-colors hover:bg-evo-bgSec focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-evo-accent sm:px-3"
              >
                <Icon
                  size={18}
                  aria-hidden="true"
                  className="text-evo-accent"
                />
                <span className="min-w-0">
                  <span className="block font-semibold transition-colors group-hover:text-evo-accent">
                    {title}
                  </span>
                  <span className="mt-0.5 block text-sm text-evo-textSec">
                    {text}
                  </span>
                </span>
                <ArrowRight
                  size={16}
                  aria-hidden="true"
                  className="text-evo-textSec transition-transform group-hover:translate-x-0.5 group-hover:text-evo-accent motion-reduce:transition-none"
                />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
};
