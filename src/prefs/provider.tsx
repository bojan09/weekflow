"use client";

import { useLayoutEffect, type ReactNode } from "react";
import { setCustomCategories } from "@/domain/tasks";
import { applyPrefs } from "./apply";
import { PREFS_STORAGE_KEY } from "./boot-script";
import { usePrefsStore } from "./store";

/**
 * Loads saved preferences before first paint and keeps the document in sync
 * with the store, the OS color scheme and other tabs.
 */
export function PrefsProvider({ children }: { children: ReactNode }) {
  useLayoutEffect(() => {
    const { persist } = usePrefsStore;
    persist.rehydrate();
    usePrefsStore.setState({ hydrated: true });

    const apply = (): void => {
      const { prefs } = usePrefsStore.getState();
      setCustomCategories(prefs.workspace.customCategories);
      applyPrefs(prefs);
    };
    apply();

    const unsubscribe = usePrefsStore.subscribe(apply);
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", apply);
    const onStorage = (event: StorageEvent): void => {
      if (event.key === PREFS_STORAGE_KEY && !window.location.pathname.startsWith("/app")) persist.rehydrate();
    };
    window.addEventListener("storage", onStorage);

    return () => {
      unsubscribe();
      media.removeEventListener("change", apply);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return children;
}
