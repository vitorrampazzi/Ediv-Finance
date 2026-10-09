import { useEffect, useRef, type KeyboardEvent } from "react";
import {
  BookOpen,
  Building2,
  CheckCircle2,
  ChartNoAxesCombined,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Files,
  ListVideo,
  LockKeyhole,
  Play,
} from "lucide-react";

export type LearningPlaylistItem = {
  id: string;
  title: string;
  subtitle: string;
  courseTitle: string;
  readingMinutes: number;
  videoAvailable: boolean;
  locked: boolean;
  completed: boolean;
};

type LearningPlaylistProps = {
  items: LearningPlaylistItem[];
  selectedId: string;
  onSelect: (id: string) => void;
};

const thumbnailIcons = [ChartNoAxesCombined, Building2, BookOpen, Files];

export function LearningPlaylist({
  items,
  selectedId,
  onSelect,
}: LearningPlaylistProps) {
  const listRef = useRef<HTMLOListElement>(null);
  const itemRefs = useRef(new Map<string, HTMLButtonElement>());
  const selectedIndex = items.findIndex((item) => item.id === selectedId);
  const completedCount = items.filter((item) => item.completed).length;

  useEffect(() => {
    const container = listRef.current;
    const selected = itemRefs.current.get(selectedId);
    if (!container || !selected || !container.clientWidth) return;

    const containerBounds = container.getBoundingClientRect();
    const selectedBounds = selected.getBoundingClientRect();
    const vertical = window.matchMedia("(min-width: 1024px)").matches;
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches
      ? "auto"
      : "smooth";
    const padding = 8;

    if (vertical) {
      const above = selectedBounds.top - containerBounds.top - padding;
      const below = selectedBounds.bottom - containerBounds.bottom + padding;
      const adjustment = above < 0 ? above : below > 0 ? below : 0;
      if (adjustment)
        container.scrollTo({
          top: container.scrollTop + adjustment,
          behavior,
        });
    } else {
      const before = selectedBounds.left - containerBounds.left - padding;
      const after = selectedBounds.right - containerBounds.right + padding;
      const adjustment = before < 0 ? before : after > 0 ? after : 0;
      if (adjustment)
        container.scrollTo({
          left: container.scrollLeft + adjustment,
          behavior,
        });
    }
  }, [selectedId, items.length]);

  function selectAdjacent(direction: -1 | 1) {
    const target = items[selectedIndex + direction];
    if (selectedIndex >= 0 && target) onSelect(target.id);
  }

  function handleListKeyDown(event: KeyboardEvent<HTMLOListElement>) {
    const focused = event.target;
    if (
      !(focused instanceof HTMLButtonElement) ||
      !focused.dataset.playlistItem
    )
      return;

    const focusedIndex = items.findIndex(
      (item) => item.id === focused.dataset.playlistItem,
    );
    if (focusedIndex < 0) return;

    const vertical = window.matchMedia("(min-width: 1024px)").matches;
    const previousKey = vertical ? "ArrowUp" : "ArrowLeft";
    const nextKey = vertical ? "ArrowDown" : "ArrowRight";
    let nextIndex = focusedIndex;

    if (event.key === previousKey) nextIndex -= 1;
    else if (event.key === nextKey) nextIndex += 1;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = items.length - 1;
    else return;

    event.preventDefault();
    const target = items[Math.max(0, Math.min(nextIndex, items.length - 1))];
    if (!target) return;
    onSelect(target.id);
    itemRefs.current.get(target.id)?.focus({ preventScroll: true });
  }

  return (
    <aside
      aria-label="Playlist dos minicursos"
      className="min-w-0 overflow-hidden rounded-2xl border border-evo-border bg-evo-card"
    >
      <header className="flex items-center justify-between gap-3 border-b border-evo-border px-4 py-4">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-evo-textMain">
            <ListVideo
              size={18}
              className="text-evo-accent"
              aria-hidden="true"
            />
            Playlist
          </h3>
          <p className="mt-1 text-xs text-evo-textSec" aria-live="polite">
            {String(Math.max(0, selectedIndex + 1)).padStart(2, "0")} de{" "}
            {String(items.length).padStart(2, "0")} aulas · {completedCount} concluídas
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            aria-label="Selecionar aula anterior"
            disabled={selectedIndex <= 0}
            onClick={() => selectAdjacent(-1)}
            className="grid h-11 w-11 place-items-center rounded-lg border border-evo-border text-evo-textMain transition-colors hover:border-evo-accent/60 hover:bg-evo-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-evo-accent disabled:cursor-not-allowed disabled:opacity-35 motion-reduce:transition-none"
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Selecionar próxima aula"
            disabled={selectedIndex < 0 || selectedIndex >= items.length - 1}
            onClick={() => selectAdjacent(1)}
            className="grid h-11 w-11 place-items-center rounded-lg border border-evo-border text-evo-textMain transition-colors hover:border-evo-accent/60 hover:bg-evo-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-evo-accent disabled:cursor-not-allowed disabled:opacity-35 motion-reduce:transition-none"
          >
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
      </header>

      <ol
        ref={listRef}
        aria-label="Aulas disponíveis"
        onKeyDown={handleListKeyDown}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain p-3 lg:max-h-[26rem] lg:snap-none lg:flex-col lg:gap-2 lg:overflow-x-hidden lg:overflow-y-auto lg:overscroll-y-contain"
      >
        {items.map((item, index) => {
          const isSelected = selectedId === item.id;
          const ThumbnailIcon = thumbnailIcons[index % thumbnailIcons.length];

          return (
            <li key={item.id} className="w-[min(18rem,calc(100vw_-_5rem))] shrink-0 snap-start lg:w-full">
              <button
                ref={(element) => {
                  if (element) itemRefs.current.set(item.id, element);
                  else itemRefs.current.delete(item.id);
                }}
                type="button"
                data-playlist-item={item.id}
                aria-current={isSelected ? "true" : undefined}
                onClick={() => onSelect(item.id)}
                className={`flex h-full w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-evo-accent motion-reduce:transition-none ${
                  isSelected
                    ? "border-evo-accent/65 bg-evo-accent/10"
                    : "border-transparent bg-evo-bgMain/40 hover:border-evo-border hover:bg-evo-bgMain/75"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-lg border ${
                    isSelected
                      ? "border-evo-accent/40 bg-evo-accent/15 text-evo-accent"
                      : "border-evo-border bg-evo-bgMain text-evo-textSec"
                  }`}
                >
                  <span className="absolute -right-5 -top-5 h-16 w-16 rounded-full border border-current opacity-15" />
                  <span className="absolute -bottom-5 -left-3 h-14 w-14 rounded-full border border-current opacity-15" />
                  <ThumbnailIcon size={30} strokeWidth={1.5} />
                  <span className="absolute bottom-1.5 left-2 text-[10px] font-bold tracking-widest">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {isSelected ? (
                    <span className="absolute bottom-1.5 right-1.5 grid h-5 w-5 place-items-center rounded-full bg-evo-accent text-evo-bgMain">
                      <Play size={10} fill="currentColor" />
                    </span>
                  ) : null}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-evo-textSec">
                    Aula {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-evo-textMain">
                    {item.title}
                  </span>
                  <span className="mt-1 line-clamp-2 text-xs leading-5 text-evo-textSec">
                    {item.subtitle}
                  </span>
                  <span className="sr-only">
                    {item.courseTitle}
                  </span>
                  <span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-evo-textSec">
                    <span className="inline-flex items-center gap-1">
                      <Clock3 size={11} aria-hidden="true" />
                      Leitura · {item.readingMinutes} min
                    </span>
                    <span>
                      {item.locked ? "Conteúdo com conta gratuita" : item.videoAvailable
                        ? "Vídeo disponível"
                        : "Vídeo em preparação"}
                    </span>
                  </span>
                  {item.locked ? (
                    <span className="mt-2 inline-flex items-center gap-1 rounded border border-evo-border px-1.5 py-1 text-[10px] font-medium text-evo-textSec">
                      <LockKeyhole size={11} aria-hidden="true" />
                      Requer conta
                    </span>
                  ) : item.completed ? (
                    <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-evo-accent">
                      <CheckCircle2 size={12} aria-hidden="true" />
                      Exercício concluído
                    </span>
                  ) : isSelected ? (
                    <span className="mt-2 inline-block text-[10px] font-semibold text-evo-accent">
                      Aula selecionada
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {items.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-evo-textSec">
          As aulas aparecerão aqui quando estiverem disponíveis.
        </p>
      ) : (
        <p className="border-t border-evo-border px-4 py-3 text-[11px] leading-5 text-evo-textSec">
          O progresso acompanha os exercícios concluídos. Use as setas do teclado para escolher uma aula.
        </p>
      )}
    </aside>
  );
}
