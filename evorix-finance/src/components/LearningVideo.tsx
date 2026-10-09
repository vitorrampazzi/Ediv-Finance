import { useState } from "react";
import { BookOpen, CirclePlay, Video } from "lucide-react";
import { approvedVideoEmbed } from "../lib/learningCatalog";

export function LearningVideo({
  title,
  embedUrl,
  readingTarget,
}: {
  title: string;
  embedUrl: string | null;
  readingTarget: string;
}) {
  const [loadPlayer, setLoadPlayer] = useState(false);
  const approvedUrl = approvedVideoEmbed(embedUrl);
  return (
    <section className="min-w-0" aria-label={"Vídeo da aula: " + title}>
      <div
        className={
          "relative flex aspect-video w-full min-w-0 items-center justify-center overflow-hidden rounded-xl border border-evo-border bg-evo-bgMain " +
          (approvedUrl && loadPlayer
            ? "aspect-video"
            : "min-h-60 p-5 sm:min-h-72 sm:p-6")
        }
      >
        {approvedUrl && loadPlayer ? (
          <iframe
            src={approvedUrl}
            title={title}
            className="absolute inset-0 h-full w-full border-0"
            allow="encrypted-media; picture-in-picture; fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        ) : (
          <div className="max-w-sm text-center">
            {approvedUrl ? (
              <CirclePlay
                size={42}
                className="mx-auto text-evo-accent"
                aria-hidden="true"
              />
            ) : (
              <Video
                size={38}
                className="mx-auto text-evo-accent"
                aria-hidden="true"
              />
            )}
            <p className="mt-4 font-semibold">
              {approvedUrl ? title : "Aulas em vídeo em preparação"}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-evo-textSec">
              {approvedUrl
                ? "Carregue o player para assistir. O provedor de vídeo receberá sua conexão somente ao clicar."
                : "Os vídeos do curso selecionados para esta trilha serão publicados aqui. Enquanto isso, estude o material e pratique com o exercício da aula."}
            </p>
            {approvedUrl ? (
              <button
                type="button"
                className="action mt-5"
                onClick={() => setLoadPlayer(true)}
              >
                <CirclePlay size={17} aria-hidden="true" /> Carregar vídeo
              </button>
            ) : (
              <a className="action-secondary mt-5" href={readingTarget}>
                <BookOpen size={16} aria-hidden="true" /> Estudar pela leitura
              </a>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
