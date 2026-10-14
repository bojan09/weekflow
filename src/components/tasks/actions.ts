"use client";

import { toast } from "sonner";
import { findFreeSlot, type PlanningPrefs } from "@/domain/availability";
import type { ConflictAction } from "@/domain/conflicts";
import { deleteTask, moveTask, setDone, setLocked, unscheduleTask } from "@/domain/task-ops";
import type { Placement, Task } from "@/domain/tasks";
import { mutateTasks, restoreTasks, tasksCollection } from "@/data/tasks";
import type { ISODate } from "@/lib/dates";
import type { Now } from "@/hooks/use-now";

function withUndo(message: string, previous: Task[] | null): void {
  if (!previous) return;
  toast(message, { action: { label: "Undo", onClick: () => restoreTasks(previous) } });
}

export function toggleDone(task: Task, today: ISODate): void {
  const done = task.status !== "done";
  withUndo(done ? `Done: ${task.title}` : `Reopened: ${task.title}`, mutateTasks((t) => setDone(t, task.id, done, today)));
}

export function removeTask(task: Task): void {
  withUndo(`Deleted: ${task.title}`, mutateTasks((t) => deleteTask(t, task.id)));
}

export function placeTask(id: string, placement: Placement): boolean {
  return mutateTasks((t) => moveTask(t, id, placement)) !== null;
}

export function toggleLock(task: Task): void {
  if (!task.placement) {
    toast.info("Schedule the task first, then you can lock it.");
    return;
  }
  mutateTasks((t) => setLocked(t, task.id, !task.locked));
}

/** Put a task in the first free slot that respects the user's rules. */
export function scheduleInNextFreeSlot(task: Task, now: Now, planning: PlanningPrefs): Placement | null {
  const tasks = tasksCollection.getSnapshot();
  const slot = findFreeSlot(tasks, planning, {
    durationMin: task.durationMin,
    fromDate: now.date,
    fromMin: now.minutes,
    notAfter: task.deadline,
    excludeId: task.id,
  });
  if (!slot) {
    toast.error(
      task.deadline
        ? "No free time before the deadline. Free up time or move the deadline."
        : "No free time found in the next four weeks.",
    );
    return null;
  }
  mutateTasks((t) => moveTask(t, task.id, slot));
  return slot;
}

/** Run a fix suggested by the conflict panel. */
export function runConflictAction(action: ConflictAction, openEditor: (id: string) => void): void {
  switch (action.type) {
    case "move":
      withUndo("Task moved", mutateTasks((t) => moveTask(t, action.taskId, action.placement)));
      return;
    case "unschedule":
      withUndo("Task unscheduled", mutateTasks((t) => unscheduleTask(t, action.taskId)));
      return;
    case "unlock":
      withUndo("Task unlocked", mutateTasks((t) => setLocked(t, action.taskId, false)));
      return;
    case "open":
      openEditor(action.taskId);
      return;
  }
}
