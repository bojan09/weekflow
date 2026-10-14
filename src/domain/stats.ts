import type { ISODate } from "@/lib/dates";
import { availableMinutes, scheduledMinutes, type PlanningPrefs } from "./availability";
import { isOverdue, type Task } from "./tasks";

export interface WeekStats {
  /** Tasks placed in, or completed during, the week. */
  total: number;
  completed: number;
  /** Open tasks whose deadline has passed (not limited to this week). */
  overdue: number;
  /** Working minutes still unscheduled from today to the end of the week. */
  freeMin: number;
  scheduledMin: number;
  availableMin: number;
}

export function weekStats(
  tasks: readonly Task[],
  planning: PlanningPrefs,
  week: readonly ISODate[],
  today: ISODate,
): WeekStats {
  const inWeek = new Set(week);
  const relevant = tasks.filter(
    (t) =>
      (t.placement !== null && inWeek.has(t.placement.date)) ||
      (t.completedOn !== null && inWeek.has(t.completedOn)),
  );

  let freeMin = 0;
  let scheduledMin = 0;
  let availableMin = 0;
  for (const date of week) {
    const available = availableMinutes(planning, date);
    const scheduled = scheduledMinutes(tasks, date);
    availableMin += available;
    scheduledMin += scheduled;
    if (date >= today) freeMin += Math.max(0, available - scheduled);
  }

  return {
    total: relevant.length,
    completed: relevant.filter((t) => t.status === "done").length,
    overdue: tasks.filter((t) => isOverdue(t, today)).length,
    freeMin,
    scheduledMin,
    availableMin,
  };
}

/** "12h 30m", "45m", "2h". */
export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
