"use client";

import type { CSSProperties, KeyboardEvent, PointerEvent } from "react";
import { Lock } from "lucide-react";
import { styleOf } from "@/components/tasks/task-style";
import { PRIORITY_LABEL, endMin, type Task } from "@/domain/tasks";
import { formatClock, type TimeFormat } from "@/lib/time";
import { cn } from "@/lib/utils";

export function describeTimes(task: Task, format: TimeFormat): string {
  const start = task.placement?.startMin;
  if (start === null || start === undefined) return "";
  const fmt = (m: number): string => formatClock(Math.floor(m / 60) % 24, m % 60, format);
  return `${fmt(start)} – ${fmt(endMin(task))}`;
}

export interface BlockProps {
  task: Task;
  format: TimeFormat;
  style?: CSSProperties;
  /** Dimmed while its drag preview is shown elsewhere. */
  ghosted?: boolean;
  /** Visual preview drawn under the pointer while dragging. */
  preview?: boolean;
  conflicted?: boolean;
  /** Full text for assistive tech, including the weekday. */
  label: string;
  onPointerDown?: (event: PointerEvent<HTMLElement>) => void;
  onResizePointerDown?: (event: PointerEvent<HTMLElement>) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void;
}

/** A task on the calendar: soft tint, strong left bar, readable title and time. */
export function TaskBlock({
  task,
  format,
  style,
  ghosted,
  preview,
  conflicted,
  label,
  onPointerDown,
  onResizePointerDown,
  onKeyDown,
}: BlockProps) {
  const look = styleOf(task);
  const done = task.status === "done";
  const height = typeof style?.height === "number" ? style.height : 60;
  const compact = height < 40;

  return (
    <div
      role="button"
      tabIndex={preview ? -1 : 0}
      aria-label={label}
      aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight Shift+ArrowUp Shift+ArrowDown L"
      data-task-id={task.id}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      style={style}
      className={cn(
        "group/block absolute overflow-hidden rounded-lg border-l-[3px] px-2 py-1 text-left shadow-[0_1px_0_oklch(0_0_0/0.04)] outline-none select-none focus-visible:z-20 focus-visible:ring-2 focus-visible:ring-ring",
        look.surface,
        look.bar,
        preview ? "pointer-events-none" : "pointer-events-auto",
        task.locked ? "cursor-default" : "cursor-grab touch-none active:cursor-grabbing",
       
        ghosted && "opacity-35",
        preview && "z-30 cursor-grabbing opacity-95 shadow-lift ring-2 ring-primary-text",
        conflicted && !preview && "ring-2 ring-danger-text",
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <p
          className={cn(
            "min-w-0 text-xs leading-tight font-semibold",
            look.title,
            done && "line-through",
            compact ? "truncate" : "line-clamp-2",
          )}
        >
          {task.title}
        </p>
        {task.locked ? (
          <Lock className={cn("mt-px size-3 shrink-0", look.title)} aria-hidden="true" />
        ) : null}
      </div>
      {!compact ? (
        <p className={cn("mt-0.5 truncate text-[11px] leading-tight", look.meta)}>
          {describeTimes(task, format)}
          {task.priority === "high" ? ` · ${PRIORITY_LABEL.high}` : ""}
        </p>
      ) : null}
      {!task.locked && onResizePointerDown ? (
        <span
          aria-hidden="true"
          data-resize-handle
          onPointerDown={onResizePointerDown}
          className="absolute inset-x-0 bottom-0 flex h-2.5 cursor-ns-resize touch-none items-end justify-center"
        >
          <span className={cn("mb-0.5 h-0.5 w-6 rounded-full opacity-0 group-hover/block:opacity-60 group-focus-visible/block:opacity-60", look.dot)} />
        </span>
      ) : null}
    </div>
  );
}
