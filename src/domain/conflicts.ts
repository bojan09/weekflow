import { addDays, formatShort, parseISO, weekdayOf, type ISODate } from "@/lib/dates";
import { formatClock, WEEKDAYS, type TimeFormat } from "@/lib/time";
import {
  findFreeSlot,
  maxDailyMinutes,
  scheduledMinutes,
  workWindows,
  type PlanningPrefs,
} from "./availability";
import { PRIORITY_RANK, endMin, isOverdue, isTimed, type Placement, type Task } from "./tasks";

export type ConflictKind =
  | "overlap"
  | "overload"
  | "overdue"
  | "deadline-risk"
  | "after-deadline"
  | "before-start"
  | "dependency"
  | "outside-hours";

export type Severity = "high" | "medium" | "low";

/** A manual fix the user can apply with one click. Data only; the UI runs it. */
export type ConflictAction =
  | { type: "move"; taskId: string; placement: Placement; label: string }
  | { type: "unschedule"; taskId: string; label: string }
  | { type: "unlock"; taskId: string; label: string }
  | { type: "open"; taskId: string; label: string };

export interface Conflict {
  /** Stable across renders for the same problem. */
  id: string;
  kind: ConflictKind;
  severity: Severity;
  taskIds: string[];
  title: string;
  detail: string;
  actions: ConflictAction[];
}

export interface Now {
  date: ISODate;
  minutes: number;
}

const SEVERITY_ORDER: Record<Severity, number> = { high: 0, medium: 1, low: 2 };

export function describeSlot(slot: Placement, format: TimeFormat): string {
  const day = WEEKDAYS[weekdayOf(slot.date)]?.short ?? "";
  const time = slot.startMin === null ? "" : ` ${formatClock(Math.floor(slot.startMin / 60), slot.startMin % 60, format)}`;
  return `${day} ${formatShort(slot.date)}${time}`;
}

/**
 * Find problems in the current schedule and offer fixes the user can apply by
 * hand. This is not the scheduling engine: it only reports and suggests.
 */
