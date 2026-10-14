"use client";

import { useLayoutEffect, type KeyboardEvent, type RefObject } from "react";
import { Pin } from "lucide-react";
import { styleOf } from "@/components/tasks/task-style";
import {
  availableMinutes,
  maxDailyMinutes,
  offHours,
  scheduledMinutes,
  type PlanningPrefs,
} from "@/domain/availability";
import { PRIORITY_LABEL, isDayOnly, isTimed, type Placement, type Task } from "@/domain/tasks";
import type { Now } from "@/hooks/use-now";
import { formatDayNumber, formatWeekdayLong, formatWeekdayShort, type ISODate } from "@/lib/dates";
import { formatClock, timeToMinutes, type TimeFormat } from "@/lib/time";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/domain/stats";
import { HOUR_HEIGHT, MIN_BLOCK_MIN, SNAP_MIN, layoutDay, minutesToPx, pxToMinutes } from "./geometry";
import { TaskBlock, describeTimes } from "./task-block";
import type { DragState } from "./use-calendar-dnd";

/** Width of the hour-label gutter. Keep in sync with GUTTER_CLASS. */
export const GUTTER_PX = 56;
const GUTTER_CLASS = "w-14";
const HINT_ID = "calendar-keyboard-hint";

interface TimeGridProps {
  days: ISODate[];
  /** Tasks to draw (already filtered by category). */
  tasks: Task[];
  /** Every task, for workload totals that should not change with filters. */
  allTasks: Task[];
  planning: PlanningPrefs;
  format: TimeFormat;
  density: "comfortable" | "compact";
  now: Now | null;
  conflictedIds: ReadonlySet<string>;
  scrollerRef: RefObject<HTMLDivElement | null>;
  bodyRef: RefObject<HTMLDivElement | null>;
  drag: DragState | null;
  heightClass: string;
  onBlockPointerDown: (event: React.PointerEvent<HTMLElement>, task: Task, grabOffsetMin: number) => void;
  onResizePointerDown: (event: React.PointerEvent<HTMLElement>, task: Task) => void;
  onOpenTask: (id: string) => void;
  onMoveTask: (task: Task, placement: Placement) => void;
  onResizeTask: (task: Task, durationMin: number) => void;
  onToggleLock: (task: Task) => void;
  onCreateAt: (date: ISODate, startMin: number) => void;
  onSelectDay?: (date: ISODate) => void;
  announce: (message: string) => void;
}

function workloadTone(ratio: number): string {
  if (ratio > 1) return "bg-danger";
  if (ratio >= 0.8) return "bg-warning";
  return "bg-success";
}

