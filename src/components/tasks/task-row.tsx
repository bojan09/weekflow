"use client";

import { Check, Ellipsis, Lock, LockOpen, Pencil, Trash2, CalendarX2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { mutateTasks } from "@/data/tasks";
import { unscheduleTask } from "@/domain/task-ops";
import type { Task } from "@/domain/tasks";
import type { ISODate } from "@/lib/dates";
import { formatShort } from "@/lib/dates";
import { formatClock, type TimeFormat } from "@/lib/time";
import { cn } from "@/lib/utils";
import { removeTask, toggleDone, toggleLock } from "./actions";
import { TaskFacts } from "./task-meta";
import { Button } from "@/components/ui/button";

export function scheduleLabel(task: Task, format: TimeFormat): string {
  if (!task.placement) return "Unscheduled";
  const day = formatShort(task.placement.date);
  const start = task.placement.startMin;
  if (start === null) return `${day}, any time`;
  return `${day}, ${formatClock(Math.floor(start / 60), start % 60, format)}`;
}

interface TaskRowProps {
  task: Task;
  today: ISODate | null;
  format: TimeFormat;
  onOpen: (id: string) => void;
  /** Hide the "when" column, e.g. in agenda groups where the day is the heading. */
  showSchedule?: boolean;
  /** Replace the default "when" text (e.g. just the time inside an agenda day). */
  scheduleText?: string;
}

export function TaskRow({ task, today, format, onOpen, showSchedule = true, scheduleText }: TaskRowProps) {
  const done = task.status === "done";
  return (
    <li className="group flex items-start gap-3 rounded-2xl border bg-card px-4 py-[var(--row-y)] shadow-soft transition-colors hover:border-primary-border">
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={done ? `Mark “${task.title}” as not done` : `Mark “${task.title}” as done`}
        disabled={today === null}
        onClick={() => today && toggleDone(task, today)}
        className={cn(
          "relative mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors after:absolute after:-inset-4",
          done ? "border-success bg-success text-success-foreground" : "border-input hover:border-primary-text",
        )}
      >
        {done ? <Check className="size-3" strokeWidth={3} aria-hidden="true" /> : null}
      </button>

      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => onOpen(task.id)}
          className={cn(
            "-my-3 block max-w-full truncate rounded py-3 text-left text-sm font-medium hover:underline",
            done && "text-muted-foreground line-through",
          )}
        >
          {task.title}
        </button>
        <div className="mt-1.5">
          <TaskFacts task={task} today={today} />
        </div>
      </div>

      {showSchedule ? (
        <span className="hidden shrink-0 pt-0.5 text-xs text-muted-foreground tabular-nums sm:block">
          {scheduleText ?? scheduleLabel(task, format)}
        </span>
      ) : null}

      <div className="flex shrink-0 items-center gap-1">
      <Button type="button" variant="ghost" size="icon-lg" aria-label={`Edit ${task.title}`} title="Edit task" onClick={() => onOpen(task.id)}><Pencil aria-hidden="true" /></Button>
      <Button type="button" variant="ghost" size="icon-lg" aria-label={`Delete ${task.title}`} title="Delete task · Undo available" className="text-danger-text hover:bg-danger-soft hover:text-danger-text" onClick={() => removeTask(task)}><Trash2 aria-hidden="true" /></Button>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Actions for ${task.title}`}
          className="relative flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground outline-none after:absolute after:-inset-1.5 hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Ellipsis className="size-4" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={() => onOpen(task.id)}>
            <Pencil aria-hidden="true" /> Edit
          </DropdownMenuItem>
          {task.placement ? (
            <DropdownMenuItem onClick={() => toggleLock(task)}>
              {task.locked ? <LockOpen aria-hidden="true" /> : <Lock aria-hidden="true" />}
              {task.locked ? "Unlock" : "Lock in place"}
            </DropdownMenuItem>
          ) : null}
          {task.placement && !task.locked ? (
            <DropdownMenuItem onClick={() => mutateTasks((t) => unscheduleTask(t, task.id))}>
              <CalendarX2 aria-hidden="true" /> Move to inbox
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => removeTask(task)}>
            <Trash2 aria-hidden="true" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      </div>
    </li>
  );
}
