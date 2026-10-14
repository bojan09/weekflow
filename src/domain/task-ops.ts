import type { ISODate } from "@/lib/dates";
import {
  MAX_DURATION,
  MINUTES_PER_DAY,
  MIN_DURATION,
  type Placement,
  type Priority,
  type CategoryId,
  type Task,
} from "./tasks";

/**
 * Pure task operations. Each returns a new array, or the same array
 * (reference-equal) when nothing changed, so callers can detect no-ops.
 */

export interface NewTaskInput {
  title: string;
  durationMin: number;
  priority: Priority;
  category?: CategoryId;
  notes?: string;
  deadline?: ISODate | null;
  placement?: Placement | null;
}

export function buildTask(input: NewTaskInput, id: string, createdAt: string): Task {
  return {
    id,
    title: input.title.trim(),
    notes: input.notes ?? "",
    durationMin: clampDuration(input.durationMin),
    priority: input.priority,
    category: input.category ?? "work",
    labels: [],
    deadline: input.deadline ?? null,
    earliestStart: null,
    checklist: [],
    dependsOn: [],
    status: "todo",
    completedOn: null,
    actualMin: null,
    placement: input.placement ?? null,
    locked: false,
    createdAt,
  };
}

export function clampDuration(minutes: number): number {
  const rounded = Math.round(minutes / 5) * 5;
  return Math.min(MAX_DURATION, Math.max(MIN_DURATION, rounded));
}

/** Largest valid start so the task still ends before midnight. */
export function clampStart(startMin: number, durationMin: number): number {
  return Math.min(MINUTES_PER_DAY - durationMin, Math.max(0, startMin));
}

function replace(tasks: readonly Task[], id: string, next: (task: Task) => Task | null): Task[] {
  let found = false;
  const result = tasks.map((task) => {
    if (task.id !== id) return task;
    found = true;
    return next(task) ?? task;
  });
  return found ? result : (tasks as Task[]);
}

function unchanged(tasks: readonly Task[], result: Task[]): Task[] {
  return result.every((t, i) => t === tasks[i]) ? (tasks as Task[]) : result;
}

export function addTask(tasks: readonly Task[], task: Task): Task[] {
  return [...tasks, task];
}

export function updateTask(tasks: readonly Task[], id: string, patch: Partial<Omit<Task, "id">>): Task[] {
  return unchanged(tasks, replace(tasks, id, (task) => ({ ...task, ...patch })));
}

export function deleteTask(tasks: readonly Task[], id: string): Task[] {
  const exists = tasks.some((t) => t.id === id);
  if (!exists) return tasks as Task[];
  // Remove the task and any dependency edges pointing at it.
  return tasks
    .filter((t) => t.id !== id)
    .map((t) => (t.dependsOn.includes(id) ? { ...t, dependsOn: t.dependsOn.filter((d) => d !== id) } : t));
}

/** Move a task to a day and time. Locked tasks do not move. */
export function moveTask(tasks: readonly Task[], id: string, placement: Placement): Task[] {
  return unchanged(
    tasks,
    replace(tasks, id, (task) => {
      if (task.locked) return null;
      const startMin =
        placement.startMin === null ? null : clampStart(placement.startMin, task.durationMin);
      const same =
        task.placement?.date === placement.date && task.placement?.startMin === startMin;
      return same ? null : { ...task, placement: { date: placement.date, startMin } };
    }),
  );
}

/** Change a timed task's length, keeping its start. Locked tasks do not resize. */
export function resizeTask(tasks: readonly Task[], id: string, durationMin: number): Task[] {
  return unchanged(
    tasks,
    replace(tasks, id, (task) => {
      if (task.locked) return null;
      const start = task.placement?.startMin ?? 0;
      const maxDuration = Math.min(MAX_DURATION, MINUTES_PER_DAY - start);
      const next = Math.min(maxDuration, clampDuration(durationMin));
      return next === task.durationMin ? null : { ...task, durationMin: next };
    }),
  );
}

/** Lock or unlock. Only a placed task can be locked. */
export function setLocked(tasks: readonly Task[], id: string, locked: boolean): Task[] {
  return unchanged(
    tasks,
    replace(tasks, id, (task) => {
      if (task.locked === locked) return null;
      if (locked && task.placement === null) return null;
      return { ...task, locked };
    }),
  );
}

/** Remove a task from the calendar (back to the inbox). Locked tasks stay. */
export function unscheduleTask(tasks: readonly Task[], id: string): Task[] {
  return unchanged(
    tasks,
    replace(tasks, id, (task) => (task.locked || task.placement === null ? null : { ...task, placement: null })),
  );
}

export function setDone(tasks: readonly Task[], id: string, done: boolean, today: ISODate): Task[] {
  return unchanged(
    tasks,
    replace(tasks, id, (task) => {
      const status = done ? "done" : "todo";
      if (task.status === status) return null;
      return { ...task, status, completedOn: done ? today : null };
    }),
  );
}

/** True when adding `dependsOn` to `id` would create a cycle. */
export function wouldCreateCycle(tasks: readonly Task[], id: string, dependsOn: readonly string[]): boolean {
  const deps = new Map(tasks.map((t) => [t.id, t.dependsOn] as const));
  deps.set(id, [...dependsOn]);
  const visiting = new Set<string>();
  const done = new Set<string>();
  const visit = (node: string): boolean => {
    if (done.has(node)) return false;
    if (visiting.has(node)) return true;
    visiting.add(node);
    for (const next of deps.get(node) ?? []) if (visit(next)) return true;
    visiting.delete(node);
    done.add(node);
    return false;
  };
  return visit(id);
}
