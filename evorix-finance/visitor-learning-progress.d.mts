export const visitorLearningProgressKey: "ediv-learning-v1";
export type VisitorLearningSnapshot = Readonly<{
  completed: readonly string[];
  persisted: boolean;
}>;
export function createVisitorLearningProgress(
  storage: Pick<Storage, "getItem" | "setItem"> | undefined,
  allowedLessonIds: readonly string[],
): {
  get(): VisitorLearningSnapshot;
  subscribe(listener: () => void): () => void;
  complete(id: string): VisitorLearningSnapshot;
  reset(): VisitorLearningSnapshot;
  persist(): VisitorLearningSnapshot;
};
