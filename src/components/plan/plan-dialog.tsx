"use client";

import { useMemo, useState } from "react";
import { CalendarCheck, CircleAlert, CircleCheck, Lock, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Term } from "@/components/guide/term";
import { styleOf } from "@/components/tasks/task-style";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { commitSchedule } from "@/data/history";
import { restoreTasks, tasksCollection } from "@/data/tasks";
import { useCollection } from "@/data/use-collection";
import { describeSlot } from "@/domain/conflicts";
import { formatDuration } from "@/domain/stats";
import { isMissed, type Task } from "@/domain/tasks";
import { applyPlan, planSchedule, type PlanMode, type Proposal } from "@/engine";
import { useNow } from "@/hooks/use-now";
import { formatLong } from "@/lib/dates";
import { formatClock, type TimeFormat } from "@/lib/time";
import { usePrefsStore } from "@/prefs/store";
import { useUiStore } from "@/stores/ui";

const clock = (minutes: number, format: TimeFormat): string => formatClock(Math.floor(minutes / 60), minutes % 60, format);

function ProposalRow({ proposal, task, format }: { proposal: Proposal; task: Task | undefined; format: TimeFormat }) {
  const look = task ? styleOf(task) : null;
  const end = proposal.to.startMin + (task?.durationMin ?? 0);
  return (
    <li className={`rounded-xl border-l-[3px] px-3 py-2 ${look ? `${look.surface} ${look.bar}` : "bg-muted"}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <p className={`min-w-0 truncate text-sm font-semibold ${look?.title ?? ""}`}>{proposal.title}</p>
        <p className={`text-xs tabular-nums ${look?.meta ?? "text-muted-foreground"}`}>
          {clock(proposal.to.startMin, format)}–{clock(end, format)}
          {task ? ` · ${formatDuration(task.durationMin)}` : ""}
        </p>
      </div>
      {proposal.from ? (
        <p className={`mt-0.5 text-xs ${look?.meta ?? "text-muted-foreground"}`}>
          Moved from {describeSlot(proposal.from, format)}
        </p>
      ) : null}
      {proposal.late ? <p className="mt-0.5 text-xs font-medium text-warning-text">After its deadline</p> : null}
      <details className="mt-1 text-xs">
        <summary className={`inline-flex min-h-6 cursor-pointer items-center font-medium underline-offset-2 hover:underline ${look?.title ?? ""}`}>
          Why here?
        </summary>
        <ul className={`mt-1 list-disc space-y-0.5 pl-4 ${look?.meta ?? "text-muted-foreground"}`}>
          {proposal.reasons.map((reason) => (
            <li key={reason.code}>{reason.text}</li>
          ))}
        </ul>
      </details>
    </li>
  );
}

function PlanBody({ tasks, initialMissed, onClose }: { tasks: Task[]; initialMissed: boolean; onClose: () => void }) {
  const now = useNow();
  const planning = usePrefsStore((s) => s.prefs.planning);
  const engine = usePrefsStore((s) => s.prefs.engine);
  const format = usePrefsStore((s) => s.prefs.calendar.timeFormat);
  const [fix, setFix] = useState(false);
  const [missed, setMissed] = useState(initialMissed);
  const mode: PlanMode = fix && engine.allowMoveExisting ? "fix" : "inbox";

  const plan = useMemo(
    () => (now ? planSchedule({ tasks, planning, engine, now, mode, format, missed: missed ? "include" : undefined }) : null),
    [tasks, planning, engine, now, mode, format, missed],
  );
  const missedCount = useMemo(() => (now ? tasks.filter((t) => !t.locked && isMissed(t, now)).length : 0), [tasks, now]);
  const byId = useMemo(() => new Map(tasks.map((t) => [t.id, t] as const)), [tasks]);
  const days = useMemo(() => {
    const groups = new Map<string, Proposal[]>();
    for (const proposal of plan?.proposals ?? []) {
      groups.set(proposal.to.date, [...(groups.get(proposal.to.date) ?? []), proposal]);
    }
    return [...groups.entries()];
  }, [plan]);

  if (!plan) return <p className="py-6 text-sm text-muted-foreground">Preparing your plan…</p>;

  const apply = (): void => {
    const previous = commitSchedule("Before Plan my week", (t) => applyPlan(t, plan));
    onClose();
    if (!previous) return;
    const count = plan.proposals.length;
    toast(`Planned ${count} ${count === 1 ? "task" : "tasks"}`, {
      action: { label: "Undo", onClick: () => restoreTasks(previous) },
    });
  };

  const { summary } = plan;
  const nothing = summary.considered === 0;

  return (
    <>
      <div className="flex items-start justify-between gap-4 rounded-xl border p-3">
        <label htmlFor="plan-fix" className="min-w-0 cursor-pointer">
          <span className="flex items-center gap-1 text-sm font-medium">
            Also fix conflicts <Term id="conflict" />
          </span>
          <span className="block text-xs text-muted-foreground">
            {engine.allowMoveExisting
              ? "Move unlocked tasks that overlap, break your hours or miss a deadline. Locked tasks never move."
              : "Turned off in Settings, Scheduling engine. Existing tasks stay where they are."}
          </span>
        </label>
        <Switch id="plan-fix" checked={fix && engine.allowMoveExisting} disabled={!engine.allowMoveExisting} onCheckedChange={setFix} />
      </div>

      <div className="flex items-start justify-between gap-4 rounded-xl border p-3">
        <label htmlFor="plan-missed" className="min-w-0 cursor-pointer">
          <span className="flex items-center gap-1 text-sm font-medium">
            Replan missed tasks{missedCount > 0 ? ` (${missedCount})` : ""} <Term id="missed" />
          </span>
          <span className="block text-xs text-muted-foreground">
            {missedCount > 0
              ? "Give tasks whose time has passed a new slot from now on."
              : "Nothing was missed. Tasks whose time passes without being done will show up here."}
          </span>
        </label>
        <Switch id="plan-missed" checked={missed} disabled={missedCount === 0} onCheckedChange={setMissed} />
      </div>

      <div className="max-h-[22rem] space-y-4 overflow-y-auto pr-1">
        {nothing ? (
          <p className="flex items-start gap-2 rounded-xl bg-success-soft px-3 py-3 text-sm text-success-text">
            <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            Nothing to plan. Every open task already has a place.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground" role="status">
            {summary.placed} to place{summary.moved > 0 ? `, ${summary.moved} of them moved` : ""}
            {summary.unplaced > 0 ? `, ${summary.unplaced} that cannot fit` : ""}.
          </p>
        )}

        {days.map(([date, proposals]) => (
          <section key={date} aria-label={formatLong(date)}>
            <h3 className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{formatLong(date)}</h3>
            <ul className="space-y-1.5">
              {proposals.map((proposal) => (
                <ProposalRow key={proposal.taskId} proposal={proposal} task={byId.get(proposal.taskId)} format={format} />
              ))}
            </ul>
          </section>
        ))}

        {plan.unplaced.length > 0 ? (
          <section aria-label="Tasks that cannot be placed">
            <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-warning-text uppercase">
              <CircleAlert className="size-3.5" aria-hidden="true" /> Cannot be placed
            </h3>
            <ul className="space-y-1.5">
              {plan.unplaced.map((item) => (
                <li key={item.taskId} className="rounded-xl border px-3 py-2">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.message}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Lock className="size-3.5" aria-hidden="true" /> Nothing changes until you apply. You can undo afterwards.
      </p>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={apply} disabled={summary.placed === 0}>
          <CalendarCheck aria-hidden="true" />
          {summary.placed === 0 ? "Nothing to apply" : `Apply plan (${summary.placed})`}
        </Button>
      </DialogFooter>
    </>
  );
}

/**
 * Preview of what the scheduling engine would do. The plan is computed, shown
 * with its reasons, and only written to the calendar when the user applies it.
 */
export function PlanDialog() {
  const open = useUiStore((s) => s.planOpen);
  const setOpen = useUiStore((s) => s.setPlanOpen);
  const tasks = useCollection(tasksCollection);
  const preset = useUiStore((s) => s.planPreset);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="size-4" aria-hidden="true" /> Plan my week
          </DialogTitle>
          <DialogDescription>
            Fits your open tasks around your hours, breaks, buffers and deadlines. Review it first.
          </DialogDescription>
        </DialogHeader>
        {tasks.status === "ready" ? (
          <PlanBody tasks={tasks.data} initialMissed={preset.missed} onClose={() => setOpen(false)} />
        ) : (
          <p className="py-6 text-sm text-muted-foreground">Your tasks are not available right now.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
