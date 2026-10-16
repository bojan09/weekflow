"use client";

import { addDays, formatRange, weekDates, type ISODate } from "@/lib/dates";
import { usePrefsStore } from "@/prefs/store";
import { usePlannerStore, type PlannerView } from "@/stores/planner";
import { useNow, type Now } from "./use-now";

export interface Planner {
  now: Now | null;
  /** The day the planner is centred on (today until the user navigates). */
  anchor: ISODate | null;
  view: PlannerView;
  week: ISODate[];
  rangeLabel: string;
  isCurrentWeek: boolean;
  step: (direction: -1 | 1) => void;
  goToday: () => void;
  setAnchor: (date: ISODate) => void;
  setView: (view: PlannerView) => void;
}

/** Shared navigation state for the week/day/agenda views. */
export function usePlanner(): Planner {
  const now = useNow();
  const anchorState = usePlannerStore((s) => s.anchor);
  const viewState = usePlannerStore((s) => s.view);
  const setAnchorState = usePlannerStore((s) => s.setAnchor);
  const setViewState = usePlannerStore((s) => s.setView);
  const defaultView = usePrefsStore((s) => s.prefs.calendar.defaultView);

  const anchor = anchorState ?? now?.date ?? null;
  const view = viewState ?? defaultView;
  const week = anchor ? weekDates(anchor, "monday") : [];
  const first = week[0];
  const last = week[6];

  const step = (direction: -1 | 1): void => {
    if (!anchor) return;
    setAnchorState(addDays(anchor, direction * (view === "day" ? 1 : 7)));
  };

  return {
    now,
    anchor,
    view,
    week,
    rangeLabel: first && last ? formatRange(first, last) : "",
    isCurrentWeek: Boolean(now && first && now.date >= first && now.date <= (last ?? first)),
    step,
    goToday: () => setAnchorState(null),
    setAnchor: setAnchorState,
    setView: setViewState,
  };
}
