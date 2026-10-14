import type { WeekStart } from "./time";

/** Calendar date as "YYYY-MM-DD". All date math is done in UTC so it is DST-proof. */
export type ISODate = string;

const MS_PER_DAY = 86_400_000;
const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const pad = (n: number): string => String(n).padStart(2, "0");

export function isValidISO(value: string): boolean {
  const match = ISO_RE.exec(value);
  if (!match) return false;
  const [, y, m, d] = match;
  const ms = Date.UTC(Number(y), Number(m) - 1, Number(d));
  return toISO(ms) === value;
}

export function parseISO(date: ISODate): number {
  const match = ISO_RE.exec(date);
  if (!match) throw new Error(`Invalid date: ${date}`);
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function toISO(ms: number): ISODate {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function addDays(date: ISODate, days: number): ISODate {
  return toISO(parseISO(date) + days * MS_PER_DAY);
}

/** Whole days from a to b (b - a). */
export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((parseISO(b) - parseISO(a)) / MS_PER_DAY);
}

/** 0 = Sunday … 6 = Saturday. */
export function weekdayOf(date: ISODate): number {
  return new Date(parseISO(date)).getUTCDay();
}

const WEEK_START_INDEX: Record<WeekStart, number> = { sunday: 0, monday: 1, saturday: 6 };

export function startOfWeek(date: ISODate, weekStart: WeekStart): ISODate {
  const offset = (weekdayOf(date) - WEEK_START_INDEX[weekStart] + 7) % 7;
  return addDays(date, -offset);
}

export function weekDates(date: ISODate, weekStart: WeekStart): ISODate[] {
  const start = startOfWeek(date, weekStart);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** Local calendar date of a Date (what the user sees on their wall calendar). */
export function localISO(now: Date): ISODate {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Minutes since local midnight. */
export function localMinutes(now: Date): number {
  return now.getHours() * 60 + now.getMinutes();
}

const fmt = (date: ISODate, options: Intl.DateTimeFormatOptions): string =>
  new Date(parseISO(date)).toLocaleDateString("en-US", { ...options, timeZone: "UTC" });

export const formatWeekdayShort = (date: ISODate): string => fmt(date, { weekday: "short" });
export const formatWeekdayLong = (date: ISODate): string => fmt(date, { weekday: "long" });
export const formatDayNumber = (date: ISODate): string => fmt(date, { day: "numeric" });
export const formatMonthYear = (date: ISODate): string => fmt(date, { month: "long", year: "numeric" });
export const formatShort = (date: ISODate): string => fmt(date, { month: "short", day: "numeric" });
export const formatLong = (date: ISODate): string =>
  fmt(date, { weekday: "long", month: "long", day: "numeric" });

/** "Apr 21 – Apr 27, 2026" (year shown once, at the end). */
export function formatRange(start: ISODate, end: ISODate): string {
  const year = fmt(end, { year: "numeric" });
  return `${formatShort(start)} – ${formatShort(end)}, ${year}`;
}

/** Six weeks of dates covering the month of `date`, for a month grid. */
export function monthGrid(date: ISODate, weekStart: WeekStart): ISODate[][] {
  const first = `${date.slice(0, 7)}-01`;
  const gridStart = startOfWeek(first, weekStart);
  return Array.from({ length: 6 }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => addDays(gridStart, w * 7 + d)),
  );
}

export function isSameMonth(a: ISODate, b: ISODate): boolean {
  return a.slice(0, 7) === b.slice(0, 7);
}

export function addMonths(date: ISODate, months: number): ISODate {
  const y = Number(date.slice(0, 4));
  const m = Number(date.slice(5, 7)) - 1 + months;
  const first = Date.UTC(y, m, 1);
  return `${toISO(first).slice(0, 7)}-01`;
}
