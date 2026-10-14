"use client";

import { useSyncExternalStore } from "react";
import type { Collection } from "./collection";
import { useSimulator } from "./simulator";

export type ResourceState<T> =
  | { status: "loading" }
  | { status: "ready"; data: T }
  | { status: "error"; message: string; retry: () => void }
  | { status: "denied" };

/**
 * Subscribe to a collection and report one of four states. The first render
 * (server and hydration) is always "loading", so there is never a hydration
 * mismatch. The demo simulator can force any state.
 */
export function useCollection<T>(collection: Collection<T>): ResourceState<T> {
  const value = useSyncExternalStore<T | null>(
    collection.subscribe,
    collection.getSnapshot,
    collection.getServerSnapshot,
  );
  const mode = useSimulator((s) => s.mode);
  const setMode = useSimulator((s) => s.setMode);

  if (mode === "loading") return { status: "loading" };
  if (mode === "denied") return { status: "denied" };
  if (mode === "error") {
    return {
      status: "error",
      message: "Simulated error: this is how a failed load looks.",
      retry: () => setMode("none"),
    };
  }
  if (value === null) return { status: "loading" };
  return { status: "ready", data: value };
}
