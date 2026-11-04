import { createElement, lazy, type ComponentType } from "react";

const preloads = new Map<string, () => Promise<unknown>>();

// Once its code has arrived, a page renders at once instead of suspending, so
// the prerendered HTML gives way to the same page, not to a loading screen.
export function lazyPage<P extends object>(
  load: () => Promise<ComponentType<P>>,
  paths: string[] = [],
) {
  let loaded: ComponentType<P> | undefined;
  const settle = () =>
    load().then((component) => {
      loaded = component;
      return component;
    });
  const Suspended = lazy(() =>
    settle().then((component) => ({ default: component })),
  );
  function Page(props: P) {
    return createElement(loaded ?? Suspended, props);
  }
  for (const path of paths) preloads.set(path, settle);
  return Page;
}

// Loads the code of the prerendered page being opened before the first render.
export function preloadPage(pathname: string) {
  const path = pathname === "/" ? "/" : pathname.replace(/\/+$/, "");
  return preloads.get(path)?.() ?? Promise.resolve();
}
