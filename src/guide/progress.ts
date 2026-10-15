import type { Task } from "@/domain/tasks";
import { routeOfPath, subOfPath, type AppRoute } from "@/lib/routes";

export type StepId =
  | "add-task"
  | "schedule-task"
  | "lock-task"
  | "preview-plan"
  | "check-rules"
  | "open-review";

/** What the step's button does. Never a link to the page you are already on. */
export type StepGo =
  | { type: "link"; label: string; route: AppRoute; sub?: string }
  | { type: "new-task"; label: string }
  | { type: "plan"; label: string };

export interface ChecklistStep {
  id: StepId;
  label: string;
  hint: string;
  go: StepGo;
}

/** The Start here checklist, in order. */
export const STEPS: readonly ChecklistStep[] = [
  { id: "add-task", label: "Add a task", hint: "Give it a title, then save.", go: { type: "new-task", label: "Add one" } },
  { id: "schedule-task", label: "Put a task on your calendar", hint: "Drag a task from Unscheduled onto a day.", go: { type: "link", label: "Open My Week", route: "week" } },
  { id: "lock-task", label: "Lock a task", hint: "Open a task's ⋯ menu and choose Lock in place. It needs a time first.", go: { type: "link", label: "Open Tasks", route: "tasks" } },
  { id: "preview-plan", label: "Preview a plan", hint: "Read the reasons. Nothing changes until you apply.", go: { type: "plan", label: "Preview it" } },
  { id: "check-rules", label: "Check your rules", hint: "See your hours, breaks and daily limit.", go: { type: "link", label: "Open Planning", route: "settings", sub: "planning" } },
  { id: "open-review", label: "Open the weekly review", hint: "See your workload and what got done.", go: { type: "link", label: "Open Review", route: "review" } },
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
  const route = routeOfPath(pathname);
  if (route === "settings" && subOfPath(pathname) === "planning") return ["check-rules"];
  if (route === "review" && subOfPath(pathname) === null) return ["open-review"];
  return [];
}
