import { useCallback, useEffect, useSyncExternalStore } from "react";
import type { AuthUser } from "../context/AuthProvider";
import { createOnboardingStore } from "../../onboarding.mjs";

let browserStore: ReturnType<typeof createOnboardingStore> | undefined;
function store() {
  if (!browserStore) {
    let storage: Storage | undefined;
    try {
      storage = window.localStorage;
    } catch {
      /* In-memory progress remains available. */
    }
    browserStore = createOnboardingStore(storage);
    window.addEventListener("storage", (event) =>
      browserStore?.sync(event.key),
    );
  }
  return browserStore;
}

export function requestOnboardingReplay() {
  window.dispatchEvent(new Event("ediv:replay-onboarding"));
}

export function useOnboarding(
  user: AuthUser | null,
  destination: string,
  requested = false,
) {
  const subscribe = useCallback(
    (listener: () => void) => store().subscribe(listener),
    [],
  );
  const getSnapshot = useCallback(
    () => store().get(user, destination, requested),
    [user, destination, requested],
  );
  const progress = useSyncExternalStore(subscribe, getSnapshot, () => null);
  useEffect(() => {
    if (user) store().persist(user);
  }, [user]);
  const setStep = useCallback(
    (step: number) => {
      if (user) store().setStep(user, step);
    },
    [user],
  );
  const complete = useCallback(() => {
    if (user) store().complete(user);
  }, [user]);
  const restart = useCallback(
    (destination: string) => {
      if (user) store().restart(user, destination);
    },
    [user],
  );
  return {
    active: progress?.active ?? false,
    step: progress?.step ?? 0,
    returnTo: progress?.returnTo ?? "/app",
    persisted: progress?.persisted ?? true,
    setStep,
    complete,
    restart,
  };
}
