"use client";

import { CalendarClock, GitBranch, ListChecks, Lock, Repeat } from "lucide-react";
import { categoryOf, checklistProgress, isOverdue, PRIORITY_LABEL, type Priority, type Task } from "@/domain/tasks";
import { projectById } from "@/domain/projects";
import { describeRecurrence } from "@/domain/recurrence";
import { formatDuration } from "@/domain/stats";
import { useProjects } from "@/hooks/use-lists";
import { formatShort, type ISODate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { styleOf, TASK_STYLE } from "./task-style";

const PRIORITY_TONE: Record<Priority, string> = {
  high: "bg-danger-soft text-danger-text",
  medium: "bg-warning-soft text-warning-text",
  low: "bg-muted text-muted-foreground",
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium", PRIORITY_TONE[priority])}>
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

export function CategoryChip({ task }: { task: Pick<Task, "category"> }) {
  const category = categoryOf(task.category);
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={cn("size-2 rounded-full", styleOf(task).dot)} aria-hidden="true" />
      {category.label}
    </span>
  );
}

/** Compact facts about a task: length, deadline, checklist, dependencies, lock. */
export function TaskFacts({ task, today }: { task: Task; today: ISODate | null }) {
  const progress = checklistProgress(task);
  const overdue = today !== null && isOverdue(task, today);
  const project = projectById(useProjects(), task.projectId);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <CategoryChip task={task} />
      {project ? (
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className={cn("size-2 rounded-sm", TASK_STYLE[project.hue].dot)} aria-hidden="true" />
          {project.name}
        </span>
      ) : null}
      <span className="text-xs text-muted-foreground tabular-nums">{formatDuration(task.durationMin)}</span>
      <PriorityBadge priority={task.priority} />
      {task.deadline ? (
        <span
          className={cn(
            "inline-flex items-center gap-1 text-xs tabular-nums",
            overdue ? "font-medium text-danger-text" : "text-muted-foreground",
          )}
        >
          <CalendarClock className="size-3.5" aria-hidden="true" />
          {overdue ? "Overdue · " : "Due "}
          {formatShort(task.deadline)}
        </span>
      ) : null}
      {progress.total > 0 ? (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
          <ListChecks className="size-3.5" aria-hidden="true" />
          {progress.done}/{progress.total}
        </span>
      ) : null}
      {task.dependsOn.length > 0 ? (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <GitBranch className="size-3.5" aria-hidden="true" />
          Waits on {task.dependsOn.length}
        </span>
      ) : null}
      {task.recurrence ? (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Repeat className="size-3.5" aria-hidden="true" />
          {describeRecurrence(task.recurrence)}
        </span>
      ) : null}
      {task.locked ? (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Lock className="size-3.5" aria-hidden="true" />
          Locked
        </span>
      ) : null}
    </div>
  );
}
