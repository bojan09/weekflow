"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";
import { APP_ROUTES, type AppRoute } from "@/lib/routes";
import type { StepId } from "./progress";

export const GUIDE_STORAGE_KEY = "weekflow:demo:guide";

const stepIds = ["add-task", "schedule-task", "lock-task", "preview-plan", "check-rules", "open-review"] as const;
const persistedSchema = z.object({
  done: z.partialRecord(z.enum(stepIds), z.literal(true)).default({}),
  panelHidden: z.boolean().default(false),
  dismissedHints: z.partialRecord(z.enum(APP_ROUTES), z.literal(true)).default({}),
});

interface GuideState {
  done: Partial<Record<StepId, true>>;
  panelHidden: boolean;
  dismissedHints: Partial<Record<AppRoute, true>>;
  /** True once saved progress has been read. Surfaces wait for it to avoid a flash. */
  hydrated: boolean;
  complete: (ids: readonly StepId[]) => void;
  hidePanel: () => void;
  showPanel: () => void;
  dismissHint: (route: AppRoute) => void;
  /** Start over: show Start here again with nothing ticked and every hint back. */
  replay: () => void;
}

/**
 * Onboarding progress. Browser-only like the rest of the demo; it moves to the
 * account in 0.1.0. Hydration is manual so server and first client render agree.
 */
export const useGuideStore = create<GuideState>()(
  persist(
    (set) => ({
      done: {},
      panelHidden: false,
      dismissedHints: {},
      hydrated: false,
      complete: (ids) =>
        set((state) => {
          const fresh = ids.filter((id) => !state.done[id]);
          if (fresh.length === 0) return state;
          return { done: { ...state.done, ...Object.fromEntries(fresh.map((id) => [id, true as const])) } };
        }),
      hidePanel: () => set({ panelHidden: true }),
      showPanel: () => set({ panelHidden: false }),
      dismissHint: (route) => set((state) => ({ dismissedHints: { ...state.dismissedHints, [route]: true } })),
      replay: () => set({ done: {}, dismissedHints: {}, panelHidden: false }),
    }),
    {
      name: GUIDE_STORAGE_KEY,
      version: 1,
      skipHydration: true,
      partialize: (state) => ({
        done: state.done,
        panelHidden: state.panelHidden,
        dismissedHints: state.dismissedHints,
      }),
      merge: (persisted, current) => {
        const parsed = persistedSchema.safeParse(persisted);
        return { ...current, ...(parsed.success ? parsed.data : { done: {}, panelHidden: false, dismissedHints: {} }) };
      },
    },
  ),
);
