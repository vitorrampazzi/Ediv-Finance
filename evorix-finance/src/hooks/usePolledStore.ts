import { useSyncExternalStore } from "react";
import {
  initialSnapshot,
  type PolledSnapshot,
  type PolledStore,
} from "../lib/polledStore";

// Without a store (feature off, invalid ticker) nothing is requested.
const idle: PolledSnapshot<never> = Object.freeze({
  data: null,
  loading: false,
  failed: false,
  error: null,
});
const noSubscription = () => () => {};
const readIdle = () => idle;
// The server render and hydration always start from the loading state.
const readInitial = () => initialSnapshot;

export function usePolledStore<T>(
  store: PolledStore<T> | null,
): PolledSnapshot<T> {
  return useSyncExternalStore(
    store?.subscribe ?? noSubscription,
    store?.getSnapshot ?? readIdle,
    store ? readInitial : readIdle,
  );
}