export function detectConflicts(
  tasks: readonly Task[],
  planning: PlanningPrefs,
  now: Now,
  format: TimeFormat = "24h",
): Conflict[] {
  const open = tasks.filter((t) => t.status === "todo");
  const byId = new Map(tasks.map((t) => [t.id, t] as const));
  const conflicts: Conflict[] = [];

  const moveAction = (task: Task, label: string): ConflictAction[] => {
    if (task.locked) {
      return [{ type: "unlock", taskId: task.id, label: `Unlock “${task.title}”` }];
    }
    const slot = findFreeSlot(tasks, planning, {
      durationMin: task.durationMin,
      fromDate: now.date,
      fromMin: now.minutes,
      notAfter: task.deadline,
      excludeId: task.id,
    });
    const actions: ConflictAction[] = [];
    if (slot) {
      actions.push({
        type: "move",
        taskId: task.id,
        placement: slot,
        label: `${label} ${describeSlot(slot, format)}`,
      });
    }
    return actions;
  };

  // Overlaps between timed tasks on the same day.
  const timed = open.filter(isTimed);
  for (let i = 0; i < timed.length; i += 1) {
    for (let j = i + 1; j < timed.length; j += 1) {
      const first = timed[i];
      const second = timed[j];
      if (!first || !second || first.placement.date !== second.placement.date) continue;
      // Canonical pair order so output never depends on input order.
      const [a, b] = first.id <= second.id ? [first, second] : [second, first];
      if (a.placement.startMin < endMin(b) && b.placement.startMin < endMin(a)) {
        // Suggest moving the less important (then newer) unlocked task.
        const [keep, move] = pickToMove(a, b);
        conflicts.push({
          id: `overlap:${[a.id, b.id].sort().join(":")}`,
          kind: "overlap",
          severity: "high",
          taskIds: [a.id, b.id],
          title: "Two tasks overlap",
          detail: `“${a.title}” and “${b.title}” are scheduled at the same time on ${formatShort(a.placement.date)}.`,
          actions: [
            ...moveAction(move, `Move “${move.title}” to`),
            ...(move.locked && !keep.locked ? moveAction(keep, `Move “${keep.title}” to`) : []),
          ],
        });
      }
    }
  }

  // Days over the daily workload limit.
  const days = [...new Set(open.flatMap((t) => (t.placement ? [t.placement.date] : [])))].sort();
  for (const date of days) {
    const used = scheduledMinutes(tasks, date);
    const cap = maxDailyMinutes(planning);
    if (used > cap) {
      const onDay = open
        .filter((t) => t.placement?.date === date && !t.locked)
        .sort(
          (x, y) =>
            PRIORITY_RANK[x.priority] - PRIORITY_RANK[y.priority] ||
            compareText(y.createdAt, x.createdAt) ||
            compareText(x.id, y.id),
        );
      const candidate = onDay[0];
      conflicts.push({
        id: `overload:${date}`,
        kind: "overload",
        severity: "medium",
        taskIds: onDay.map((t) => t.id),
        title: "Day is overloaded",
        detail: `${formatShort(date)} has ${(used / 60).toFixed(1)}h planned, above your ${planning.maxDailyHours}h limit.`,
        actions: candidate ? moveAction(candidate, `Move “${candidate.title}” to`) : [],
      });
    }
  }

  for (const task of open) {
    if (isOverdue(task, now.date)) {
      conflicts.push({
        id: `overdue:${task.id}`,
        kind: "overdue",
        severity: "high",
        taskIds: [task.id],
        title: "Deadline has passed",
        detail: `“${task.title}” was due ${formatShort(task.deadline ?? now.date)} and is not done.`,
        actions: [...moveAction(task, "Schedule it"), { type: "open", taskId: task.id, label: "Change the deadline" }],
      });
      continue;
    }

    if (task.deadline && task.placement && task.placement.date > task.deadline) {
      conflicts.push({
        id: `after-deadline:${task.id}`,
        kind: "after-deadline",
        severity: "high",
        taskIds: [task.id],
        title: "Scheduled after its deadline",
        detail: `“${task.title}” is placed on ${formatShort(task.placement.date)}, after its ${formatShort(task.deadline)} deadline.`,
        actions: moveAction(task, "Move it to"),
      });
    } else if (task.deadline && task.placement === null && task.deadline <= addDays(now.date, 2)) {
      conflicts.push({
        id: `deadline-risk:${task.id}`,
        kind: "deadline-risk",
        severity: "medium",
        taskIds: [task.id],
        title: "Due soon and not scheduled",
        detail: `“${task.title}” is due ${formatShort(task.deadline)} but has no time on your calendar.`,
        actions: moveAction(task, "Schedule it"),
      });
    }

    if (task.earliestStart && task.placement && task.placement.date < task.earliestStart) {
      conflicts.push({
        id: `before-start:${task.id}`,
        kind: "before-start",
        severity: "medium",
        taskIds: [task.id],
        title: "Scheduled before it can start",
        detail: `“${task.title}” cannot start before ${formatShort(task.earliestStart)}.`,
        actions: moveAction(task, "Move it to"),
      });
    }

    for (const depId of task.dependsOn) {
      const dep = byId.get(depId);
      if (!dep || dep.status === "done" || !task.placement || !dep.placement) continue;
      const taskStart = absoluteMinutes(task.placement.date, task.placement.startMin ?? 0);
      const depEnd = absoluteMinutes(dep.placement.date, dep.placement.startMin === null ? 0 : endMin(dep));
      if (taskStart < depEnd) {
        conflicts.push({
          id: `dependency:${task.id}:${dep.id}`,
          kind: "dependency",
          severity: "high",
          taskIds: [task.id, dep.id],
          title: "Starts before its prerequisite",
          detail: `“${task.title}” depends on “${dep.title}”, which is scheduled to finish later.`,
          actions: moveAction(task, "Move it to"),
        });
      }
    }

    if (isTimed(task)) {
      const windows = workWindows(planning, task.placement.date);
      const inside = windows.some((w) => task.placement.startMin >= w.start && endMin(task) <= w.end);
      if (!inside) {
        conflicts.push({
          id: `outside-hours:${task.id}`,
          kind: "outside-hours",
          severity: "low",
          taskIds: [task.id],
          title: "Outside working time",
          detail: `“${task.title}” falls outside your working hours or on a day off.`,
          actions: moveAction(task, "Move it to"),
        });
      }
    }
  }

  // Every problem gets at least one way forward: open the task and change it.
  for (const conflict of conflicts) {
    const first = conflict.taskIds[0];
    if (conflict.actions.length === 0 && first) {
      conflict.actions.push({ type: "open", taskId: first, label: "Open the task" });
    }
  }

  return conflicts.sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || compareText(a.id, b.id),
  );
}

function pickToMove(a: Task, b: Task): [keep: Task, move: Task] {
  if (a.locked !== b.locked) return a.locked ? [a, b] : [b, a];
  const diff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  if (diff !== 0) return diff > 0 ? [a, b] : [b, a];
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? [a, b] : [b, a];
  return a.id <= b.id ? [a, b] : [b, a];
}

/** Minutes since the epoch for a date + minute-of-day, so times compare across days. */
function absoluteMinutes(date: ISODate, minutes: number): number {
  return parseISO(date) / 60_000 + minutes;
}

/** Locale-independent string comparison, so ordering is identical everywhere. */
function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
