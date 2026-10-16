"use client";

import Link from "next/link";
import { useMemo } from "react";
import { CircleCheck, Clock, Hourglass, ListChecks, Wand2 } from "lucide-react";
import { TimeScaleControl, WeekNav } from "@/components/calendar/week-nav";
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
import { useAppPath } from "@/hooks/use-app-path";
import { usePrefsStore } from "@/prefs/store";
import { useUiStore } from "@/stores/ui";

function HomeBody({ tasks }: { tasks: Task[] }) {
  const appPath = useAppPath();
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
  const inboxCount = tasks.filter(isInbox).length;
  const missedCount = now ? tasks.filter((t) => !t.locked && isMissed(t, now)).length : 0;

  return (
    <>
      <section aria-label="This week in numbers" className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
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

      <div className="grid gap-3 sm:gap-5 2xl:grid-cols-[minmax(0,1fr)_18rem]">
        <section aria-label="Week calendar" className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Your schedule</h2>
            <TimeScaleControl />
            <Link href={appPath("week")} className="inline-flex min-h-11 items-center text-sm font-medium text-primary-text hover:underline">Open My Week →</Link>
          </div>
          <WeekPlanner variant="compact" />
          <QuickAdd className="mt-3" placeholder="Add a task to your inbox…" />
        </section>
        <aside aria-label="Needs attention" className="min-w-0 space-y-4">
          {now ? <ReviewPrompt now={now} /> : null}
          <MissedBanner count={missedCount} />
          <ConflictsPanel conflicts={conflicts} />
          <Link
            href={appPath("week")}
            className="flex items-center justify-between rounded-2xl border bg-card px-4 py-3 text-sm shadow-soft hover:border-primary-border"
          >
            <span>
              <span className="block font-medium">Inbox</span>
              <span className="text-muted-foreground">
                {inboxCount === 0 ? "Inbox is clear" : `${inboxCount} ${inboxCount === 1 ? "task" : "tasks"} waiting for a time`}
              </span>
            </span>
            <span className="text-primary-text">Open My Week</span>
          </Link>
        </aside>
      </div>

      <ActiveRulesBar />
      <StartHere />
    </>
  );
}

export function HomeScreen() {
  const openPlan = useUiStore((s) => s.openPlan);
  const planner = usePlanner();
  const profile = useCollection(profileCollection);
  const tasks = useCollection(tasksCollection);
  const name = profile.status === "ready" ? firstName(profile.data.fullName) : "";
  const hour = planner.now ? Math.floor(planner.now.minutes / 60) : null;
  const greeting = hour === null ? "Welcome back" : greetingFor(hour);

  return (
    <>
      <PageHeader
        compact
        title={name ? `${greeting}, ${name} 👋` : `${greeting} 👋`}
        subtitle="Here's your week at a glance, based on your rules and priorities."
        navigation={<><WeekNav planner={planner} compact /><Button onClick={() => openPlan()} aria-label="Preview a plan" className="min-h-11 rounded-xl"><Wand2 aria-hidden="true" /><span className="hidden sm:inline">Preview a plan</span></Button></>}
      />
      <div className="space-y-3 sm:space-y-5">
        <ResourceView state={tasks} loading={<LoadingBlocks rows={4} />}>
          {(data) => <HomeBody tasks={data} />}
        </ResourceView>
      </div>
    </>
  );
}
