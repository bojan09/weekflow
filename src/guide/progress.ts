import type { Task } from "@/domain/tasks";
import { appPath, type AppRoute } from "@/lib/routes";

export type StepId =
  | "add-task"
  | "schedule-task"
  | "lock-task"
  | "preview-plan"
  | "check-rules"
  | "open-review";

export interface ChecklistStep {
  id: StepId;
  label: string;
  hint: string;
  to: { route: AppRoute; sub?: string };
}

/** The Start here checklist, in order. */
export const STEPS: readonly ChecklistStep[] = [
  { id: "add-task", label: "Add a task", hint: "Use Quick add on Home or the New task button.", to: { route: "home" } },
  { id: "schedule-task", label: "Put a task on your calendar", hint: "Drag it onto a day, or press Schedule.", to: { route: "week" } },
  { id: "lock-task", label: "Lock a task", hint: "Pin one so it never moves. Select it and press L.", to: { route: "week" } },
  { id: "preview-plan", label: "Preview a plan", hint: "Open Plan my week and read the reasons.", to: { route: "week" } },
  { id: "check-rules", label: "Check your rules", hint: "See your hours, breaks and daily limit.", to: { route: "settings", sub: "planning" } },
  { id: "open-review", label: "Open the weekly review", hint: "See your workload and what got done.", to: { route: "review" } },
];

/**
 * Which steps a change in the task list completes. Every earlier task must
 * still exist, so replacing the whole list (loading a demo scenario) never
 * counts as the user doing something.
 */
export function stepsFromTaskChange(prev: readonly Task[], next: readonly Task[]): StepId[] {
  if (prev === next) return [];
  const before = new Map(prev.map((t) => [t.id, t] as const));
  const nextIds = new Set(next.map((t) => t.id));
  if (![...before.keys()].every((id) => nextIds.has(id))) return [];

  const steps: StepId[] = [];
  const added = next.filter((t) => !before.has(t.id));
  if (added.length === 1) steps.push("add-task");

  for (const task of next) {
    const old = before.get(task.id);
    if (!old) continue;
    if (old.placement === null && task.placement !== null && task.status === "todo" && !steps.includes("schedule-task")) {
      steps.push("schedule-task");
    }
    if (!old.locked && task.locked && !steps.includes("lock-task")) steps.push("lock-task");
  }
  return steps;
}

/** Steps completed by visiting a page. */
export function stepsFromPath(pathname: string): StepId[] {
  if (pathname === appPath("settings", "planning")) return ["check-rules"];
  if (pathname === appPath("review")) return ["open-review"];
  return [];
}
