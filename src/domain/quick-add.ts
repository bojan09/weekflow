import { addDays, isValidISO, weekdayOf, type ISODate } from "@/lib/dates";
import { clampDuration } from "./task-ops";
import type { Priority } from "./tasks";

export interface QuickAddResult {
  title: string;
  durationMin: number | null;
  priority: Priority | null;
  deadline: ISODate | null;
}

const DAY_NAMES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

/**
 * Parse a fast-entry line such as "Write report 1h30 !high due fri".
 *
 *   duration  45m · 2h · 1h30 · 1.5h
 *   priority  !low · !med · !high · !l · !m · !h
 *   deadline  due today · due tomorrow · due mon … sun · due 2026-10-30
 *
 * Recognised tokens are removed from the title; everything else is kept as typed.
 */
export function parseQuickAdd(input: string, today: ISODate): QuickAddResult {
  let durationMin: number | null = null;
  let priority: Priority | null = null;
  let deadline: ISODate | null = null;
  const kept: string[] = [];

  const tokens = input.trim().split(/\s+/).filter(Boolean);
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i] ?? "";
    const lower = token.toLowerCase();

    const bang = /^!(low|l|med|medium|m|high|h)$/.exec(lower);
    if (bang && priority === null) {
      const key = bang[1] ?? "";
      priority = key.startsWith("h") ? "high" : key.startsWith("l") ? "low" : "medium";
      continue;
    }

    if (lower === "due" && i + 1 < tokens.length) {
      const parsed = parseDue(tokens[i + 1] ?? "", today);
      if (parsed && deadline === null) {
        deadline = parsed;
        i += 1;
        continue;
      }
    }

    const duration = parseDuration(lower);
    if (duration !== null && durationMin === null) {
      durationMin = clampDuration(duration);
      continue;
    }

    kept.push(token);
  }

  return { title: kept.join(" "), durationMin, priority, deadline };
}

function parseDuration(token: string): number | null {
  const hm = /^(\d+)h(\d{1,2})m?$/.exec(token);
  if (hm) return Number(hm[1]) * 60 + Number(hm[2]);
  const hours = /^(\d+(?:\.\d+)?)h$/.exec(token);
  if (hours) return Math.round(Number(hours[1]) * 60);
  const minutes = /^(\d+)m(?:in)?$/.exec(token);
  if (minutes) return Number(minutes[1]);
  return null;
}

function parseDue(word: string, today: ISODate): ISODate | null {
  const lower = word.toLowerCase();
  if (lower === "today") return today;
  if (lower === "tomorrow" || lower === "tmrw") return addDays(today, 1);
  if (isValidISO(lower)) return lower;
  const index = DAY_NAMES.findIndex((d) => lower.startsWith(d));
  if (index === -1) return null;
  // Next occurrence of that weekday, strictly after today.
  const delta = ((index - weekdayOf(today) + 6) % 7) + 1;
  return addDays(today, delta);
}
