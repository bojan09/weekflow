import { localISO, startOfWeek } from "@/lib/dates";
import { buildScenario, type ScenarioId } from "@/domain/scenarios";
import { tasksSchema, type Task } from "@/domain/tasks";
import { usePrefsStore } from "@/prefs/store";
import { createLocalCollection } from "./collection";

/** Demo tasks. The first run starts from "a normal week" positioned around today. */
export const tasksCollection = createLocalCollection<Task[]>({
  key: "weekflow:demo:tasks",
  schema: tasksSchema,
  seed: () => {
    const today = localISO(new Date());
    return buildScenario("standard", startOfWeek(today, "monday"), today);
  },
});

export function newTaskId(): string {
  return crypto.randomUUID();
}

/**
 * Apply a pure task operation and persist the result. Returns the previous
 * list when something changed (so callers can offer Undo), or null for a no-op.
 */
export function mutateTasks(operation: (tasks: readonly Task[]) => Task[]): Task[] | null {
  const previous = tasksCollection.getSnapshot();
  const next = operation(previous);
  if (next === previous) return null;
  tasksCollection.write(next);
  return previous;
}

export function restoreTasks(previous: Task[]): void {
  tasksCollection.write(previous);
}

export function loadScenario(id: ScenarioId): void {
  const today = localISO(new Date());
  const weekStart = usePrefsStore.getState().prefs.calendar.weekStart;
  tasksCollection.write(buildScenario(id, startOfWeek(today, weekStart), today));
}
