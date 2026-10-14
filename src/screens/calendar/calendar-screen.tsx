"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CategoryFilter } from "@/components/calendar/week-nav";
import { PageHeader } from "@/components/shell/page-header";
import { ResourceView } from "@/components/states/resource-view";
import { LoadingBlocks } from "@/components/states/states";
import { styleOf } from "@/components/tasks/task-style";
import { Button } from "@/components/ui/button";
import { tasksCollection } from "@/data/tasks";
import { useCollection } from "@/data/use-collection";
import { availableMinutes, maxDailyMinutes, scheduledMinutes } from "@/domain/availability";
import { formatDuration } from "@/domain/stats";
import type { Task } from "@/domain/tasks";
import { useNow } from "@/hooks/use-now";
import {
  addMonths,
  formatDayNumber,
  formatLong,
  formatMonthYear,
  isSameMonth,
  monthGrid,
  type ISODate,
} from "@/lib/dates";
import { orderedWeekdays } from "@/lib/time";
import { cn } from "@/lib/utils";
import { usePrefsStore } from "@/prefs/store";
import { usePlannerStore } from "@/stores/planner";
import { appPath } from "@/lib/routes";

function MonthBody({ tasks }: { tasks: Task[] }) {
  const router = useRouter();
  const now = useNow();
  const weekStart = usePrefsStore((s) => s.prefs.calendar.weekStart);
  const planning = usePrefsStore((s) => s.prefs.planning);
  const category = usePlannerStore((s) => s.category);
  const anchorState = usePlannerStore((s) => s.anchor);
  const setAnchor = usePlannerStore((s) => s.setAnchor);
  const setView = usePlannerStore((s) => s.setView);
  const [month, setMonth] = useState<ISODate | null>(null);

  const focus = month ?? anchorState ?? now?.date ?? null;
  const visible = useMemo(
    () => (category === "all" ? tasks : tasks.filter((t) => t.category === category)),
    [tasks, category],
  );
  const weeks = useMemo(() => (focus ? monthGrid(focus, weekStart) : []), [focus, weekStart]);
  const cap = maxDailyMinutes(planning);

  if (!focus) return <LoadingBlocks rows={4} />;

  const openDay = (date: ISODate): void => {
    setAnchor(date);
    setView("day");
    router.push(appPath("week"));
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <Button variant="outline" size="icon-lg" aria-label="Previous month" onClick={() => setMonth(addMonths(focus, -1))}>
            <ChevronLeft aria-hidden="true" />
          </Button>
          <p aria-live="polite" className="min-w-40 text-center text-sm font-medium">
            {formatMonthYear(focus)}
          </p>
          <Button variant="outline" size="icon-lg" aria-label="Next month" onClick={() => setMonth(addMonths(focus, 1))}>
            <ChevronRight aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-9"
            onClick={() => {
              setMonth(null);
              setAnchor(null);
            }}
          >
            Today
          </Button>
        </div>
        <CategoryFilter />
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-soft">
        <div className="grid grid-cols-7 border-b bg-muted/40">
          {orderedWeekdays(weekStart).map((d) => (
            <div key={d.index} className="px-2 py-2 text-center text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {d.short}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {weeks.flat().map((date) => {
            const dayTasks = visible
              .filter((t) => t.placement?.date === date)
              .sort((a, b) => (a.placement?.startMin ?? -1) - (b.placement?.startMin ?? -1));
            const scheduled = scheduledMinutes(tasks, date);
            const ratio = cap > 0 ? scheduled / cap : 0;
            const inMonth = isSameMonth(date, focus);
            const isToday = date === now?.date;
            const off = availableMinutes(planning, date) === 0;
            return (
              <button
                key={date}
                type="button"
                onClick={() => openDay(date)}
                aria-label={`${formatLong(date)}, ${dayTasks.length} ${dayTasks.length === 1 ? "task" : "tasks"}, ${formatDuration(scheduled)} planned`}
                className={cn(
                  "flex min-h-20 flex-col gap-1 border-r border-b p-1.5 text-left outline-none hover:bg-primary-soft/40 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring sm:min-h-28 sm:p-2",
                  !inMonth && "bg-muted/40 text-muted-foreground",
                  off && inMonth && "bg-muted/30",
                )}
              >
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full text-xs font-semibold",
                    isToday && "bg-primary text-primary-foreground",
                  )}
                >
                  {formatDayNumber(date)}
                </span>
                <span className="hidden min-w-0 flex-1 flex-col gap-0.5 sm:flex">
                  {dayTasks.slice(0, 3).map((task) => {
                    const look = styleOf(task);
                    return (
                      <span
                        key={task.id}
                        className={cn(
                          "truncate rounded border-l-2 px-1 py-px text-[11px] leading-tight font-medium",
                          look.surface,
                          look.bar,
                          look.title,
                          task.status === "done" && "line-through",
                        )}
                      >
                        {task.title}
                      </span>
                    );
                  })}
                  {dayTasks.length > 3 ? (
                    <span className="px-1 text-[11px] text-muted-foreground">+{dayTasks.length - 3} more</span>
                  ) : null}
                </span>
                {dayTasks.length > 0 ? (
                  <span className="mt-auto sm:hidden text-[11px] text-muted-foreground tabular-nums">
                    {dayTasks.length} {dayTasks.length === 1 ? "task" : "tasks"}
                  </span>
                ) : null}
                <span aria-hidden="true" className="mt-auto block h-1 overflow-hidden rounded-full bg-muted">
                  <span
                    className={cn("block h-full rounded-full", ratio > 1 ? "bg-danger" : ratio >= 0.8 ? "bg-warning" : "bg-success")}
                    style={{ width: `${Math.min(100, ratio * 100)}%` }}
                  />
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

export function CalendarScreen() {
  const state = useCollection(tasksCollection);
  return (
    <>
      <PageHeader title="Calendar" subtitle="The month at a glance. Pick a day to plan it." />
      <ResourceView state={state} loading={<LoadingBlocks rows={4} />}>
        {(tasks) => <MonthBody tasks={tasks} />}
      </ResourceView>
    </>
  );
}
