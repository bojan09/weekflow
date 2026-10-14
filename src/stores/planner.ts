"use client";

import { create } from "zustand";
import type { CategoryId } from "@/domain/tasks";
import type { ISODate } from "@/lib/dates";

export type PlannerView = "day" | "week" | "agenda";

/**
 * Which week/day the planner shows, shared by Home and My Week so they stay
 * in step. null means "follow today" and the saved default view.
 */
interface PlannerState {
  anchor: ISODate | null;
  view: PlannerView | null;
  category: CategoryId | "all";
  setAnchor: (anchor: ISODate | null) => void;
  setView: (view: PlannerView | null) => void;
  setCategory: (category: CategoryId | "all") => void;
}

export const usePlannerStore = create<PlannerState>()((set) => ({
  anchor: null,
  view: null,
  category: "all",
  setAnchor: (anchor) => set({ anchor }),
  setView: (view) => set({ view }),
  setCategory: (category) => set({ category }),
}));
