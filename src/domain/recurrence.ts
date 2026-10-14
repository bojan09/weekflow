import { addDays, diffDays, formatShort, startOfWeek, weekdayOf, type ISODate } from "@/lib/dates";
import { WEEKDAYS } from "@/lib/time";
import type { Recurrence, Task } from "./tasks";

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/** Add months, keeping the day of the month but clamping to the month's end (31 Jan + 1 month = 28 Feb). */
export function addMonthsClamped(date: ISODate, months: number): ISODate {
  const year = Number(date.slice(0, 4));
  const monthIndex = Number(date.slice(5, 7)) - 1 + months;
  const day = Number(date.slice(8, 10));
  const target = new Date(Date.UTC(year, monthIndex, 1));
  const y = target.getUTCFullYear();
  const m = target.getUTCMonth();
  const d = Math.min(day, daysInMonth(y, m));
  return `${String(y).padStart(4, "0")}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** The day after `from` that the rule lands on. */
export function nextDate(rule: Recurrence, from: ISODate): ISODate {
  switch (rule.freq) {
    case "daily":
      return addDays(from, rule.interval);
    case "monthly":
      return addMonthsClamped(from, rule.interval);
    case "weekly": {
      if (rule.weekdays.length === 0) return addDays(from, 7 * rule.interval);
      const fromWeek = startOfWeek(from, "monday");
      for (let d = 1; d <= 7 * rule.interval + 7; d += 1) {
        const candidate = addDays(from, d);
        if (!rule.weekdays.includes(weekdayOf(candidate))) continue;
        const weeks = diffDays(fromWeek, startOfWeek(candidate, "monday")) / 7;
        if (weeks % rule.interval === 0) return candidate;
      }
      return addDays(from, 7 * rule.interval);
    }
  }
}

const MAX_ROLL = 400;

/**
 * The next open copy of a repeating task, or null when it does not repeat or
 * the rule has ended. Dates shift from the task's placed day, else its
 * deadline, else `today`. A copy never lands before today, so finishing a
 * daily task a week late does not create a week of missed copies.
 */
export function nextOccurrence(task: Task, today: ISODate, id: string, createdAt: string): Task | null {
  const rule = task.recurrence;
  if (!rule) return null;
  const base = task.placement?.date ?? task.deadline ?? today;

  let next = nextDate(rule, base);
  for (let i = 0; next < today && i < MAX_ROLL; i += 1) next = nextDate(rule, next);
  if (rule.until && next > rule.until) return null;

  const shift = diffDays(base, next);
  return {
    ...task,
    id,
    status: "todo",
    completedOn: null,
    actualMin: null,
    createdAt,
    checklist: task.checklist.map((item) => ({ ...item, done: false })),
    dependsOn: [],
    placement: task.placement ? { date: next, startMin: task.placement.startMin } : null,
    locked: task.placement !== null && task.locked,
    deadline: task.deadline ? addDays(task.deadline, shift) : null,
    earliestStart: task.earliestStart ? addDays(task.earliestStart, shift) : null,
  };
}

const plural = (n: number, unit: string): string => (n === 1 ? unit : `${n} ${unit}s`);

/** "Every day", "Every 2 weeks on Mon, Wed", "Every month until Dec 1". */
export function describeRecurrence(rule: Recurrence): string {
  const unit = rule.freq === "daily" ? "day" : rule.freq === "weekly" ? "week" : "month";
  let text = `Every ${plural(rule.interval, unit)}`;
  if (rule.freq === "weekly" && rule.weekdays.length > 0) {
    const names = [...rule.weekdays].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((d) => WEEKDAYS[d]?.short ?? "");
    text += ` on ${names.join(", ")}`;
  }
  if (rule.until) text += ` until ${formatShort(rule.until)}`;
  return text;
}
