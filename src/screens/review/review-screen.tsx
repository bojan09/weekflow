"use client";

import { useMemo, type ReactNode } from "react";
import { CircleCheck, Clock, History, ListChecks, TriangleAlert, Wand2 } from "lucide-react";
import { WeekNav } from "@/components/calendar/week-nav";
import { StatCard } from "@/components/home/stat-card";
import { PageHeader } from "@/components/shell/page-header";
import { ResourceView } from "@/components/states/resource-view";
import { LoadingBlocks } from "@/components/states/states";
import { Button } from "@/components/ui/button";
import { tasksCollection } from "@/data/tasks";
import { useCollection } from "@/data/use-collection";
import { categoryBreakdown, dayWorkload, estimateAccuracy, weeklyReview, type DayLoad, type DayLoadStatus } from "@/domain/review";
import { formatDuration } from "@/domain/stats";
import type { Task } from "@/domain/tasks";
import { usePlanner } from "@/hooks/use-planner";
import { formatDayNumber, formatShort, formatWeekdayShort } from "@/lib/dates";
import { formatClock } from "@/lib/time";
import { cn } from "@/lib/utils";
import { usePrefsStore } from "@/prefs/store";
import { useUiStore } from "@/stores/ui";

const STATUS: Record<DayLoadStatus, { label: string; bar: string; text: string }> = {
  off: { label: "Day off", bar: "bg-muted-foreground/40", text: "text-muted-foreground" },
  light: { label: "Room to spare", bar: "bg-primary", text: "text-muted-foreground" },
  near: { label: "Nearly full", bar: "bg-warning", text: "text-warning-text" },
  over: { label: "Over your limit", bar: "bg-danger", text: "text-danger-text" },
};

