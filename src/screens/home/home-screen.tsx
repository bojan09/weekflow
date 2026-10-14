"use client";

import Link from "next/link";
import { useMemo } from "react";
import { CircleCheck, Clock, Hourglass, ListChecks, Wand2 } from "lucide-react";
import { WeekNav } from "@/components/calendar/week-nav";
import { WeekPlanner } from "@/components/calendar/week-planner";
import { StartHere } from "@/components/guide/start-here";
import { MissedBanner, ReviewPrompt } from "@/components/home/attention-cards";
import { ActiveRulesBar } from "@/components/home/active-rules-bar";
import { ConflictsPanel } from "@/components/home/conflicts-panel";
import { StatCard } from "@/components/home/stat-card";
import { PageHeader } from "@/components/shell/page-header";
import { LoadingBlocks } from "@/components/states/states";
import { ResourceView } from "@/components/states/resource-view";
import { QuickAdd } from "@/components/tasks/quick-add";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { profileCollection } from "@/data/profile";
import { tasksCollection } from "@/data/tasks";
import { useCollection } from "@/data/use-collection";
import { detectConflicts } from "@/domain/conflicts";
import { formatDuration, weekStats } from "@/domain/stats";
import { isInbox, isMissed, type Task } from "@/domain/tasks";
import { usePlanner } from "@/hooks/use-planner";
import { firstName, greetingFor } from "@/lib/greeting";
import { appPath } from "@/lib/routes";
import { usePrefsStore } from "@/prefs/store";
import { useUiStore } from "@/stores/ui";

function HomeBody({ tasks }: { tasks: Task[] }) {
  const planner = usePlanner();
  const planning = usePrefsStore((s) => s.prefs.planning);
  const format = usePrefsStore((s) => s.prefs.calendar.timeFormat);
  const { now, week } = planner;

  const stats = useMemo(
    () => (now && week.length ? weekStats(tasks, planning, week, now.date) : null),
    [tasks, planning, week, now],
  );
  const conflicts = useMemo(
    () => (now ? detectConflicts(tasks, planning, now, format) : []),
    [tasks, planning, now, format],
  );
  const openPlan = useUiStore((s) => s.openPlan);
  const inboxCount = tasks.filter(isInbox).length;
  const missedCount = now ? tasks.filter((t) => !t.locked && isMissed(t, now)).length : 0;

  return (
    <>
      <StartHere />
      <section aria-label="This week in numbers" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats ? (
          <>
            <StatCard tone="neutral" icon={ListChecks} label="Tasks this week" value={String(stats.total)} />
            <StatCard tone="success" icon={CircleCheck} label="Completed" value={String(stats.completed)} />
            <StatCard tone="danger" icon={Clock} label="Overdue" value={String(stats.overdue)} />
            <StatCard
              tone="info"
              icon={Hourglass}
              label="Free time"
              value={formatDuration(stats.freeMin)}
              hint="left this week"
            />
          </>
        ) : (
          Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.5rem] rounded-2xl" />)
        )}
      </section>

      {now ? <ReviewPrompt now={now} /> : null}
      <MissedBanner count={missedCount} />

      <QuickAdd className="max-w-2xl" placeholder="Quick add a task to your inbox…" />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-label="Week calendar" className="min-w-0">
          <WeekPlanner variant="compact" />
        </section>
        <div className="space-y-4">
          <ConflictsPanel conflicts={conflicts} />
          <Button onClick={() => openPlan()} className="h-11 w-full rounded-2xl">
            <Wand2 aria-hidden="true" /> Plan my week
          </Button>
          <Link
            href={appPath("week")}
            className="flex items-center justify-between rounded-2xl border bg-card px-4 py-3 text-sm shadow-soft hover:border-primary-border"
          >
            <span>
              <span className="block font-medium">Unscheduled</span>
              <span className="text-muted-foreground">
                {inboxCount === 0 ? "Inbox is clear" : `${inboxCount} ${inboxCount === 1 ? "task" : "tasks"} waiting for a time`}
              </span>
            </span>
            <span className="text-primary-text">Open My Week</span>
          </Link>
        </div>
      </div>

      <ActiveRulesBar />
    </>
  );
}

export function HomeScreen() {
  const planner = usePlanner();
  const profile = useCollection(profileCollection);
  const tasks = useCollection(tasksCollection);
  const name = profile.status === "ready" ? firstName(profile.data.fullName) : "";
  const hour = planner.now ? Math.floor(planner.now.minutes / 60) : null;
  const greeting = hour === null ? "Welcome back" : greetingFor(hour);

  return (
    <>
      <PageHeader
        title={name ? `${greeting}, ${name} 👋` : `${greeting} 👋`}
        subtitle="Here's your week at a glance, based on your rules and priorities."
        actions={<WeekNav planner={planner} />}
      />
      <div className="space-y-5">
        <ResourceView state={tasks} loading={<LoadingBlocks rows={4} />}>
          {(data) => <HomeBody tasks={data} />}
        </ResourceView>
      </div>
    </>
  );
}
