import { z } from "zod";
import { isValidISO } from "@/lib/dates";
import { placementSchema, type Placement, type Task } from "./tasks";

/**
 * A saved copy of where every open task sat, taken just before a bulk change.
 * It stores placements only, not whole tasks, so it stays small and restoring
 * never undoes edits to titles, notes or checklists.
 */
export const snapshotSchema = z.object({
  id: z.string().min(1),
  /** ISO timestamp. */
  at: z.string().min(1),
  label: z.string().min(1).max(80),
  entries: z.record(z.string(), placementSchema.nullable()),
});

export type ScheduleSnapshot = z.infer<typeof snapshotSchema>;

export const MAX_SNAPSHOTS = 20;

export const historySchema = z.array(snapshotSchema).max(MAX_SNAPSHOTS);

export function captureSchedule(tasks: readonly Task[], id: string, at: string, label: string): ScheduleSnapshot {
  const entries: ScheduleSnapshot["entries"] = {};
  for (const task of tasks) {
    if (task.status === "todo") entries[task.id] = task.placement ? { ...task.placement } : null;
  }
  return { id, at, label, entries };
}

const same = (a: Placement | null, b: Placement | null): boolean =>
  a === b || (a !== null && b !== null && a.date === b.date && a.startMin === b.startMin);

export interface ScheduleChange {
  taskId: string;
  title: string;
  /** Where the task is now. */
  from: Placement | null;
  /** Where restoring would put it. */
  to: Placement | null;
}

/** What restoring a snapshot would change. Locked, finished and since-deleted tasks are left alone. */
export function snapshotChanges(snapshot: ScheduleSnapshot, tasks: readonly Task[]): ScheduleChange[] {
  const changes: ScheduleChange[] = [];
  for (const task of tasks) {
    if (task.status !== "todo" || task.locked || !(task.id in snapshot.entries)) continue;
    const to = snapshot.entries[task.id] ?? null;
    if (to && !isValidISO(to.date)) continue;
    if (!same(task.placement, to)) changes.push({ taskId: task.id, title: task.title, from: task.placement, to });
  }
  return changes;
}

export function restoreSchedule(tasks: readonly Task[], snapshot: ScheduleSnapshot): Task[] {
  const changes = new Map(snapshotChanges(snapshot, tasks).map((c) => [c.taskId, c.to] as const));
  if (changes.size === 0) return tasks as Task[];
  return tasks.map((task) => {
    if (!changes.has(task.id)) return task;
    const to = changes.get(task.id) ?? null;
    return { ...task, placement: to ? { date: to.date, startMin: to.startMin } : null };
  });
}

/** Newest first, capped. */
export function pushSnapshot(history: readonly ScheduleSnapshot[], snapshot: ScheduleSnapshot): ScheduleSnapshot[] {
  return [snapshot, ...history].slice(0, MAX_SNAPSHOTS);
}
