export const visitorLearningProgressKey = "ediv-learning-v1";

/** Browser-only progress. Failed writes keep the current session's conclusions. */
export function createVisitorLearningProgress(storage, allowedLessonIds) {
  const allowed = new Set(allowedLessonIds);
  let completed = [];
  let persisted = true;
  try {
    if (!storage) throw new Error("Storage unavailable");
    const record = JSON.parse(
      storage.getItem(visitorLearningProgressKey) || "[]",
    );
    if (Array.isArray(record)) {
      completed = [
        ...new Set(
          record.filter((id) => typeof id === "string" && allowed.has(id)),
        ),
      ];
    }
  } catch {
    persisted = false;
  }
  let snapshot = Object.freeze({
    completed: Object.freeze(completed),
    persisted,
  });
  const listeners = new Set();

  function save(next) {
    let saved = true;
    try {
      if (!storage) throw new Error("Storage unavailable");
      storage.setItem(visitorLearningProgressKey, JSON.stringify(next));
    } catch {
      saved = false;
    }
    if (
      snapshot.persisted !== saved ||
      next.length !== snapshot.completed.length ||
      next.some((id, index) => id !== snapshot.completed[index])
    ) {
      snapshot = Object.freeze({
        completed: Object.freeze([...next]),
        persisted: saved,
      });
      listeners.forEach((listener) => listener());
    }
    return snapshot;
  }
  return {
    get: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    complete(id) {
      if (!allowed.has(id) || snapshot.completed.includes(id)) return snapshot;
      return save([...snapshot.completed, id]);
    },
    reset: () => save([]),
    persist: () => save(snapshot.completed),
  };
}
