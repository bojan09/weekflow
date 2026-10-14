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
  /** Soft preference: tried first on each day, then the rest of that day. */
  prefer?: TimePreference;
}

export type TimePreference = "any" | "morning" | "afternoon";

/** Noon: the line between "morning" and "afternoon" for the preferred-time rule. */
export const NOON = 12 * 60;

export function fitsPreference(startMin: number, prefer: TimePreference): boolean {
  return prefer === "any" || (prefer === "morning" ? startMin < NOON : startMin >= NOON);
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
  const prefer = query.prefer ?? "any";
  const others = tasks.filter((t) => t.id !== query.excludeId);

  for (let i = 0; i < horizon; i += 1) {
    const date = addDays(query.fromDate, i);
    if (query.notAfter && date > query.notAfter) return null;
    if (scheduledMinutes(others, date) + query.durationMin > cap) continue;

    const busy: Interval[] = others
      .filter((t) => t.status === "todo" && isTimed(t) && t.placement.date === date)
      .map((t) => ({
        start: (t.placement?.startMin ?? 0) - planning.bufferMin,
        end: (t.placement?.startMin ?? 0) + t.durationMin + planning.bufferMin,
      }))
      .sort((a, b) => a.start - b.start);

    const scan = (accept: (startMin: number) => boolean): number | null => {
      for (const window of workWindows(planning, date)) {
        let cursor = ceilTo(
          i === 0 && query.fromMin !== undefined ? Math.max(window.start, query.fromMin) : window.start,
          SLOT_MIN,
        );
        while (cursor + query.durationMin <= Math.min(window.end, MINUTES_PER_DAY)) {
          const clash = busy.find((b) => b.start < cursor + query.durationMin && b.end > cursor);
          if (clash) {
            cursor = ceilTo(clash.end, SLOT_MIN);
          } else if (accept(cursor)) {
            return cursor;
          } else {
            cursor += SLOT_MIN;
          }
        }
      }
      return null;
    };

    const preferred = prefer === "any" ? null : scan((m) => fitsPreference(m, prefer));
    const startMin = preferred ?? scan(() => true);
    if (startMin !== null) return { date, startMin };
  }
  return null;
}

/** The parts of a day outside working time (including breaks), for shading. */
export function offHours(planning: PlanningPrefs, date: ISODate): Interval[] {
  let rest: Interval[] = [{ start: 0, end: MINUTES_PER_DAY }];
  for (const window of workWindows(planning, date)) rest = subtract(rest, window);
  return rest;
}
