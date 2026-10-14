"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { PREFS_STORAGE_KEY } from "./boot-script";
import {
  DEFAULT_PREFS,
  sanitizePrefs,
  sectionSchema,
  type Prefs,
  type PrefsSection,
} from "./schema";

interface PrefsState {
  prefs: Prefs;
  hydrated: boolean;
  /** Merge a partial update into one section. Invalid results are rejected. */
  update: <S extends PrefsSection>(section: S, patch: Partial<Prefs[S]>) => void;
  /** Reset one section, or everything, to defaults. */
  reset: (section?: PrefsSection) => void;
}

/**
 * Per-user preferences. Persisted to localStorage now; the same shape syncs to
 * the user's Appwrite profile when accounts ship. Hydration is manual
 * (skipHydration) so server and first client render agree, then
 * PrefsProvider rehydrates in a layout effect before paint.
 */
export const usePrefsStore = create<PrefsState>()(
  persist(
    (set) => ({
      prefs: DEFAULT_PREFS,
      hydrated: false,
      update: (section, patch) =>
        set((state) => {
          const candidate = { ...state.prefs[section], ...patch };
          const parsed = sectionSchema(section).safeParse(candidate);
          if (!parsed.success) return state;
          return { prefs: { ...state.prefs, [section]: parsed.data } };
        }),
      reset: (section) =>
        set((state) => ({
          prefs: section
            ? { ...state.prefs, [section]: DEFAULT_PREFS[section] }
            : DEFAULT_PREFS,
        })),
    }),
    {
      name: PREFS_STORAGE_KEY,
      version: 1,
      skipHydration: true,
      partialize: (state) => ({ prefs: state.prefs }),
      merge: (persisted, current) => {
        const raw = (persisted as { prefs?: unknown } | undefined)?.prefs;
        return { ...current, prefs: sanitizePrefs(raw) };
      },
    },
  ),
);
