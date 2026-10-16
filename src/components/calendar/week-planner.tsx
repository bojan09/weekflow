"use client";

import { useMemo, useRef, useState, type TouchEvent } from "react";
import { LoadingBlocks } from "@/components/states/states";
import { ResourceView } from "@/components/states/resource-view";
import { placeTask, removeTask, toggleLock } from "@/components/tasks/actions";
import { mutateTasks, tasksCollection } from "@/data/tasks";
import { useCollection } from "@/data/use-collection";
import { detectConflicts } from "@/domain/conflicts";
import { resizeTask } from "@/domain/task-ops";
import { isInbox, type Placement, type Task } from "@/domain/tasks";
import { useMediaQuery } from "@/hooks/use-media-query";
import { usePlanner } from "@/hooks/use-planner";
import { addDays, formatDayNumber, formatWeekdayLong, formatWeekdayShort, type ISODate } from "@/lib/dates";
import { formatClock } from "@/lib/time";
import { cn } from "@/lib/utils";
import { usePrefsStore } from "@/prefs/store";
import { usePlannerStore } from "@/stores/planner";
import { useUiStore } from "@/stores/ui";
import { AgendaView } from "./agenda-view";
import { HOUR_HEIGHT, type GridMetrics } from "./geometry";
import { GUTTER_PX, TimeGrid } from "./time-grid";
import { UnscheduledTray } from "./unscheduled-tray";
import { useCalendarDnd } from "./use-calendar-dnd";

interface WeekPlannerProps {
  /** "compact" is the Home calendar: shorter, no inbox rail. */
  variant?: "full" | "compact";
}

const SWIPE_MIN_PX = 70;
const SWIPE_MAX_DRIFT_PX = 50;

