export type TimeFormat = "12h" | "24h";

/** Format an hour/minute pair for display ("14:30" or "2:30 PM"). */
export function formatClock(hour: number, minute: number, format: TimeFormat): string {
  const mm = String(minute).padStart(2, "0");
  if (format === "24h") return `${String(hour).padStart(2, "0")}:${mm}`;
  const suffix = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${mm} ${suffix}`;
}

export const WEEKDAYS = [
  { index: 0, short: "Sun", long: "Sunday" },
  { index: 1, short: "Mon", long: "Monday" },
  { index: 2, short: "Tue", long: "Tuesday" },
  { index: 3, short: "Wed", long: "Wednesday" },
  { index: 4, short: "Thu", long: "Thursday" },
  { index: 5, short: "Fri", long: "Friday" },
  { index: 6, short: "Sat", long: "Saturday" },
] as const;

export type WeekStart = "monday" | "sunday" | "saturday";

const START_INDEX: Record<WeekStart, number> = { sunday: 0, monday: 1, saturday: 6 };

/** Weekdays in display order for the chosen first day of the week. */
export function orderedWeekdays(weekStart: WeekStart): typeof WEEKDAYS[number][] {
  const start = START_INDEX[weekStart];
  return Array.from({ length: 7 }, (_, i) => WEEKDAYS[(start + i) % 7]!);
}

export function timeToMinutes(value: string): number {
  const [h, m] = value.split(":");
  return Number(h) * 60 + Number(m);
}
