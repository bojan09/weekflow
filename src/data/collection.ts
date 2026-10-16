import type { z } from "zod";
import { accountSync, resourceForKey } from "./account-client";

/**
 * The persistence port every screen talks to. The demo uses the localStorage
 * adapter below; the Appwrite adapter implements the same interface later, so
 * no screen changes when accounts ship.
 */
export interface Collection<T> {
  /** Current value. Stable between changes (safe for useSyncExternalStore). */
  getSnapshot: () => T;
  /** Server render and hydration: no stored data is available yet. */
  getServerSnapshot: () => null;
  subscribe: (listener: () => void) => () => void;
  /** Validate and persist. Throws if the value does not match the schema. */
  write: (next: T) => void;
  /** Drop stored data and fall back to the seed. */
  reset: () => void;
}

interface LocalCollectionOptions<T> {
  key: string;
  schema: z.ZodType<T>;
  seed: () => T;
}

/** localStorage-backed adapter. Corrupt or missing data falls back to the seed. */
export function createLocalCollection<T>(options: LocalCollectionOptions<T>): Collection<T> {
  const { key, schema, seed } = options;
  const listeners = new Set<() => void>();
  let cache: { raw: string | null; value: T } | undefined;

  const readRaw = (): string | null => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  };

  const getSnapshot = (): T => {
    const resource = resourceForKey(key);
    if (accountSync.isActive() && resource) return accountSync.read(resource) as T;
    const raw = readRaw();
    if (cache && cache.raw === raw) return cache.value;
    let value: T | undefined;
    if (raw !== null) {
      try {
        const parsed = schema.safeParse(JSON.parse(raw));
        if (parsed.success) value = parsed.data;
      } catch {
        // fall through to seed
      }
    }
    cache = { raw, value: value ?? seed() };
    return cache.value;
  };

  const notify = (): void => {
    for (const listener of listeners) listener();
  };

  return {
    getSnapshot,
    getServerSnapshot: () => null,
    subscribe: (listener) => {
      listeners.add(listener);
      const unsubscribeAccount = accountSync.subscribe(listener);
      const onStorage = (event: StorageEvent): void => {
        if (event.key === key || event.key === null) listener();
      };
      window.addEventListener("storage", onStorage);
      return () => {
        unsubscribeAccount();
        listeners.delete(listener);
        window.removeEventListener("storage", onStorage);
      };
    },
    write: (next) => {
      const valid = schema.parse(next);
      const resource = resourceForKey(key);
      if (accountSync.isActive() && resource) { accountSync.write(resource, valid); return; }
      window.localStorage.setItem(key, JSON.stringify(valid));
      notify();
    },
    reset: () => {
      if (accountSync.isActive()) throw new Error("Use the account data controls to clear saved data.");
      try {
        window.localStorage.removeItem(key);
      } catch {
        // storage unavailable: nothing to clear
      }
      notify();
    },
  };
}
