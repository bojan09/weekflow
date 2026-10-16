import { isTimed, type Task } from "@/domain/tasks";
import type { Now } from "@/hooks/use-now";

/** Current task first, otherwise the next unfinished task in the visible dates. */
export function focusMinute(tasks: readonly Task[], days: readonly string[], now: Now | null, fallback: number): number {
  const timed = tasks.filter(isTimed).filter((task) => task.status !== "done" && days.includes(task.placement.date))
    .sort((a, b) => a.placement.date.localeCompare(b.placement.date) || a.placement.startMin - b.placement.startMin || a.id.localeCompare(b.id));
  if (now && days.includes(now.date)) {
    const current = timed.find((task) => task.placement.date === now.date && task.placement.startMin <= now.minutes && task.placement.startMin + task.durationMin > now.minutes);
    if (current) return current.placement.startMin;
    const next = timed.find((task) => task.placement.date > now.date || task.placement.date === now.date && task.placement.startMin >= now.minutes);
    return next?.placement.startMin ?? now.minutes;
  }
  return timed[0]?.placement.startMin ?? fallback;
}