export function TimeGrid(props: TimeGridProps) {
  const {
    days,
    tasks,
    allTasks,
    planning,
    format,
    density,
    now,
    conflictedIds,
    scrollerRef,
    bodyRef,
    drag,
    heightClass,
  } = props;
  const hourHeight = HOUR_HEIGHT[density];
  const count = days.length;
  const workStartMin = timeToMinutes(planning.workStart);

  // Open at the start of the working day; the rest of the day stays scrollable.
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (scroller) scroller.scrollTop = minutesToPx(Math.max(0, workStartMin - 60), hourHeight);
  }, [scrollerRef, workStartMin, hourHeight]);

  const timed = tasks.filter(isTimed);
  const dayOnly = tasks.filter(isDayOnly);
  const hasFlexible = dayOnly.some((t) => t.placement && days.includes(t.placement.date));

  const lanes = new Map<string, { lane: number; lanes: number }>();
  for (const date of days) {
    const items = timed
      .filter((t) => t.placement.date === date)
      .map((t) => ({ id: t.id, start: t.placement.startMin, end: t.placement.startMin + t.durationMin }));
    for (const [id, info] of layoutDay(items)) lanes.set(id, info);
  }

  const dayLabel = (task: Task, date: ISODate): string =>
    [
      task.title,
      `${formatWeekdayLong(date)} ${describeTimes(task, format)}`.trim(),
      task.status === "done" ? "done" : null,
      task.locked ? "locked in place" : null,
      `${PRIORITY_LABEL[task.priority]} priority`,
    ]
      .filter(Boolean)
      .join(", ");

  const onBlockKeyDown = (event: KeyboardEvent<HTMLElement>, task: Task): void => {
    const placement = task.placement;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      props.onOpenTask(task.id);
      return;
    }
    if (event.key.toLowerCase() === "l") {
      event.preventDefault();
      props.onToggleLock(task);
      return;
    }
    if (!placement || placement.startMin === null) return;
    const arrows = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
    if (!arrows.includes(event.key)) return;
    event.preventDefault();
    if (task.locked) {
      props.announce(`${task.title} is locked. Press L to unlock it first.`);
      return;
    }
    const dayIndex = days.indexOf(placement.date);
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      const delta = event.key === "ArrowUp" ? -SNAP_MIN : SNAP_MIN;
      if (event.shiftKey) {
        const next = Math.max(MIN_BLOCK_MIN, task.durationMin + delta);
        props.onResizeTask(task, next);
        props.announce(`${task.title} now ${formatDuration(next)} long`);
      } else {
        const startMin = placement.startMin + delta;
        props.onMoveTask(task, { date: placement.date, startMin });
        const clamped = Math.min(1440 - task.durationMin, Math.max(0, startMin));
        props.announce(`${task.title} at ${formatClock(Math.floor(clamped / 60), clamped % 60, format)}`);
      }
      return;
    }
    const target = days[dayIndex + (event.key === "ArrowLeft" ? -1 : 1)];
    if (!target) return;
    props.onMoveTask(task, { date: target, startMin: placement.startMin });
    props.announce(`${task.title} moved to ${formatWeekdayLong(target)}`);
  };

  const templateColumns = `${GUTTER_PX}px repeat(${count}, minmax(0, 1fr))`;

  return (
    <div className="rounded-2xl border bg-card shadow-soft">
      <p id={HINT_ID} className="sr-only">
        Press Enter to edit a task. Arrow keys move it, Shift plus Up or Down resizes it, and L locks it in place.
      </p>
      <div
        ref={scrollerRef}
        className={cn("relative overflow-x-hidden overflow-y-auto rounded-2xl", heightClass)}
        data-testid="time-grid-scroller"
      >
        {/* Sticky header: day names, workload, and tasks pinned to a day only. */}
        <div className="sticky top-0 z-30 border-b bg-card">
          <div className="grid" style={{ gridTemplateColumns: templateColumns }}>
            <div className={GUTTER_CLASS} />
            {days.map((date) => {
              const scheduled = scheduledMinutes(allTasks, date);
              const cap = maxDailyMinutes(planning);
              const available = availableMinutes(planning, date);
              const ratio = cap > 0 ? scheduled / cap : 0;
              const isToday = now?.date === date;
              const label = `${formatWeekdayLong(date)}, ${formatDuration(scheduled)} of ${formatDuration(cap)} planned`;
              const content = (
                <>
                  <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    {formatWeekdayShort(date)}
                  </span>
                  <span
                    className={cn(
                      "mt-0.5 flex size-8 items-center justify-center rounded-full text-base font-semibold",
                      isToday ? "bg-primary text-primary-foreground" : "text-foreground",
                    )}
                  >
                    {formatDayNumber(date)}
                  </span>
                </>
              );
              return (
                <div key={date} className="flex flex-col items-center gap-1.5 border-l px-1 pt-2 pb-2">
                  {props.onSelectDay ? (
                    <button
                      type="button"
                      onClick={() => props.onSelectDay?.(date)}
                      aria-label={`Open ${formatWeekdayLong(date)}`}
                      className="flex flex-col items-center rounded-lg px-2 outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {content}
                    </button>
                  ) : (
                    <div className="flex flex-col items-center">{content}</div>
                  )}
                  <div role="img" aria-label={label} className="w-full max-w-24">
                    <div className="h-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn("h-full rounded-full", workloadTone(ratio))}
                        style={{ width: `${Math.min(100, ratio * 100)}%` }}
                      />
                    </div>
                    <p className="mt-1 hidden text-center text-[11px] leading-none text-muted-foreground tabular-nums md:block">
                      {available === 0 && scheduled === 0 ? "Day off" : `${formatDuration(scheduled)} / ${formatDuration(cap)}`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          {hasFlexible ? (
            <div className="grid border-t bg-muted/40" style={{ gridTemplateColumns: templateColumns }}>
              <div className={cn(GUTTER_CLASS, "flex items-center justify-end pr-2 text-[11px] text-muted-foreground")}>
                Any time
              </div>
              {days.map((date) => (
                <div key={date} className="flex min-h-9 flex-col gap-1 border-l p-1">
                  {dayOnly
                    .filter((t) => t.placement?.date === date)
                    .map((task) => {
                      const look = styleOf(task);
                      return (
                        <button
                          key={task.id}
                          type="button"
                          onPointerDown={(e) => props.onBlockPointerDown(e, task, 0)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              props.onOpenTask(task.id);
                            }
                          }}
                          aria-label={`${task.title}, ${formatWeekdayLong(date)}, any time, pinned to this day`}
                          className={cn(
                            "flex touch-none items-center gap-1 rounded-md border-l-[3px] px-1.5 py-1 text-left text-[11px] leading-tight font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            look.surface,
                            look.bar,
                            look.title,
                            task.status === "done" && "line-through",
                          )}
                        >
                          <Pin className="size-3 shrink-0" aria-hidden="true" />
                          <span className="min-w-0 truncate">{task.title}</span>
                        </button>
                      );
                    })}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {/* Body: 24 hours, scrollable. Working hours are where it opens. */}
        <div ref={bodyRef} className="relative" style={{ height: 24 * hourHeight }}>
          <div className="absolute inset-0 grid" style={{ gridTemplateColumns: templateColumns }}>
            <div className={cn(GUTTER_CLASS, "relative")} aria-hidden="true">
              {Array.from({ length: 23 }, (_, i) => i + 1).map((hour) => (
                <span
                  key={hour}
                  className="absolute right-2 -translate-y-1/2 text-[11px] text-muted-foreground tabular-nums"
                  style={{ top: hour * hourHeight }}
                >
                  {formatClock(hour, 0, format)}
                </span>
              ))}
            </div>
            {days.map((date) => (
              <div
                key={date}
                className={cn("relative border-l", now?.date === date && "bg-primary-soft/40")}
                style={{
                  backgroundImage: "linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
                  backgroundSize: `100% ${hourHeight}px`,
                }}
                onDoubleClick={(event) => {
                  if ((event.target as HTMLElement).closest("[data-task-id]")) return;
                  const rect = event.currentTarget.getBoundingClientRect();
                  const minutes = pxToMinutes(event.clientY - rect.top, hourHeight);
                  props.onCreateAt(date, Math.min(1440 - SNAP_MIN, Math.floor(minutes / SNAP_MIN) * SNAP_MIN));
                }}
              >
                {offHours(planning, date).map((seg) => (
                  <div
                    key={seg.start}
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 bg-muted/60"
                    style={{ top: minutesToPx(seg.start, hourHeight), height: minutesToPx(seg.end - seg.start, hourHeight) }}
                  />
                ))}
                {now?.date === date ? (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
                    style={{ top: minutesToPx(now.minutes, hourHeight) }}
                  >
                    <span className="-ml-1 size-2 rounded-full bg-danger" />
                    <span className="h-0.5 flex-1 bg-danger" />
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          {/* Blocks live in one layer so a block keeps keyboard focus when it changes day. */}
          <div className="pointer-events-none absolute inset-y-0 right-0" style={{ left: GUTTER_PX }}>
            {timed
              .filter((t) => days.includes(t.placement.date))
              .map((task) => {
                const dayIndex = days.indexOf(task.placement.date);
                const lane = lanes.get(task.id) ?? { lane: 0, lanes: 1 };
                const dragging = drag?.taskId === task.id;
                return (
                    <TaskBlock
                      key={task.id}
                      task={task}
                      format={format}
                      label={dayLabel(task, task.placement.date)}
                      ghosted={dragging && drag.preview !== null}
                      conflicted={conflictedIds.has(task.id)}
                      style={{
                        top: minutesToPx(task.placement.startMin, hourHeight),
                        height: Math.max(minutesToPx(task.durationMin, hourHeight) - 2, 18),
                        left: `calc(${((dayIndex + lane.lane / lane.lanes) / count) * 100}% + 2px)`,
                        width: `calc(${100 / (count * lane.lanes)}% - 4px)`,
                      }}
                      onPointerDown={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        props.onBlockPointerDown(e, task, pxToMinutes(e.clientY - rect.top, hourHeight));
                      }}
                      onResizePointerDown={(e) => props.onResizePointerDown(e, task)}
                      onKeyDown={(e) => onBlockKeyDown(e, task)}
                    />
                );
              })}

            {drag?.preview
              ? (() => {
                  const task = tasks.find((t) => t.id === drag.taskId) ?? allTasks.find((t) => t.id === drag.taskId);
                  if (!task) return null;
                  const { dayIndex, startMin, durationMin } = drag.preview;
                  const ghost: Task = {
                    ...task,
                    durationMin,
                    placement: { date: days[dayIndex] ?? days[0] ?? "", startMin },
                  };
                  return (
                    <TaskBlock
                      preview
                      task={ghost}
                      format={format}
                      label={`${task.title}, preview`}
                      style={{
                        top: minutesToPx(startMin, hourHeight),
                        height: Math.max(minutesToPx(durationMin, hourHeight) - 2, 18),
                        left: `calc(${(dayIndex / count) * 100}% + 2px)`,
                        width: `calc(${100 / count}% - 4px)`,
                      }}
                    />
                  );
                })()
              : null}
          </div>
        </div>
      </div>
    </div>
  );
}
