import { useEffect, useRef, type KeyboardEvent } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ListVideo,
  LockKeyhole,
} from "lucide-react";
import "./learning-workspace.css";

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
      className="ediv-learning-playlist"
    >
      <header className="ediv-learning-playlist-heading">
        <div className="min-w-0">
          <h3 className="ediv-learning-playlist-title">
            <ListVideo size={18} aria-hidden="true" />
            Aulas do curso
          </h3>
          <p
            className="ediv-learning-playlist-position"
            aria-live="polite"
            aria-atomic="true"
          >
            {String(Math.max(0, selectedIndex + 1)).padStart(2, "0")} de{" "}
            {String(items.length).padStart(2, "0")} aulas
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            aria-label="Selecionar aula anterior"
            disabled={selectedIndex <= 0}
            onClick={() => selectAdjacent(-1)}
            className="ediv-learning-navigation-button"
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Selecionar próxima aula"
            disabled={selectedIndex < 0 || selectedIndex >= items.length - 1}
            onClick={() => selectAdjacent(1)}
            className="ediv-learning-navigation-button"
          >
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
      </header>

      {items.length > 0 && (
        <div className="ediv-learning-playlist-progress">
          <div className="ediv-learning-progress-label">
            <span>Exercícios concluídos</span>
            <strong>
              {completedCount}
              <span> / {items.length}</span>
            </strong>
          </div>
          <div
            className="ediv-learning-progress-track"
            role="progressbar"
            aria-label="Exercícios concluídos neste curso"
            aria-valuemin={0}
            aria-valuemax={items.length}
            aria-valuenow={completedCount}
          >
            <span
              style={{ transform: `scaleX(${completedCount / items.length})` }}
            />
          </div>
        </div>
      )}

      <ol
        ref={listRef}
        aria-label="Aulas disponíveis"
        onKeyDown={handleListKeyDown}
        className="ediv-learning-playlist-list"
      >
        {items.map((item, index) => {
          const isSelected = selectedId === item.id;
          return (
            <li key={item.id} className="ediv-learning-playlist-slide">
              <button
                ref={(element) => {
                  if (element) itemRefs.current.set(item.id, element);
                  else itemRefs.current.delete(item.id);
                }}
                type="button"
                data-playlist-item={item.id}
                aria-current={isSelected ? "true" : undefined}
                onClick={() => onSelect(item.id)}
                className={`ediv-learning-lesson${isSelected ? " ediv-learning-lesson-selected" : ""}`}
              >
                <span aria-hidden="true" className="ediv-learning-lesson-cover">
                  <span className="ediv-learning-lesson-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </span>

                <span className="min-w-0 flex-1">
                  <span className="ediv-learning-lesson-kicker">
                    {item.locked ? (
                      <>
                        <LockKeyhole size={12} aria-hidden="true" /> Requer
                        conta
                      </>
                    ) : item.completed ? (
                      <>
                        <CheckCircle2 size={12} aria-hidden="true" /> Exercício
                        concluído
                      </>
                    ) : isSelected ? (
                      <span className="ediv-learning-lesson-current">
                        Aula aberta
                      </span>
                    ) : (
                      "Leitura disponível"
                    )}
                  </span>
                  <span className="ediv-learning-lesson-title">
                    {item.title}
                  </span>
                  <span className="ediv-learning-lesson-subtitle">
                    {item.subtitle}
                  </span>
                  <span className="sr-only">
                    Aula {index + 1} · {item.courseTitle}
                  </span>
                  <span className="ediv-learning-lesson-meta">
                    <span className="inline-flex items-center gap-1">
                      <Clock3 size={12} aria-hidden="true" />
                      Leitura estimada · {item.readingMinutes} min
                    </span>
                    {!item.locked && (
                      <span>
                        {item.videoAvailable
                          ? "Vídeo disponível"
                          : "Vídeo em preparação"}
                      </span>
                    )}
                  </span>
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
        <p className="ediv-learning-playlist-help">
          <span className="lg:hidden">Deslize para escolher outra aula.</span>
          <span className="hidden lg:inline">
            Navegue pelas aulas com as setas do teclado.
          </span>
        </p>
      )}
    </aside>
  );
}
