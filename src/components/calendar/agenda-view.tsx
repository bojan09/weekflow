"use client";

import { TaskRow } from "@/components/tasks/task-row";
import { EmptyState } from "@/components/states/states";
import { describeTimes } from "./task-block";
import { isInbox, isOverdue, type Task } from "@/domain/tasks";
import { formatLong, type ISODate } from "@/lib/dates";
import type { TimeFormat } from "@/lib/time";
import { cn } from "@/lib/utils";
import { CalendarCheck } from "lucide-react";

interface AgendaViewProps {
  days: ISODate[];
  tasks: Task[];
  today: ISODate | null;
  format: TimeFormat;
  onOpen: (id: string) => void;
}

function sortInDay(a: Task, b: Task): number {
  const as = a.placement?.startMin ?? -1;
  const bs = b.placement?.startMin ?? -1;
  return as - bs || (a.id < b.id ? -1 : 1);
}

/** A readable list: overdue first, then each day in order, then the inbox. */
export function AgendaView({ days, tasks, today, format, onOpen }: AgendaViewProps) {
  const overdue = today ? tasks.filter((t) => isOverdue(t, today)) : [];
  const inbox = tasks.filter(isInbox);
  const anyPlanned = days.some((d) => tasks.some((t) => t.placement?.date === d));

  return (
    <div className="space-y-6">
      {overdue.length > 0 ? (
        <section aria-label="Overdue">
          <h3 className="mb-2 text-sm font-semibold text-danger-text">Overdue</h3>
          <ul className="space-y-2">
            {overdue.map((task) => (
              <TaskRow key={task.id} task={task} today={today} format={format} onOpen={onOpen} />
            ))}
          </ul>
        </section>
      ) : null}

      {days.map((date) => {
        const dayTasks = tasks.filter((t) => t.placement?.date === date).sort(sortInDay);
        const isToday = date === today;
        return (
          <section key={date} aria-label={formatLong(date)}>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <span className={cn(isToday && "text-primary-text")}>{formatLong(date)}</span>
              {isToday ? (
                <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-medium text-primary-foreground">Today</span>
              ) : null}
            </h3>
            {dayTasks.length === 0 ? (
              <p className="rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">Nothing planned.</p>
            ) : (
              <ul className="space-y-2">
                {dayTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    today={today}
                    format={format}
                    onOpen={onOpen}
                    scheduleText={describeTimes(task, format) || "Any time"}
                  />
                ))}
              </ul>
            )}
          </section>
        );
      })}

      {inbox.length > 0 ? (
        <section aria-label="Unscheduled">
          <h3 className="mb-2 text-sm font-semibold">Unscheduled</h3>
          <ul className="space-y-2">
            {inbox.map((task) => (
              <TaskRow key={task.id} task={task} today={today} format={format} onOpen={onOpen} scheduleText="Inbox" />
            ))}
          </ul>
        </section>
      ) : null}

      {!anyPlanned && inbox.length === 0 && overdue.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title="Nothing scheduled"
          description="Add a task to plan your week."
        />
      ) : null}
    </div>
  );
}
