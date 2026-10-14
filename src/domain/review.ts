import { addDays, type ISODate } from "@/lib/dates";
import { availableMinutes, maxDailyMinutes, scheduledMinutes, type PlanningPrefs } from "./availability";
import { CATEGORIES, isMissed, type CategoryId, type Task } from "./tasks";

/** Planned work from this share of the daily limit upward is flagged as nearly full. */
export const NEAR_LIMIT = 0.85;

export type DayLoadStatus = "off" | "light" | "near" | "over";

export interface DayLoad {
  date: ISODate;
  plannedMin: number;
  /** Working minutes the day offers (zero on days off). */
  availableMin: number;
  /** The daily workload limit from Settings. */
  capMin: number;
  status: DayLoadStatus;
}

/** Planned work against working time and the daily limit, one row per day. */
export function dayWorkload(tasks: readonly Task[], planning: PlanningPrefs, week: readonly ISODate[]): DayLoad[] {
  const capMin = maxDailyMinutes(planning);
  return week.map((date) => {
    const plannedMin = scheduledMinutes(tasks, date);
    const availableMin = availableMinutes(planning, date);
    let status: DayLoadStatus = "light";
    if (plannedMin > capMin) status = "over";
    else if (plannedMin >= capMin * NEAR_LIMIT) status = "near";
    else if (availableMin === 0 && plannedMin === 0) status = "off";
    return { date, plannedMin, availableMin, capMin, status };
  });
}

export interface CategoryShare {
  category: CategoryId;
  label: string;
  minutes: number;
  tasks: number;
}

/** Open and finished work placed in the week, grouped by category, biggest first. */
export function categoryBreakdown(tasks: readonly Task[], week: readonly ISODate[]): CategoryShare[] {
  const inWeek = new Set(week);
  const totals = new Map<CategoryId, { minutes: number; tasks: number }>();
  for (const task of tasks) {
    const date = task.status === "done" ? (task.completedOn ?? task.placement?.date) : task.placement?.date;
    if (!date || !inWeek.has(date)) continue;
    const entry = totals.get(task.category) ?? { minutes: 0, tasks: 0 };
    entry.minutes += task.status === "done" && task.actualMin !== null ? task.actualMin : task.durationMin;
    entry.tasks += 1;
    totals.set(task.category, entry);
  }
  return CATEGORIES.flatMap((c) => {
    const entry = totals.get(c.id);
    return entry ? [{ category: c.id, label: c.label, ...entry }] : [];
  }).sort((a, b) => b.minutes - a.minutes || (a.category < b.category ? -1 : 1));
}

export interface EstimateAccuracy {
  /** Finished tasks in the week that have a recorded actual time. */
  samples: number;
  estimatedMin: number;
  actualMin: number;
}

export function estimateAccuracy(tasks: readonly Task[], week: readonly ISODate[]): EstimateAccuracy {
  const inWeek = new Set(week);
  const done = tasks.filter(
    (t) => t.status === "done" && t.actualMin !== null && t.completedOn !== null && inWeek.has(t.completedOn),
  );
  return {
    samples: done.length,
    estimatedMin: done.reduce((sum, t) => sum + t.durationMin, 0),
    actualMin: done.reduce((sum, t) => sum + (t.actualMin ?? 0), 0),
  };
}

export interface WeeklyReview {
  completed: Task[];
  /** Open tasks from this week whose time has passed. */
  missed: Task[];
  /** Open tasks still planned for the rest of the week. */
  ahead: Task[];
  /** Open tasks with no place and a deadline inside the next week. */
  dueSoonUnscheduled: Task[];
  completedMin: number;
}

const text = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

const byWhen = (a: Task, b: Task): number =>
  text(a.completedOn ?? a.placement?.date ?? "", b.completedOn ?? b.placement?.date ?? "") ||
  (a.placement?.startMin ?? 0) - (b.placement?.startMin ?? 0) ||
  text(a.id, b.id);

export function weeklyReview(
  tasks: readonly Task[],
  week: readonly ISODate[],
  now: { date: ISODate; minutes: number },
): WeeklyReview {
  const inWeek = new Set(week);
  const completed = tasks
    .filter((t) => t.status === "done" && t.completedOn !== null && inWeek.has(t.completedOn))
    .sort(byWhen);
  const open = tasks.filter((t) => t.status === "todo" && t.placement !== null && inWeek.has(t.placement.date));
  const horizon = addDays(now.date, 7);
  return {
    completed,
    missed: open.filter((t) => isMissed(t, now)).sort(byWhen),
    ahead: open.filter((t) => !isMissed(t, now)).sort(byWhen),
    dueSoonUnscheduled: tasks
      .filter((t) => t.status === "todo" && t.placement === null && t.deadline !== null && t.deadline <= horizon)
      .sort((a, b) => text(a.deadline ?? "", b.deadline ?? "") || text(a.id, b.id)),
    completedMin: completed.reduce((sum, t) => sum + (t.actualMin ?? t.durationMin), 0),
  };
}