function Planner({ tasks, variant }: { tasks: Task[]; variant: "full" | "compact" }) {
  const planner = usePlanner();
  const planning = usePrefsStore((s) => s.prefs.planning);
  const format = usePrefsStore((s) => s.prefs.calendar.timeFormat);
  const stepMin = usePrefsStore((s) => s.prefs.calendar.timeStepMin);
  const editorTiming = useUiStore((s) => s.editorTiming);
  const density = usePrefsStore((s) => s.prefs.appearance.density);
  const category = usePlannerStore((s) => s.category);
  const setAnchor = usePlannerStore((s) => s.setAnchor);
  const setView = usePlannerStore((s) => s.setView);
  const openEditor = useUiStore((s) => s.openEditor);
  const wide = useMediaQuery("(min-width: 768px)");

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const touch = useRef<{ x: number; y: number } | null>(null);

  const { anchor, now, view } = planner;
  const days: ISODate[] = useMemo(() => {
    if (!anchor) return [];
    return view === "day" || !wide ? [anchor] : planner.week;
  }, [anchor, view, wide, planner.week]);

  const visible = useMemo(
    () => tasks.map((task) => task.id === editorTiming?.id ? { ...task, durationMin: editorTiming.durationMin, placement: editorTiming.placement } : task)
      .filter((task) => category === "all" || task.category === category),
    [tasks, category, editorTiming],
  );

  const conflictedIds = useMemo(() => {
    if (!now) return new Set<string>();
    const important = detectConflicts(tasks, planning, now, format).filter((c) => c.kind !== "outside-hours");
    return new Set(important.flatMap((c) => c.taskIds));
  }, [tasks, planning, now, format]);

  const hourHeight = HOUR_HEIGHT[density];
  const byId = (id: string): Task | undefined => tasks.find((t) => t.id === id);

  const dnd = useCalendarDnd({
    stepMin,
    getScroller: () => scrollerRef.current,
    getMetrics: (): GridMetrics | null => {
      const body = bodyRef.current;
      if (!body) return null;
      const rect = body.getBoundingClientRect();
      return { left: rect.left + GUTTER_PX, top: rect.top, width: rect.width - GUTTER_PX, dayCount: days.length, hourHeight };
    },
    onMove: (taskId, dayIndex, startMin) => {
      const task = byId(taskId);
      const date = days[dayIndex];
      if (!task || !date) return;
      const wasInbox = isInbox(task);
      if (placeTask(taskId, { date, startMin })) {
        const time = formatClock(Math.floor(startMin / 60), startMin % 60, format);
        setAnnouncement(`${task.title} ${wasInbox ? "scheduled" : "moved"} to ${formatWeekdayLong(date)} ${time}`);
      }
    },
    onResize: (taskId, durationMin) => {
      mutateTasks((t) => resizeTask(t, taskId, durationMin));
      const task = tasksCollection.getSnapshot().find((task) => task.id === taskId);
      if (task) setAnnouncement(`${task.title} resized to ${task.durationMin} minutes`);
    },
    onClick: (id) => openEditor({ kind: "edit", id }),
  });

  const onKeyboardMove = (task: Task, placement: Placement): void => {
    placeTask(task.id, placement);
  };

  const onTouchStart = (event: TouchEvent): void => {
    const t = event.touches[0];
    touch.current = t ? { x: t.clientX, y: t.clientY } : null;
  };
  const onTouchEnd = (event: TouchEvent): void => {
    const start = touch.current;
    touch.current = null;
    const t = event.changedTouches[0];
    if (!start || !t || wide || dnd.drag || !anchor) return;
    if ((event.target as HTMLElement).closest("[data-task-id]")) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) >= SWIPE_MIN_PX && Math.abs(dy) <= SWIPE_MAX_DRIFT_PX) {
      setAnchor(addDays(anchor, dx < 0 ? 1 : -1));
    }
  };

  if (!anchor) return <LoadingBlocks rows={3} />;

  const inbox = visible.filter(isInbox);
  const compact = variant === "compact";
  const heightClass = compact ? "h-[30rem]" : "h-[min(72vh,46rem)]";

  const calendar =
    view === "agenda" ? (
      <AgendaView days={planner.week} tasks={visible} today={now?.date ?? null} format={format} onOpen={(id) => openEditor({ kind: "edit", id })} />
    ) : (
      <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {!wide ? (
          <div role="group" aria-label="Choose a day" className="mb-3 grid grid-cols-7 gap-1">
            {planner.week.map((date) => {
              const selected = date === anchor;
              return (
                <button
                  key={date}
                  type="button"
                  aria-pressed={selected}
                  aria-label={formatWeekdayLong(date)}
                  onClick={() => setAnchor(date)}
                  className={cn(
                    "flex min-w-0 flex-col items-center rounded-xl py-1.5 text-xs",
                    selected ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground",
                  )}
                >
                  <span className="text-[11px] uppercase">{formatWeekdayShort(date)}</span>
                  <span className="text-sm font-semibold">{formatDayNumber(date)}</span>
                </button>
              );
            })}
          </div>
        ) : null}
        <TimeGrid
          days={days}
          tasks={visible}
          allTasks={tasks}
          planning={planning}
          format={format}
          stepMin={stepMin}
          density={density}
          now={now}
          conflictedIds={conflictedIds}
          scrollerRef={scrollerRef}
          bodyRef={bodyRef}
          drag={dnd.drag}
          heightClass={heightClass}
          startAtWork={compact}
          onBlockPointerDown={dnd.beginMove}
          onResizePointerDown={dnd.beginResize}
          onOpenTask={(id) => openEditor({ kind: "edit", id })}
          onMoveTask={(task, placement) => onKeyboardMove(task, placement)}
          onResizeTask={(task, durationMin) => {
            mutateTasks((t) => resizeTask(t, task.id, durationMin));
          }}
          onToggleLock={(task) => {
            toggleLock(task);
            setAnnouncement(`${task.title} ${task.locked ? "unlocked" : "locked in place"}`);
          }}
          onDeleteTask={removeTask}
          onCreateAt={(date, startMin) =>
            openEditor({ kind: "new", defaults: { placement: { date, startMin } } })
          }
          onSelectDay={view === "week" && wide ? (date) => { setAnchor(date); setView("day"); } : undefined}
          announce={setAnnouncement}
        />
      </div>
    );

  return (
    <div className={cn("grid grid-cols-[minmax(0,1fr)] gap-4", !compact && view !== "agenda" && "xl:grid-cols-[minmax(0,1fr)_18rem]")}>
      <div className="min-w-0">{calendar}</div>
      {!compact && view !== "agenda" ? (
        <UnscheduledTray
          tasks={inbox}
          now={now}
          planning={planning}
          drag={dnd.drag}
          onPointerDown={(e, task) => dnd.beginMove(e, task, 15)}
          onScheduled={(_task, message) => setAnnouncement(message)}
        />
      ) : null}
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}

/** The week/day/agenda planner with drag, resize, keyboard control and the inbox rail. */
export function WeekPlanner({ variant = "full" }: WeekPlannerProps) {
  const state = useCollection(tasksCollection);
  return (
    <ResourceView state={state} loading={<LoadingBlocks rows={4} />}>
      {(tasks) => <Planner tasks={tasks} variant={variant} />}
    </ResourceView>
  );
}
