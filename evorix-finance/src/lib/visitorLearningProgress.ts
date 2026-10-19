import { useCallback, useSyncExternalStore } from "react";
import {
  createVisitorLearningProgress,
  type VisitorLearningSnapshot,
} from "../../visitor-learning-progress.mjs";
import { learningChapters } from "./learningCatalog";

let browserStore: ReturnType<typeof createVisitorLearningProgress> | undefined;
const emptySnapshot: VisitorLearningSnapshot = Object.freeze({
  completed: Object.freeze([]),
  persisted: true,
});

function store() {
  if (!browserStore) {
    let storage: Storage | undefined;
    try {
      storage = window.localStorage;
    } catch {
      /* Session-only progress. */
    }
    browserStore = createVisitorLearningProgress(storage, [
      learningChapters[0].id,
    ]);
  }
  return browserStore;
}

export function useVisitorLearningProgress(enabled: boolean) {
  const subscribe = useCallback(
    (listener: () => void) =>
      enabled ? store().subscribe(listener) : () => {},
    [enabled],
  );
  const getSnapshot = useCallback(
    () => (enabled ? store().get() : emptySnapshot),
    [enabled],
  );
  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => emptySnapshot,
  );
  return {
    ...snapshot,
    complete: (id: string) => {
      if (enabled) store().complete(id);
    },
    reset: () => {
      if (enabled) store().reset();
    },
    persist: () => {
      if (enabled) store().persist();
    },
  };
}
