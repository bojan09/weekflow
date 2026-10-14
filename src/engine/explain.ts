import { fitsPreference, type PlanningPrefs } from "@/domain/availability";
import { describeSlot } from "@/domain/conflicts";
import type { Placement, Task } from "@/domain/tasks";
import { diffDays, formatShort, type ISODate } from "@/lib/dates";
import type { TimeFormat } from "@/lib/time";
import type { Reason, UnplacedCode } from "./types";

export interface PlacementFacts {
  planning: PlanningPrefs;
  format: TimeFormat;
  /** 1-based place in the order the engine worked through its candidates. */
  position: number;
  total: number;
  critical: boolean;
  late: boolean;
  /** The prerequisite that pushed the start later, if any. */
  after?: Task;
  from: Placement | null;
  movedBecause?: string;
  reoptimizing: boolean;
  today: ISODate;
}

const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Why a task landed where it did, in plain language, most important reason first. */
export function explainPlacement(
  task: Task,
  slot: { date: ISODate; startMin: number },
  facts: PlacementFacts,
): Reason[] {
  const reasons: Reason[] = [];
  const { planning, format } = facts;

  if (facts.from) {
    const was = describeSlot(facts.from, format);
    reasons.push({
      code: "moved",
      text: facts.movedBecause
        ? `Moved from ${was}: ${facts.movedBecause.toLowerCase()}.`
        : `Re-planned from ${was} to fit the whole week together.`,
    });
  }

  const why = facts.critical
    ? task.deadline !== null && task.deadline < facts.today
      ? "its deadline has passed"
      : "its deadline is close"
    : task.priority === "high"
      ? "it is high priority"
      : task.priority === "low"
        ? "it is low priority"
        : "of its priority and deadline";
  reasons.push({
    code: "order",
    text: `Planned ${facts.position} of ${facts.total}, because ${why}.`,
  });

  if (task.deadline) {
    const margin = diffDays(slot.date, task.deadline);
    reasons.push({
      code: "deadline",
      text: facts.late
        ? `Lands after its ${formatShort(task.deadline)} deadline, which you set to flexible. No earlier time was free.`
        : margin < 0
          ? `Its ${formatShort(task.deadline)} deadline had already passed, so it takes the first free time.`
          : margin === 0
            ? `On its deadline day, ${formatShort(task.deadline)}.`
            : `Finishes ${plural(margin, "day")} before its ${formatShort(task.deadline)} deadline.`,
    });
  }

  if (facts.after) {
    reasons.push({ code: "dependency", text: `Placed after “${facts.after.title}”, which it depends on.` });
  }
  if (task.earliestStart && slot.date === task.earliestStart) {
    reasons.push({ code: "earliest-start", text: `Not before ${formatShort(task.earliestStart)}, its earliest start.` });
  }

  if (planning.preferredTime !== "any") {
    reasons.push({
      code: "preference",
      text: fitsPreference(slot.startMin, planning.preferredTime)
        ? `Matches your preference for the ${planning.preferredTime}.`
        : `No ${planning.preferredTime} time was free that day, so it took the next best.`,
    });
  }

  if (planning.focusTime.enabled && task.category === "focus") {
    reasons.push({ code: "focus", text: "Focus work is planned early so it gets uninterrupted time." });
  }

  reasons.push({
    code: "slot",
    text: `${describeSlot(slot, format)} is the first slot of ${plural(task.durationMin, "minute")} that fits your working hours, breaks${
      planning.bufferMin > 0 ? `, ${planning.bufferMin}-minute buffers` : ""
    } and the ${planning.maxDailyHours}-hour daily limit.`,
  });
  return reasons;
}

export function explainUnplaced(
  task: Task,
  code: UnplacedCode,
  context: { blocker?: Task; horizonDays: number; format: TimeFormat },
): string {
  switch (code) {
    case "no-room-before-deadline":
      return `No free time before its ${formatShort(task.deadline ?? "")} deadline. Free up time, shorten other tasks, or move the deadline.`;
    case "no-room":
      return `No free time in the next ${plural(Math.round(context.horizonDays / 7), "week")}. Free up time or shorten the task.`;
    case "impossible-window":
      return `Its earliest start is after its ${formatShort(task.deadline ?? "")} deadline. Change one of the dates.`;
    case "dependency-cycle":
      return "It is part of a dependency loop, so no order works. Remove one dependency to continue.";
    case "blocked-dependency":
      return `Waiting on “${context.blocker?.title ?? "another task"}”, which could not be placed.`;
  }
}
