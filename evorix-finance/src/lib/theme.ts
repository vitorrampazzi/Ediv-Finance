import { useSyncExternalStore } from "react";

export type ThemePreference = "light" | "dark";
type ThemeSnapshot = Readonly<{
  theme: "light" | "dark";
  preference: ThemePreference;
}>;

declare global {
  interface Window {
    edivTheme?: {
      getSnapshot: () => ThemeSnapshot;
      subscribe: (listener: () => void) => () => void;
      setPreference: (preference: ThemePreference) => void;
    };
  }
}

// Stable SSR snapshot; all theme-dependent paint is controlled by root CSS tokens.
const serverSnapshot: ThemeSnapshot = { theme: "dark", preference: "dark" };
const getServerSnapshot = () => serverSnapshot;
const getSnapshot = () => window.edivTheme?.getSnapshot() ?? serverSnapshot;
const subscribe = (listener: () => void) =>
  window.edivTheme?.subscribe(listener) ?? (() => {});

export function useTheme() {
  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  return {
    ...snapshot,
    setPreference: (preference: ThemePreference) =>
      window.edivTheme?.setPreference(preference),
  };
}
