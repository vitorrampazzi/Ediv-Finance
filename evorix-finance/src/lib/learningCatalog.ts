export type LessonId = "ranking" | "risco" | "dividendos" | "carteira";

export type LearningChapter = {
  id: LessonId;
  subtitle: string;
  readingMinutes: number;
  videoEmbedUrl: string | null;
};

// Keep the existing lesson IDs so saved quiz progress remains compatible.
// Publish an authorized YouTube privacy-enhanced or Vimeo embed URL here.
// No video is published for this POC; the written lessons are fully usable.
export const learningChapters: LearningChapter[] = [
  {
    id: "ranking",
    subtitle: "Tese, premissas e limites de uma previsão",
    readingMinutes: 6,
    videoEmbedUrl: null,
  },
  {
    id: "risco",
    subtitle: "O negócio por trás do número",
    readingMinutes: 7,
    videoEmbedUrl: null,
  },
  {
    id: "dividendos",
    subtitle: "Proventos, dividend yield e calendário",
    readingMinutes: 8,
    videoEmbedUrl: null,
  },
  {
    id: "carteira",
    subtitle: "Lucro, caixa e sustentabilidade dos pagamentos",
    readingMinutes: 8,
    videoEmbedUrl: null,
  },
];

export const learningCourses = [
  {
    id: "pesquisa",
    eyebrow: "Curso 01 · Fundamentos da pesquisa",
    title: "Leia uma análise com autonomia",
    description:
      "Entenda as hipóteses do corretor, o prazo do cenário e o que pode fazer a tese mudar.",
    chapterIds: ["ranking", "risco"] as LessonId[],
  },
  {
    id: "dividendos",
    eyebrow: "Curso 02 · Escola do Dividendo",
    title: "Da empresa ao dividendo",
    description:
      "Conheça o caminho entre o resultado do negócio, a geração de caixa e o pagamento ao acionista.",
    chapterIds: ["dividendos", "carteira"] as LessonId[],
  },
];

export function approvedVideoEmbed(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port)
      return null;
    if (
      url.hostname === "www.youtube-nocookie.com" &&
      /^\/embed\/[A-Za-z0-9_-]{11}$/.test(url.pathname)
    ) {
      return url.origin + url.pathname + "?autoplay=0&rel=0";
    }
    if (
      url.hostname === "player.vimeo.com" &&
      /^\/video\/[0-9]+$/.test(url.pathname)
    ) {
      return url.origin + url.pathname + "?autoplay=0&dnt=1";
    }
  } catch {
    /* A missing or invalid URL leaves the written lesson available. */
  }
  return null;
}
