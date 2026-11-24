export type LessonId =
  | "corretora"
  | "acoes"
  | "comprar-acoes"
  | "inflacao"
  | "ciclos"
  | "fundamentalista"
  | "preco-teto";

export type LearningChapter = {
  id: LessonId;
  subtitle: string;
  readingMinutes: number;
  videoEmbedUrl: string | null;
};

// Keep the existing lesson IDs so saved quiz progress remains compatible.
// Publish an authorized YouTube privacy-enhanced or Vimeo embed URL here.
// Course videos will be supplied by the analyst and mapped to these chapters.
// Keep URLs null until the selected videos are ready for publication.
export const learningChapters: LearningChapter[] = [
  {
    id: "corretora",
    subtitle: "A porta de entrada para a bolsa",
    readingMinutes: 2,
    videoEmbedUrl: "https://www.youtube-nocookie.com/embed/I3ns4SmiCHg",
  },
  {
    id: "acoes",
    subtitle: "O que você ganha e o que pode perder ao virar sócio",
    readingMinutes: 3,
    videoEmbedUrl: "https://www.youtube-nocookie.com/embed/opr1WI9KnX8",
  },
  {
    id: "comprar-acoes",
    subtitle: "Ticker, lote padrão e o que muda na sua posição",
    readingMinutes: 3,
    videoEmbedUrl: "https://www.youtube-nocookie.com/embed/iyGSotDRekU",
  },
  {
    id: "inflacao",
    subtitle: "Preços, poder de compra e o papel do Banco Central",
    readingMinutes: 3,
    videoEmbedUrl: "https://www.youtube-nocookie.com/embed/lgTWQVok9lg",
  },
  {
    id: "ciclos",
    subtitle: "Por que o preço muda mesmo quando o negócio não muda",
    readingMinutes: 2,
    videoEmbedUrl: "https://www.youtube-nocookie.com/embed/DfFnkAXHd6o",
  },
  {
    id: "fundamentalista",
    subtitle: "Top-down, bottom-up e os setores perenes",
    readingMinutes: 3,
    videoEmbedUrl: "https://www.youtube-nocookie.com/embed/mLL51LnRMw8",
  },
  {
    id: "preco-teto",
    subtitle: "Até quanto pagar por uma ação pagadora de dividendos",
    readingMinutes: 3,
    videoEmbedUrl: "https://www.youtube-nocookie.com/embed/o7UuO2uPP1I",
  },
];

export const learningCourses = [
  {
    id: "primeiros-passos",
    eyebrow: "Comece por aqui",
    title: "Primeiros passos na bolsa",
    description:
      "Entenda como funciona a corretora, o que é ser sócio de uma empresa e como fazer a sua primeira compra.",
    chapterIds: ["corretora", "acoes", "comprar-acoes"] as LessonId[],
  },
  {
    id: "economia",
    eyebrow: "Economia para o investidor",
    title: "Inflação, juros e ciclos",
    description:
      "Veja como inflação e juros mexem com o lucro das empresas e com o preço das ações, e por que o negócio continua sendo o centro da análise.",
    chapterIds: ["inflacao", "ciclos"] as LessonId[],
  },
  {
    id: "analise",
    eyebrow: "Análise e preço",
    title: "Do negócio ao preço-teto",
    description:
      "Escolha setores e empresas com a análise fundamentalista e calcule até quanto pagar por uma ação pagadora de dividendos.",
    chapterIds: ["fundamentalista", "preco-teto"] as LessonId[],
  },
];

// Única aula aberta ao visitante; as outras pedem conta. Espelha openLessonId em server/learning-content.js.
export const openLessonId: LessonId = "acoes";

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
