import { z } from "zod";
import { isValidISO, type ISODate } from "@/lib/dates";

export const PRIORITIES = ["low", "medium", "high"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const PRIORITY_LABEL: Record<Priority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

/** Higher number = more important. */
export const PRIORITY_RANK: Record<Priority, number> = { low: 0, medium: 1, high: 2 };

export type TaskHue =
  | "lavender"
  | "blue"
  | "teal"
  | "green"
  | "amber"
  | "orange"
  | "pink"
  | "slate";

export const CATEGORIES = [
  { id: "work", label: "Work", hue: "blue" },
  { id: "focus", label: "Focus", hue: "lavender" },
  { id: "meetings", label: "Meetings", hue: "orange" },
  { id: "personal", label: "Personal", hue: "green" },
  { id: "health", label: "Health", hue: "teal" },
  { id: "admin", label: "Admin", hue: "slate" },
  { id: "learning", label: "Learning", hue: "amber" },
  { id: "social", label: "Social", hue: "pink" },
] as const satisfies ReadonlyArray<{ id: string; label: string; hue: TaskHue }>;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as [CategoryId, ...CategoryId[]];

export function categoryOf(id: CategoryId): (typeof CATEGORIES)[number] {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0];
}

export const MINUTES_PER_DAY = 1440;
export const MIN_DURATION = 5;
export const MAX_DURATION = 720;

const isoDate = z.string().refine(isValidISO, "Use a valid date");

export const checklistItemSchema = z.object({
  id: z.string().min(1),
  text: z.string().trim().min(1).max(120),
  done: z.boolean(),
});

export const placementSchema = z.object({
  date: isoDate,
  /** Minutes since midnight, or null for a flexible task pinned to a day only. */
  startMin: z.number().int().min(0).max(MINUTES_PER_DAY - MIN_DURATION).nullable(),
});

export const taskSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().trim().min(1, "Give the task a title").max(120, "Keep the title under 120 characters"),
    notes: z.string().max(2000),
    durationMin: z.number().int().min(MIN_DURATION).max(MAX_DURATION),
    priority: z.enum(PRIORITIES),
    category: z.enum(CATEGORY_IDS),
    labels: z.array(z.string().trim().min(1).max(24)).max(8),
    deadline: isoDate.nullable(),
    earliestStart: isoDate.nullable(),
    checklist: z.array(checklistItemSchema).max(30),
    dependsOn: z.array(z.string().min(1)).max(10),
    status: z.enum(["todo", "done"]),
    /** Date the task was completed, for weekly review later. */
    completedOn: isoDate.nullable(),
    /** Minutes actually spent, to compare with the estimate. */
    actualMin: z.number().int().min(0).max(MINUTES_PER_DAY).nullable(),
    placement: placementSchema.nullable(),
    /** A locked task is never moved by the user's drag or the engine. */
    locked: z.boolean(),
    createdAt: z.string().min(1),
  })
  .refine((t) => !t.locked || t.placement !== null, {
    message: "A locked task needs a place on the calendar",
    path: ["locked"],
  })
  .refine(
    (t) => t.placement === null || t.placement.startMin === null || t.placement.startMin + t.durationMin <= MINUTES_PER_DAY,
    { message: "The task must end before midnight", path: ["placement"] },
  );

export type Task = z.infer<typeof taskSchema>;
export type Placement = z.infer<typeof placementSchema>;
export type ChecklistItem = z.infer<typeof checklistItemSchema>;

export const tasksSchema = z.array(taskSchema).max(2000);

/** True when the task has an exact start time on the calendar. */
export function isTimed(task: Task): task is Task & { placement: { date: ISODate; startMin: number } } {
  return task.placement !== null && task.placement.startMin !== null;
}

/** True when the task is pinned to a day but has no start time. */
export function isDayOnly(task: Task): boolean {
  return task.placement !== null && task.placement.startMin === null;
}

export function endMin(task: Task): number {
  return (task.placement?.startMin ?? 0) + task.durationMin;
}

/** Open tasks with no calendar placement: the Inbox. */
export function isInbox(task: Task): boolean {
  return task.status === "todo" && task.placement === null;
}

export function isOverdue(task: Task, today: ISODate): boolean {
  return task.status === "todo" && task.deadline !== null && task.deadline < today;
}

/**
 * An open task whose time has passed without it being done: it sits on an
 * earlier day, or ended earlier today. A day-only task is missed once its day is over.
 */
export function isMissed(task: Task, now: { date: ISODate; minutes: number }): boolean {
  if (task.status !== "todo" || task.placement === null) return false;
  if (task.placement.date < now.date) return true;
  if (task.placement.date > now.date || task.placement.startMin === null) return false;
  return task.placement.startMin + task.durationMin <= now.minutes;
}

export function checklistProgress(task: Task): { done: number; total: number } {
  return { done: task.checklist.filter((i) => i.done).length, total: task.checklist.length };
}
