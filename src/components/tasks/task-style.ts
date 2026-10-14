import type { Task, TaskHue } from "@/domain/tasks";
import { categoryOf } from "@/domain/tasks";

/**
 * Class names are written out in full so Tailwind can see them. Every color is
 * a semantic task token: soft tint, stronger bar, readable title and time.
 */
export const TASK_STYLE: Record<
  TaskHue,
  { surface: string; bar: string; title: string; meta: string; dot: string }
> = {
  lavender: { surface: "bg-task-lavender-bg", bar: "border-task-lavender-bar", title: "text-task-lavender-fg", meta: "text-task-lavender-muted", dot: "bg-task-lavender-bar" },
  blue: { surface: "bg-task-blue-bg", bar: "border-task-blue-bar", title: "text-task-blue-fg", meta: "text-task-blue-muted", dot: "bg-task-blue-bar" },
  teal: { surface: "bg-task-teal-bg", bar: "border-task-teal-bar", title: "text-task-teal-fg", meta: "text-task-teal-muted", dot: "bg-task-teal-bar" },
  green: { surface: "bg-task-green-bg", bar: "border-task-green-bar", title: "text-task-green-fg", meta: "text-task-green-muted", dot: "bg-task-green-bar" },
  amber: { surface: "bg-task-amber-bg", bar: "border-task-amber-bar", title: "text-task-amber-fg", meta: "text-task-amber-muted", dot: "bg-task-amber-bar" },
  orange: { surface: "bg-task-orange-bg", bar: "border-task-orange-bar", title: "text-task-orange-fg", meta: "text-task-orange-muted", dot: "bg-task-orange-bar" },
  pink: { surface: "bg-task-pink-bg", bar: "border-task-pink-bar", title: "text-task-pink-fg", meta: "text-task-pink-muted", dot: "bg-task-pink-bar" },
  slate: { surface: "bg-task-slate-bg", bar: "border-task-slate-bar", title: "text-task-slate-fg", meta: "text-task-slate-muted", dot: "bg-task-slate-bar" },
};

export function styleOf(task: Pick<Task, "category">): (typeof TASK_STYLE)[TaskHue] {
  return TASK_STYLE[categoryOf(task.category).hue];
}
