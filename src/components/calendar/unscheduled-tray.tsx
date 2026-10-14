"use client";

import type { PointerEvent } from "react";
import { CalendarPlus, GripVertical } from "lucide-react";
import { QuickAdd } from "@/components/tasks/quick-add";
import { scheduleInNextFreeSlot } from "@/components/tasks/actions";
import { CategoryChip, PriorityBadge } from "@/components/tasks/task-meta";
import { styleOf } from "@/components/tasks/task-style";
import { Button } from "@/components/ui/button";
import type { PlanningPrefs } from "@/domain/availability";
import { formatDuration } from "@/domain/stats";
import { PRIORITY_RANK, isOverdue, type Task } from "@/domain/tasks";
import type { Now } from "@/hooks/use-now";
import { formatShort } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { DragState } from "./use-calendar-dnd";

interface UnscheduledTrayProps {
  tasks: Task[];
  now: Now | null;
  planning: PlanningPrefs;
  drag: DragState | null;
  onPointerDown: (event: PointerEvent<HTMLElement>, task: Task) => void;
  onScheduled: (task: Task, message: string) => void;
}

/** Open tasks with no time yet. Drag one onto the calendar, or press Schedule. */
export function UnscheduledTray({ tasks, now, planning, drag, onPointerDown, onScheduled }: UnscheduledTrayProps) {
  const sorted = [...tasks].sort(
    (a, b) =>
      PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority] ||
      (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999") ||
      a.createdAt.localeCompare(b.createdAt),
  );

  return (
    <section aria-labelledby="tray-title" className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-soft">
      <div className="flex items-baseline justify-between">
        <h2 id="tray-title" className="text-sm font-semibold">
          Unscheduled
        </h2>
        <span className="text-xs text-muted-foreground tabular-nums">{tasks.length}</span>
      </div>
      <QuickAdd placeholder="Add to inbox…" />
      {sorted.length === 0 ? (
        <p className="rounded-xl bg-muted/60 px-3 py-4 text-center text-sm text-muted-foreground">
          Your inbox is clear. Everything has a place.
        </p>
      ) : (
        <ul className="flex max-h-[28rem] flex-col gap-2 overflow-y-auto pr-0.5">
          {sorted.map((task) => {
            const look = styleOf(task);
            const dragging = drag?.taskId === task.id && drag.preview !== null;
            return (
              <li
                key={task.id}
                onPointerDown={(e) => onPointerDown(e, task)}
                className={cn(
                  "touch-none cursor-grab rounded-xl border-l-[3px] px-3 py-2 select-none active:cursor-grabbing",
                  look.surface,
                  look.bar,
                  dragging && "opacity-40",
                )}
              >
                <div className="flex items-start gap-2">
                  <GripVertical className={cn("mt-0.5 size-4 shrink-0 opacity-60", look.title)} aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className={cn("truncate text-sm font-semibold", look.title)}>{task.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className={cn("text-xs tabular-nums", look.meta)}>{formatDuration(task.durationMin)}</span>
                      <PriorityBadge priority={task.priority} />
                      {task.deadline ? (
                        <span
                          className={cn(
                            "text-xs tabular-nums",
                            now && isOverdue(task, now.date) ? "font-medium text-danger-text" : look.meta,
                          )}
                        >
                          Due {formatShort(task.deadline)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Schedule “${task.title}” in the next free slot`}
                    disabled={!now}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => {
                      if (!now) return;
                      const slot = scheduleInNextFreeSlot(task, now, planning);
                      if (slot) onScheduled(task, `${task.title} scheduled for ${formatShort(slot.date)}`);
                    }}
                    className={look.title}
                  >
                    <CalendarPlus aria-hidden="true" />
                  </Button>
                </div>
                <div className="mt-1 pl-6">
                  <CategoryChip task={task} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
