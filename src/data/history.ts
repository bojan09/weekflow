import { captureSchedule, historySchema, pushSnapshot, restoreSchedule, type ScheduleSnapshot } from "@/domain/history";
import type { Task } from "@/domain/tasks";
import { createLocalCollection } from "./collection";
import { tasksCollection } from "./tasks";

/** Schedule snapshots taken before bulk changes. Newest first. */
export const historyCollection = createLocalCollection<ScheduleSnapshot[]>({
  key: "weekflow:demo:schedule-history",
  schema: historySchema,
  seed: () => [],
});

/**
 * Apply a bulk change to the tasks and remember the schedule from just before
 * it, so the user can roll back later. Returns the previous tasks (for an
 * immediate Undo), or null when nothing changed and nothing was saved.
 */
export function commitSchedule(label: string, operation: (tasks: readonly Task[]) => Task[]): Task[] | null {
  const previous = tasksCollection.getSnapshot();
  const next = operation(previous);
  if (next === previous) return null;
  const snapshot = captureSchedule(previous, crypto.randomUUID(), new Date().toISOString(), label);
  historyCollection.write(pushSnapshot(historyCollection.getSnapshot(), snapshot));
  tasksCollection.write(next);
  return previous;
}

/** Roll the schedule back to a snapshot. The current schedule is saved first, so this can be undone too. */
export function restoreSnapshot(snapshot: ScheduleSnapshot): Task[] | null {
  return commitSchedule(`Before restoring “${snapshot.label}”`.slice(0, 80), (tasks) => restoreSchedule(tasks, snapshot));
}

export function clearHistory(): void {
  historyCollection.write([]);
}
