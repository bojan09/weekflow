"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { commitSchedule } from "@/data/history";
import { restoreTasks, tasksCollection } from "@/data/tasks";
import { useCollection } from "@/data/use-collection";
import { applyPlan, planSchedule } from "@/engine";
import { usePrefsStore } from "@/prefs/store";
import { useNow } from "./use-now";

/**
 * When "Replan automatically" is chosen in Settings, give tasks whose time has
 * passed a new slot. It runs once per set of missed tasks, saves the schedule
 * first, and always offers Undo. With "ask" or "never" it does nothing.
 */
export function useAutoReplan(): void {
  const tasks = useCollection(tasksCollection);
  const now = useNow();
  const planning = usePrefsStore((s) => s.prefs.planning);
  const engine = usePrefsStore((s) => s.prefs.engine);
  const format = usePrefsStore((s) => s.prefs.calendar.timeFormat);
  const handled = useRef("");

  const list = tasks.status === "ready" ? tasks.data : null;
  useEffect(() => {
    if (engine.autoReschedule !== "auto" || !list || !now) return;
    const plan = planSchedule({ tasks: list, planning, engine, now, mode: "inbox", missed: "only", format });
    if (plan.proposals.length === 0) return;
    const key = `${now.date}:${plan.proposals.map((p) => p.taskId).join(",")}`;
    if (handled.current === key) return;
    handled.current = key;
    const previous = commitSchedule("Before auto-replanning", (t) => applyPlan(t, plan));
    if (!previous) return;
    const count = plan.proposals.length;
    toast(`Replanned ${count} missed ${count === 1 ? "task" : "tasks"}`, {
      action: { label: "Undo", onClick: () => restoreTasks(previous) },
    });
  }, [list, now, planning, engine, format]);
}
