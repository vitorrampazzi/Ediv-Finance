import { useState } from "react";
import { BookOpen, CirclePlay, ExternalLink, RotateCcw, Video } from "lucide-react";
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
  const [playerReady, setPlayerReady] = useState(false);
  const [playerRevision, setPlayerRevision] = useState(0);
  const approvedUrl = approvedVideoEmbed(embedUrl);
  const externalUrl = approvedUrl
    ? approvedUrl.includes("youtube-nocookie.com")
      ? "https://www.youtube.com/watch?v=" + new URL(approvedUrl).pathname.split("/").pop()
      : "https://vimeo.com/" + new URL(approvedUrl).pathname.split("/").pop()
    : null;
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
          <>
          {!playerReady && <p role="status" className="pointer-events-none absolute left-3 top-3 z-10 rounded-md bg-evo-bgMain/90 px-3 py-2 text-xs text-evo-textSec">Carregando player…</p>}
          <iframe
            key={playerRevision}
            src={approvedUrl}
            title={title}
            className="absolute inset-0 h-full w-full border-0"
            allow="encrypted-media; picture-in-picture; fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            onLoad={() => setPlayerReady(true)}
          />
          </>
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
      {approvedUrl && loadPlayer && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-evo-textSec">
          <span>Se o player não abrir, tente recarregar ou assistir no provedor.</span>
          <div className="flex flex-wrap gap-3">
            <button type="button" className="inline-flex min-h-11 items-center gap-1.5 text-evo-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-evo-accent" onClick={() => {
              setPlayerReady(false);
              setPlayerRevision((current) => current + 1);
            }}><RotateCcw size={13} aria-hidden="true" /> Recarregar player</button>
            {externalUrl && <a className="inline-flex min-h-11 items-center gap-1.5 text-evo-accent underline underline-offset-4" href={externalUrl} target="_blank" rel="noreferrer">Abrir vídeo <ExternalLink size={13} aria-hidden="true" /><span className="sr-only">(abre em nova guia)</span></a>}
          </div>
        </div>
      )}
    </section>
  );
}
