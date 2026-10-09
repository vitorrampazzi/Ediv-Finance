import { useEffect, useId, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
} from "lucide-react";
import { approvedVideoEmbed } from "../lib/learningCatalog";

type Course = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  chapterIds: string[];
};

type LearningCourseCarouselProps = {
  courses: Course[];
  chapters: { id: string; readingMinutes: number; videoEmbedUrl: string | null }[];
  completed: string[];
  selectedCourseId: string;
  onSelect: (chapterId: string) => void;
};

export function LearningCourseCarousel({
  courses,
  chapters,
  completed,
  selectedCourseId,
  onSelect,
}: LearningCourseCarouselProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLUListElement>(null);
  const carouselId = useId();
  const [bounds, setBounds] = useState({ previous: false, next: false });

  useEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;

    function measureBounds() {
      if (!viewport) return;
      const maximum = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
      const previous = viewport.scrollLeft > 2;
      const next = viewport.scrollLeft < maximum - 2;
      setBounds((current) =>
        current.previous === previous && current.next === next
          ? current
          : { previous, next },
      );
    }

    const frame = window.requestAnimationFrame(measureBounds);
    viewport.addEventListener("scroll", measureBounds, { passive: true });
    window.addEventListener("resize", measureBounds);
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(measureBounds);
    observer?.observe(viewport);
    observer?.observe(track);

    return () => {
      window.cancelAnimationFrame(frame);
      viewport.removeEventListener("scroll", measureBounds);
      window.removeEventListener("resize", measureBounds);
      observer?.disconnect();
    };
  }, [courses.length]);

  useEffect(() => {
    const viewport = viewportRef.current;
    const selected = trackRef.current?.querySelector<HTMLElement>("[data-selected-course='true']");
    if (!viewport || !selected) return;
    const bounds = viewport.getBoundingClientRect();
    const card = selected.getBoundingClientRect();
    const adjustment = card.left < bounds.left
      ? card.left - bounds.left
      : card.right > bounds.right ? card.right - bounds.right : 0;
    if (adjustment) viewport.scrollBy({ left: adjustment, behavior: "instant" });
  }, [selectedCourseId]);

  function scrollCourses(direction: -1 | 1) {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    const firstCard = track?.firstElementChild;
    if (!viewport || !track || !firstCard) return;
    const gap =
      Number.parseFloat(window.getComputedStyle(track).columnGap) || 0;
    const distance = firstCard.getBoundingClientRect().width + gap;
    viewport.scrollBy({
      left: distance * direction,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }

  return (
    <section
      id="cursos"
      aria-labelledby="courses-title"
      className="min-w-0 scroll-mt-24"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="courses-title" className="text-2xl font-semibold">
            Minicursos
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-evo-textSec">
            Escolha um curso, acompanhe seu percurso e continue pela próxima aula.
          </p>
        </div>
        <div
          className="flex items-center gap-2"
          role="group"
          aria-label="Navegar pelos minicursos"
        >
          <button
            type="button"
            onClick={() => scrollCourses(-1)}
            disabled={!bounds.previous}
            aria-label="Ver minicursos anteriores"
            aria-controls={carouselId}
            className="inline-flex size-11 items-center justify-center rounded-full border border-evo-border bg-evo-card/30 text-evo-textMain transition-colors hover:border-evo-accent hover:text-evo-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-evo-accent disabled:cursor-default disabled:opacity-30 disabled:hover:border-evo-border disabled:hover:text-evo-textMain motion-reduce:transition-none"
          >
            <ArrowLeft size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => scrollCourses(1)}
            disabled={!bounds.next}
            aria-label="Ver próximos minicursos"
            aria-controls={carouselId}
            className="inline-flex size-11 items-center justify-center rounded-full border border-evo-border bg-evo-card/30 text-evo-textMain transition-colors hover:border-evo-accent hover:text-evo-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-evo-accent disabled:cursor-default disabled:opacity-30 disabled:hover:border-evo-border disabled:hover:text-evo-textMain motion-reduce:transition-none"
          >
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div
        id={carouselId}
        ref={viewportRef}
        className="mt-5 min-w-0 snap-x snap-proximity overflow-x-auto overscroll-x-contain pb-3"
        role="group"
        aria-roledescription="carrossel"
        aria-label="Minicursos disponíveis"
      >
        <ul ref={trackRef} className="flex list-none gap-5">
          {courses.map((course) => {
            const selected = course.id === selectedCourseId;
            const count = course.chapterIds.filter((id) =>
              completed.includes(id),
            ).length;
            const minutes = chapters
              .filter((chapter) => course.chapterIds.includes(chapter.id))
              .reduce((sum, chapter) => sum + chapter.readingMinutes, 0);
            const firstChapterId = course.chapterIds.find((id) => !completed.includes(id)) ?? course.chapterIds[0];
            const courseFinished = count === course.chapterIds.length && count > 0;
            const availableVideos = chapters.filter((chapter) => course.chapterIds.includes(chapter.id) && approvedVideoEmbed(chapter.videoEmbedUrl)).length;
            return (
              <li
                key={course.id}
                data-selected-course={selected ? "true" : undefined}
                className="flex w-[min(85vw,22rem)] shrink-0 snap-start sm:w-[clamp(18rem,calc((100%_-_1.25rem)/2),34rem)]"
              >
                <article
                  className={
                    "flex w-full flex-col border px-5 py-6 transition-colors sm:px-6 motion-reduce:transition-none " +
                    (selected
                      ? "border-evo-accent/60 bg-evo-accent/5"
                      : "border-evo-border bg-evo-card/25")
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-evo-border text-evo-accent">
                      <BookOpen size={19} aria-hidden="true" />
                    </span>
                    {selected && (
                      <span className="rounded-full bg-evo-accent/10 px-3 py-1 text-xs font-medium text-evo-accent">
                        Selecionado
                      </span>
                    )}
                  </div>
                  <p className="mt-5 text-xs uppercase leading-relaxed tracking-[0.12em] text-evo-accent">
                    {course.eyebrow}
                  </p>
                  <h3 className="mt-3 text-xl font-semibold leading-tight">
                    {course.title}
                  </h3>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-evo-textSec">
                    {course.description}
                  </p>
                  <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-evo-textSec">
                    <span>{course.chapterIds.length} aulas</span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock3 size={14} aria-hidden="true" />
                      {minutes} min de leitura estimada
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <CheckCircle2 size={14} aria-hidden="true" />
                      {count}/{course.chapterIds.length} concluídas
                    </span>
                  </div>
                  <div
                    className="mt-4 h-1.5 overflow-hidden rounded-full bg-evo-bgMain"
                    role="progressbar"
                    aria-label={"Exercícios concluídos: " + course.title}
                    aria-valuemin={0}
                    aria-valuemax={course.chapterIds.length}
                    aria-valuenow={count}
                  >
                    <div className="h-full bg-evo-accent transition-[width] motion-reduce:transition-none" style={{ width: `${course.chapterIds.length ? (count / course.chapterIds.length) * 100 : 0}%` }} />
                  </div>
                  <p className="mt-3 text-xs leading-5 text-evo-textSec">
                    {availableVideos ? `${availableVideos} ${availableVideos === 1 ? "vídeo disponível" : "vídeos disponíveis"}` : "Vídeos em preparação"} · Leituras e exercícios disponíveis
                  </p>
                  {firstChapterId && (
                    <button
                      type="button"
                      onClick={() => onSelect(firstChapterId)}
                      aria-current={selected ? "true" : undefined}
                      aria-label={(courseFinished ? "Revisar minicurso: " : count > 0 ? "Continuar minicurso: " : "Abrir minicurso: ") + course.title}
                      className="mt-5 inline-flex min-h-11 items-center justify-between gap-3 border-t border-evo-border pt-4 text-sm font-semibold text-evo-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-evo-accent"
                    >
                      {courseFinished ? "Revisar minicurso" : count > 0 ? "Continuar minicurso" : "Começar minicurso"}
                      <ArrowRight size={16} aria-hidden="true" />
                    </button>
                  )}
                </article>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
