"use client";

import type { CSSProperties, KeyboardEvent, PointerEvent } from "react";
import { useId } from "react";
import { Lock, Trash2 } from "lucide-react";
import { styleOf } from "@/components/tasks/task-style";
import { PRIORITY_LABEL, endMin, type Task } from "@/domain/tasks";
import { formatClock, type TimeFormat } from "@/lib/time";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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
  onDelete?: () => void;
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
  onDelete,
}: BlockProps) {
  const look = styleOf(task);
  const done = task.status === "done";
  const height = typeof style?.height === "number" ? style.height : 60;
  const compact = height < 44;
  const detailsId = useId();
  const timeRange = describeTimes(task, format);
  const start = task.placement?.startMin;
  const startTime = start === null || start === undefined ? "" : formatClock(Math.floor(start / 60), start % 60, format);

  const block = (
    <div
      role="button"
      tabIndex={preview ? -1 : 0}
      aria-label={label}
      aria-describedby={detailsId}
      aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight Shift+ArrowUp Shift+ArrowDown L Delete"
      data-task-id={task.id}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      style={preview ? style : { height: "100%", width: "100%", top: 0, left: 0 }}
      className={cn(
        "calendar-task group/block absolute overflow-hidden rounded-lg border-l-[3px] text-left shadow-soft outline-none select-none focus-visible:z-20 focus-visible:ring-2 focus-visible:ring-ring",
        look.surface,
        look.bar,
        preview ? "pointer-events-none" : "pointer-events-auto",
        task.locked ? "cursor-pointer" : "cursor-grab touch-none active:cursor-grabbing",
       
        ghosted && "opacity-35",
        preview && "z-30 cursor-grabbing opacity-95 shadow-lift ring-2 ring-primary-text",
        conflicted && !preview && "ring-2 ring-danger-text",
      )}
    >
      <span id={detailsId} className="sr-only">{task.title}, {timeRange}, {PRIORITY_LABEL[task.priority]} priority{task.locked ? ", locked in place" : ""}</span>
      <div className={cn("calendar-task-content", compact && "calendar-task-compact", onDelete && !compact && "max-md:pr-9")}>
      <div className="flex min-h-0 min-w-0 shrink items-start justify-between gap-1 overflow-hidden">
        <p
          className={cn(
            "calendar-task-title min-w-0 text-xs font-semibold",
            look.title,
            done && "line-through",
            compact ? "truncate" : "break-words",
          )}
        >
          {task.title}
        </p>
        {task.locked ? (
          <Lock className={cn("mt-px size-3 shrink-0", look.title)} aria-hidden="true" />
        ) : null}
      </div>
      {!compact ? (
        <p className={cn("calendar-task-time truncate text-[11px] tabular-nums", look.meta)}>
          <span className="calendar-task-range">{timeRange}</span>
          <span className="calendar-task-start hidden">{startTime}</span>
        </p>
      ) : null}
      </div>
      {!task.locked && onResizePointerDown ? (
        <span
          aria-hidden="true"
          data-resize-handle
          onPointerDown={onResizePointerDown}
          title="Drag to resize · Shift + ↑ / ↓ for precise changes"
          className={compact ? "calendar-resize absolute inset-y-0 right-0 flex w-4 cursor-ns-resize touch-none items-center justify-center bg-card/20 hover:bg-card/50" : "calendar-resize absolute inset-x-0 bottom-0 flex h-4 cursor-ns-resize touch-none items-center justify-center bg-card/20 hover:bg-card/50"}
        >
          <span className={cn("rounded-full opacity-80", compact ? "h-3 w-1" : "h-1 w-8", look.dot)} />
        </span>
      ) : null}
    </div>
  );
  if (preview) return block;
  return (
    <div className="group/task pointer-events-auto absolute" style={style}>
    <Tooltip>
      <TooltipTrigger render={block} delay={350} />
      <TooltipContent className="block max-w-64 bg-popover text-popover-foreground shadow-lift ring-1 ring-border">
        <p className="font-semibold break-words">{task.title}</p>
        <p className="mt-1">{timeRange}</p>
        <p className="mt-1 text-muted-foreground">{PRIORITY_LABEL[task.priority]} priority{task.locked ? " · Locked" : ""}</p>
        {!task.locked && <p className="mt-1 text-xs text-muted-foreground">Drag the grip to resize · Shift + ↑ / ↓</p>}
      </TooltipContent>
    </Tooltip>
    {onDelete && !compact && <button type="button" aria-label={`Delete ${task.title}`} title="Delete task · Undo available" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onDelete(); }} className="absolute top-1 right-1 z-20 flex size-7 items-center justify-center rounded-lg border border-danger-border bg-card text-danger-text opacity-0 shadow-xs transition-opacity group-hover/task:opacity-100 group-focus-within/task:opacity-100 hover:bg-danger-soft focus-visible:opacity-100 max-md:opacity-100"><Trash2 className="size-3.5" aria-hidden="true" /></button>}
    </div>
  );
}