function Card({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section aria-label={title} className={cn("rounded-2xl border bg-card p-4 shadow-soft", className)}>
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function WorkloadRow({ row }: { row: DayLoad }) {
  const status = STATUS[row.status];
  const scale = Math.max(row.capMin, row.plannedMin, 1);
  return (
    <li className="grid grid-cols-[3.5rem_1fr] items-center gap-x-3 gap-y-1 sm:grid-cols-[4.5rem_1fr_11rem]">
      <span className="text-sm font-medium tabular-nums">
        {formatWeekdayShort(row.date)} {formatDayNumber(row.date)}
      </span>
      <span aria-hidden="true" className="relative h-3 overflow-hidden rounded-full bg-muted">
        <span className={cn("absolute inset-y-0 left-0 rounded-full", status.bar)} style={{ width: `${(row.plannedMin / scale) * 100}%` }} />
        <span className="absolute inset-y-0 w-px bg-foreground/60" style={{ left: `${(row.capMin / scale) * 100}%` }} />
      </span>
      <span className={cn("col-span-2 text-xs sm:col-span-1 sm:text-right", status.text)}>
        {formatDuration(row.plannedMin)} of {formatDuration(row.capMin)}
        {" · "}
        <span className={row.status === "over" || row.status === "near" ? "font-medium" : undefined}>{status.label}</span>
      </span>
    </li>
  );
}

function TaskList({ tasks, empty, when }: { tasks: Task[]; empty: string; when: (task: Task) => string }) {
  if (tasks.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="space-y-1.5">
      {tasks.map((task) => (
        <li key={task.id} className="flex items-baseline justify-between gap-3 text-sm">
          <span className="min-w-0 truncate">{task.title}</span>
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{when(task)}</span>
        </li>
      ))}
    </ul>
  );
}

function ReviewBody({ tasks }: { tasks: Task[] }) {
  const planner = usePlanner();
  const planning = usePrefsStore((s) => s.prefs.planning);
  const format = usePrefsStore((s) => s.prefs.calendar.timeFormat);
  const openPlan = useUiStore((s) => s.openPlan);
  const { now, week } = planner;

  const data = useMemo(() => {
    if (!now || week.length === 0) return null;
    return {
      load: dayWorkload(tasks, planning, week),
      categories: categoryBreakdown(tasks, week),
      accuracy: estimateAccuracy(tasks, week),
      review: weeklyReview(tasks, week, now),
    };
  }, [tasks, planning, week, now]);

  if (!data) return <LoadingBlocks rows={4} />;
  const { load, categories, accuracy, review } = data;
  const planned = load.reduce((sum, d) => sum + d.plannedMin, 0);
  const overloaded = load.filter((d) => d.status === "over").length;
  const totalCategory = categories.reduce((sum, c) => sum + c.minutes, 0);
  const placedWhen = (task: Task): string =>
    task.placement
      ? `${formatShort(task.placement.date)}${task.placement.startMin === null ? "" : ` ${formatClock(Math.floor(task.placement.startMin / 60), task.placement.startMin % 60, format)}`}`
      : "";

  return (
    <div className="space-y-5">
      <section aria-label="This week in numbers" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard tone="success" icon={CircleCheck} label="Completed" value={String(review.completed.length)} hint={`${formatDuration(review.completedMin)} of work`} />
        <StatCard tone="danger" icon={Clock} label="Missed" value={String(review.missed.length)} hint="time passed, not done" />
        <StatCard tone="info" icon={ListChecks} label="Planned" value={formatDuration(planned)} hint="placed this week" />
        <StatCard tone={overloaded > 0 ? "danger" : "neutral"} icon={TriangleAlert} label="Overloaded days" value={String(overloaded)} hint={`over ${planning.maxDailyHours}h`} />
      </section>

      <Card title="Workload by day">
        <ul className="space-y-2.5">
          {load.map((row) => (
            <WorkloadRow key={row.date} row={row} />
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">The line marks your daily limit of {planning.maxDailyHours}h. Change it in Settings, Planning.</p>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Where the time goes">
          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing placed or finished this week.</p>
          ) : (
            <ul className="space-y-2">
              {categories.map((c) => (
                <li key={c.category} className="text-sm">
                  <div className="flex justify-between gap-3">
                    <span>{c.label}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {formatDuration(c.minutes)} · {Math.round((c.minutes / totalCategory) * 100)}%
                    </span>
                  </div>
                  <div aria-hidden="true" className="mt-1 h-1.5 rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(c.minutes / totalCategory) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Estimates vs reality">
          {accuracy.samples === 0 ? (
            <p className="text-sm text-muted-foreground">
              Add the actual time when you finish a task and Weekflow will compare it with your estimate.
            </p>
          ) : (
            <p className="text-sm">
              Across {accuracy.samples} finished {accuracy.samples === 1 ? "task" : "tasks"} you estimated{" "}
              <strong>{formatDuration(accuracy.estimatedMin)}</strong> and spent <strong>{formatDuration(accuracy.actualMin)}</strong>
              {accuracy.actualMin === accuracy.estimatedMin
                ? ". Spot on."
                : accuracy.actualMin > accuracy.estimatedMin
                  ? `, ${formatDuration(accuracy.actualMin - accuracy.estimatedMin)} more than planned.`
                  : `, ${formatDuration(accuracy.estimatedMin - accuracy.actualMin)} less than planned.`}
            </p>
          )}
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title={`Missed (${review.missed.length})`}>
          <TaskList tasks={review.missed} empty="Nothing slipped this week." when={placedWhen} />
          {review.missed.length > 0 ? (
            <Button size="sm" className="mt-3" onClick={() => openPlan({ missed: true })}>
              <Wand2 aria-hidden="true" /> Replan missed tasks
            </Button>
          ) : null}
        </Card>
        <Card title={`Completed (${review.completed.length})`}>
          <TaskList tasks={review.completed} empty="Nothing finished yet this week." when={(t) => (t.completedOn ? formatShort(t.completedOn) : "")} />
        </Card>
        <Card title={`Still ahead (${review.ahead.length})`}>
          <TaskList tasks={review.ahead} empty="Nothing else planned for this week." when={placedWhen} />
        </Card>
        <Card title={`Due soon, no time yet (${review.dueSoonUnscheduled.length})`}>
          <TaskList tasks={review.dueSoonUnscheduled} empty="Every task due in the next week has a place." when={(t) => (t.deadline ? `Due ${formatShort(t.deadline)}` : "")} />
          {review.dueSoonUnscheduled.length > 0 ? (
            <Button size="sm" variant="outline" className="mt-3" onClick={() => openPlan()}>
              <Wand2 aria-hidden="true" /> Plan my week
            </Button>
          ) : null}
        </Card>
      </div>
    </div>
  );
}

export function ReviewScreen() {
  const planner = usePlanner();
  const tasks = useCollection(tasksCollection);
  const setHistoryOpen = useUiStore((s) => s.setHistoryOpen);
  return (
    <>
      <PageHeader
        title="Weekly review"
        subtitle="How the week is going: workload, what got done, and what slipped."
        actions={
          <>
            <Button variant="outline" onClick={() => setHistoryOpen(true)} className="h-10">
              <History aria-hidden="true" /> Schedule history
            </Button>
            <WeekNav planner={planner} />
          </>
        }
      />
      <ResourceView state={tasks} loading={<LoadingBlocks rows={4} />}>
        {(data) => <ReviewBody tasks={data} />}
      </ResourceView>
    </>
  );
}
