// Only the signup journey requests an introduction. An ordinary login never
// starts one, regardless of account age. Completion is local to this browser.
export const onboardingStoragePrefix = "ediv-introduction-v1:";
export const onboardingStepCount = 6;

export function onboardingEligible(user) {
  return Boolean(user?.id && user.emailVerified);
}

export function cleanOnboardingDestination(value) {
  if (
    typeof value !== "string" ||
    value.length > 1500 ||
    !/^\/(?!\/)/.test(value) ||
    /[\\\x00-\x1f]/.test(value)
  )
    return "/app";
  try {
    const url = new URL(value, "https://ediv.invalid");
    if (
      url.origin !== "https://ediv.invalid" ||
      !/^(?:\/app(?:\/[^?#]*)?|\/ranking(?:\/acao\/[A-Za-z0-9._-]{1,16})?|\/aprender|\/mercado|\/assessoria|\/suporte|\/)\/?$/.test(
        url.pathname,
      )
    )
      return "/app";
    url.searchParams.delete("introducao");
    url.searchParams.delete("destino");
    return (
      (url.pathname === "/" ? "/app" : url.pathname) + url.search + url.hash
    );
  } catch {
    return "/app";
  }
}

export function onboardingEntryDestination(destination) {
  const target = cleanOnboardingDestination(destination);
  const entry = "/app?introducao=1&destino=" + encodeURIComponent(target);
  return entry.length <= 1500 ? entry : "/app?introducao=1";
}

export function createOnboardingStore(storage) {
  const cache = new Map();
  const dormant = new Set();
  const listeners = new Set();
  const notify = () => listeners.forEach((listener) => listener());
  const key = (id) => onboardingStoragePrefix + encodeURIComponent(id);
  function get(user, destination = "/app", requested = false) {
    const id = user?.id;
    if (!id || !user.emailVerified) return null;
    if (cache.has(id)) {
      if (requested && dormant.has(id)) cache.delete(id);
      else return cache.get(id);
    }
    let record;
    let persisted = true;
    try {
      record = JSON.parse(storage?.getItem(key(id)) || "null");
    } catch {
      persisted = false;
    }
    if (!storage) persisted = false;
    const valid =
      record?.version === 1 &&
      typeof record.completed === "boolean" &&
      Number.isInteger(record.step) &&
      record.step >= 0 &&
      record.step < onboardingStepCount &&
      typeof record.returnTo === "string";
    const state = Object.freeze({
      active: valid ? !record.completed : requested && onboardingEligible(user),
      step: valid ? record.step : 0,
      returnTo: cleanOnboardingDestination(
        valid ? record.returnTo : destination,
      ),
      persisted,
    });
    cache.set(id, state);
    if (!valid && !requested) dormant.add(id);
    else dormant.delete(id);
    return state;
  }
  function save(user, state) {
    let persisted = true;
    try {
      if (!storage) throw new Error("Storage unavailable");
      storage.setItem(
        key(user.id),
        JSON.stringify({
          version: 1,
          step: state.step,
          completed: !state.active,
          returnTo: state.returnTo,
        }),
      );
    } catch {
      persisted = false;
    }
    const next = Object.freeze({ ...state, persisted });
    cache.set(user.id, next);
    dormant.delete(user.id);
    notify();
    return next;
  }
  return {
    get,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    persist(user) {
      const state = get(user);
      return state?.active ? save(user, state) : state;
    },
    setStep(user, step) {
      const state = get(user);
      if (
        !state?.active ||
        !Number.isInteger(step) ||
        step < 0 ||
        step >= onboardingStepCount ||
        Math.abs(step - state.step) !== 1
      )
        return state;
      return save(user, { ...state, step });
    },
    complete(user) {
      const state = get(user);
      if (!state?.active || state.step !== onboardingStepCount - 1)
        return state;
      return save(user, { ...state, active: false });
    },
    restart(user, destination) {
      if (!user?.id || !user.emailVerified) return null;
      return save(user, {
        active: true,
        step: 0,
        returnTo: cleanOnboardingDestination(destination),
      });
    },
    sync(storageKey) {
      if (
        typeof storageKey !== "string" ||
        !storageKey.startsWith(onboardingStoragePrefix)
      )
        return;
      try {
        cache.delete(
          decodeURIComponent(storageKey.slice(onboardingStoragePrefix.length)),
        );
      } catch {
        return;
      }
      notify();
    },
  };
}
