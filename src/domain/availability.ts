import { addDays, weekdayOf, type ISODate } from "@/lib/dates";
import { timeToMinutes } from "@/lib/time";
import type { Prefs } from "@/prefs/schema";
import { MINUTES_PER_DAY, isTimed, type Task } from "./tasks";

export type PlanningPrefs = Prefs["planning"];

export interface Interval {
  start: number;
  end: number;
}

export const SLOT_MIN = 15;

const ceilTo = (value: number, step: number): number => Math.ceil(value / step) * step;

function subtract(segments: Interval[], cut: Interval): Interval[] {
  const result: Interval[] = [];
  for (const seg of segments) {
    if (cut.end <= seg.start || cut.start >= seg.end) {
      result.push(seg);
      continue;
    }
    if (cut.start > seg.start) result.push({ start: seg.start, end: cut.start });
    if (cut.end < seg.end) result.push({ start: cut.end, end: seg.end });
  }
  return result;
}

/** Working intervals for a date: working hours minus breaks. Empty on non-working days. */
export function workWindows(planning: PlanningPrefs, date: ISODate): Interval[] {
  if (!planning.workDays.includes(weekdayOf(date))) return [];
  let segments: Interval[] = [
    { start: timeToMinutes(planning.workStart), end: timeToMinutes(planning.workEnd) },
  ];
  for (const brk of planning.breaks) {
    segments = subtract(segments, { start: timeToMinutes(brk.start), end: timeToMinutes(brk.end) });
  }
  return segments.filter((s) => s.end > s.start);
}

export function availableMinutes(planning: PlanningPrefs, date: ISODate): number {
  return workWindows(planning, date).reduce((sum, w) => sum + (w.end - w.start), 0);
}

/** Minutes of open work placed on a date (timed and day-only tasks both take time). */
export function scheduledMinutes(tasks: readonly Task[], date: ISODate): number {
  return tasks
    .filter((t) => t.status === "todo" && t.placement?.date === date)
    .reduce((sum, t) => sum + t.durationMin, 0);
}

export function maxDailyMinutes(planning: PlanningPrefs): number {
  return planning.maxDailyHours * 60;
}

export interface FreeSlotQuery {
  durationMin: number;
  fromDate: ISODate;
  /** Earliest start on `fromDate` (e.g. "now"); other days start at the window start. */
  fromMin?: number;
  /** Do not search past this date (a deadline), inclusive. */
  notAfter?: ISODate | null;
  /** Ignore this task's own current placement. */
  excludeId?: string;
  horizonDays?: number;
}

/**
 * First gap that fits, scanning forward from `fromDate`. Respects working days
 * and hours, breaks, the buffer between tasks, and the daily workload cap.
 * Deterministic: same input, same slot.
 */
export function findFreeSlot(
  tasks: readonly Task[],
  planning: PlanningPrefs,
  query: FreeSlotQuery,
): { date: ISODate; startMin: number } | null {
  const horizon = query.horizonDays ?? 28;
  const cap = maxDailyMinutes(planning);

  for (let i = 0; i < horizon; i += 1) {
    const date = addDays(query.fromDate, i);
    if (query.notAfter && date > query.notAfter) return null;

    const others = tasks.filter((t) => t.id !== query.excludeId);
    if (scheduledMinutes(others, date) + query.durationMin > cap) continue;

    const busy: Interval[] = others
      .filter((t) => t.status === "todo" && isTimed(t) && t.placement.date === date)
      .map((t) => ({
        start: (t.placement?.startMin ?? 0) - planning.bufferMin,
        end: (t.placement?.startMin ?? 0) + t.durationMin + planning.bufferMin,
      }))
      .sort((a, b) => a.start - b.start);

    for (const window of workWindows(planning, date)) {
      let cursor = ceilTo(
        i === 0 && query.fromMin !== undefined ? Math.max(window.start, query.fromMin) : window.start,
        SLOT_MIN,
      );
      while (cursor + query.durationMin <= Math.min(window.end, MINUTES_PER_DAY)) {
        const clash = busy.find((b) => b.start < cursor + query.durationMin && b.end > cursor);
        if (!clash) return { date, startMin: cursor };
        cursor = ceilTo(clash.end, SLOT_MIN);
      }
    }
  }
  return null;
}

/** The parts of a day outside working time (including breaks), for shading. */
export function offHours(planning: PlanningPrefs, date: ISODate): Interval[] {
  let rest: Interval[] = [{ start: 0, end: MINUTES_PER_DAY }];
  for (const window of workWindows(planning, date)) rest = subtract(rest, window);
  return rest;
}
