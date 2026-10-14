import { findFreeSlot } from "@/domain/availability";
import { detectConflicts } from "@/domain/conflicts";
import { PRIORITY_RANK, endMin, isTimed, type Placement, type Task } from "@/domain/tasks";
import { diffDays, type ISODate } from "@/lib/dates";
import type { TimeFormat } from "@/lib/time";
import { explainPlacement, explainUnplaced } from "./explain";
import type { Plan, PlanInput, Proposal, Unplaced } from "./types";

const DEFAULT_HORIZON_DAYS = 28;
/** In strict mode a deadline this close (or past) jumps the queue. */
const CRITICAL_WITHIN_DAYS = 2;
/** Below this stability weight the engine re-plans every movable task, not just broken ones. */
const STABILITY_THRESHOLD = 5;

export interface Candidates {
  tasks: Task[];
  /** Why a task that already had a place is being moved, keyed by task id. */
  movedBecause: Map<string, string>;
  /** True when every movable task is being re-planned rather than only broken ones. */
  reoptimizing: boolean;
}

/** Which tasks the engine is allowed to place or move. Locked and done tasks are never candidates. */
export function selectCandidates(input: PlanInput): Candidates {
  const { tasks, planning, engine, now, mode } = input;
  const format: TimeFormat = input.format ?? "24h";
  const open = tasks.filter((t) => t.status === "todo");
  const inbox = open.filter((t) => t.placement === null);
  const none = { movedBecause: new Map<string, string>(), reoptimizing: false };

  if (mode !== "fix" || !engine.allowMoveExisting) return { tasks: inbox, ...none };

  const movable = open.filter((t) => !t.locked && t.placement !== null && t.placement.date >= now.date);
  if (engine.weights.stability < STABILITY_THRESHOLD) {
    return { tasks: [...inbox, ...movable], movedBecause: new Map(), reoptimizing: true };
  }

  const movedBecause = new Map<string, string>();
  for (const conflict of detectConflicts(tasks, planning, now, format)) {
    for (const action of conflict.actions) {
      if (action.type === "move" && !movedBecause.has(action.taskId)) {
        movedBecause.set(action.taskId, conflict.title);
      }
    }
  }
  return {
    tasks: [...inbox, ...movable.filter((t) => movedBecause.has(t.id))],
    movedBecause,
    reoptimizing: false,
  };
}

interface Rank {
  critical: boolean;
  score: number;
}

function rankOf(task: Task, input: PlanInput): Rank {
  const { engine, planning, now } = input;
  const daysLeft = task.deadline === null ? null : diffDays(now.date, task.deadline);
  const urgency = daysLeft === null ? 0 : daysLeft <= 0 ? 1 : 1 / (1 + daysLeft);
  const focusBonus = planning.focusTime.enabled && task.category === "focus" ? 1 : 0;
  return {
    critical: engine.deadlineBehavior === "strict" && daysLeft !== null && daysLeft <= CRITICAL_WITHIN_DAYS,
    score: engine.weights.priority * (PRIORITY_RANK[task.priority] / 2) + engine.weights.deadline * urgency + focusBonus,
  };
}

const text = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** Most important first. Every tie is broken by a stable field, so input order never matters. */
function compareRanked(a: { task: Task; rank: Rank }, b: { task: Task; rank: Rank }): number {
  if (a.rank.critical !== b.rank.critical) return a.rank.critical ? -1 : 1;
  if (a.rank.score !== b.rank.score) return b.rank.score - a.rank.score;
  const da = a.task.deadline ?? "9999-99-99";
  const db = b.task.deadline ?? "9999-99-99";
  return text(da, db) || text(a.task.createdAt, b.task.createdAt) || text(a.task.id, b.task.id);
}

/** Earliest day and minute a task may start, from today, its own start date and its prerequisites. */
function earliestStart(task: Task, working: readonly Task[], input: PlanInput): { date: ISODate; fromMin?: number; after?: Task } {
  const { now, planning } = input;
  let date: ISODate = now.date;
  let fromMin: number | undefined = now.minutes;
  let after: Task | undefined;

  const raise = (nextDate: ISODate, nextMin: number | undefined): void => {
    if (nextDate > date) {
      date = nextDate;
      fromMin = nextMin;
    } else if (nextDate === date && nextMin !== undefined) {
      fromMin = Math.max(fromMin ?? 0, nextMin);
    }
  };

  if (task.earliestStart) raise(task.earliestStart, undefined);
  for (const depId of task.dependsOn) {
    const dep = working.find((t) => t.id === depId);
    if (!dep || dep.status === "done" || !dep.placement) continue;
    const before = `${date}:${fromMin ?? 0}`;
    raise(dep.placement.date, isTimed(dep) ? endMin(dep) + planning.bufferMin : undefined);
    if (`${date}:${fromMin ?? 0}` !== before) after = dep;
  }
  return { date, fromMin, after };
}

/**
 * Deterministic scheduling. The same tasks, rules and clock always give the
 * same plan, whatever order the tasks arrive in. Nothing is changed here: the
 * result is a proposal the user can preview, apply or discard.
 *
 * Method: pick candidates, order them (deadline-critical first, then a weighted
 * priority/deadline score), then give each the earliest free slot that respects
 * working time, breaks, buffers, the daily limit, its deadline and prerequisites.
 */
export function planSchedule(input: PlanInput): Plan {
  const { planning, engine, now } = input;
  const format: TimeFormat = input.format ?? "24h";
  const horizonDays = input.horizonDays ?? DEFAULT_HORIZON_DAYS;

  const selected = selectCandidates(input);
  const candidateIds = new Set(selected.tasks.map((t) => t.id));
  const original = new Map(selected.tasks.map((t) => [t.id, t.placement] as const));

  const working: Task[] = input.tasks.filter((t) => !candidateIds.has(t.id));
  const pending = new Map(selected.tasks.map((t) => [t.id, t] as const));
  const proposals: Proposal[] = [];
  const unplaced: Unplaced[] = [];
  const failed = new Set<string>();
  const total = selected.tasks.length;
  let position = 0;

  const fail = (task: Task, code: Unplaced["code"], blocker?: Task): void => {
    failed.add(task.id);
    unplaced.push({ taskId: task.id, title: task.title, code, message: explainUnplaced(task, code, { blocker, horizonDays, format }) });
  };

  while (pending.size > 0) {
    const ready = [...pending.values()]
      .filter((t) => t.dependsOn.every((d) => !pending.has(d)))
      .map((task) => ({ task, rank: rankOf(task, input) }))
      .sort(compareRanked);
    const next = ready[0];
    if (!next) {
      // Everything left waits on something else that is also waiting: a loop.
      for (const task of [...pending.values()].sort((a, b) => text(a.id, b.id))) fail(task, "dependency-cycle");
      break;
    }
    const { task, rank } = next;
    pending.delete(task.id);
    position += 1;

    const blocker = input.tasks.find((t) => failed.has(t.id) && task.dependsOn.includes(t.id));
    if (blocker) {
      fail(task, "blocked-dependency", blocker);
      continue;
    }

    const start = earliestStart(task, working, input);
    if (task.deadline && task.deadline >= now.date && start.date > task.deadline) {
      fail(task, "impossible-window");
      continue;
    }

    const base = {
      durationMin: task.durationMin,
      fromDate: start.date,
      fromMin: start.fromMin,
      excludeId: task.id,
      horizonDays,
      prefer: planning.preferredTime,
    } as const;
    // A deadline that has already passed cannot constrain the search.
    const bound = task.deadline && task.deadline >= now.date ? task.deadline : null;

    let late = false;
    let slot = findFreeSlot(working, planning, { ...base, notAfter: bound });
    if (!slot && bound && engine.deadlineBehavior === "soft") {
      slot = findFreeSlot(working, planning, { ...base, notAfter: null });
      late = slot !== null;
    }
    if (!slot) {
      fail(task, bound ? "no-room-before-deadline" : "no-room");
      continue;
    }

    working.push({ ...task, placement: { date: slot.date, startMin: slot.startMin } });
    const from = original.get(task.id) ?? null;
    if (from && from.date === slot.date && from.startMin === slot.startMin) continue;

    proposals.push({
      taskId: task.id,
      title: task.title,
      from,
      to: slot,
      late,
      reasons: explainPlacement(task, slot, {
        planning,
        format,
        position,
        total,
        critical: rank.critical,
        late,
        after: start.after,
        from,
        movedBecause: selected.movedBecause.get(task.id),
        reoptimizing: selected.reoptimizing,
        today: now.date,
      }),
    });
  }

  proposals.sort((a, b) => text(a.to.date, b.to.date) || a.to.startMin - b.to.startMin || text(a.taskId, b.taskId));
  unplaced.sort((a, b) => text(a.taskId, b.taskId));
  return {
    proposals,
    unplaced,
    summary: {
      considered: total,
      placed: proposals.length,
      moved: proposals.filter((p) => p.from !== null).length,
      unplaced: unplaced.length,
    },
  };
}

/** Write a plan into the task list. Locked and finished tasks are never touched. */
export function applyPlan(tasks: readonly Task[], plan: Plan): Task[] {
  const targets = new Map(plan.proposals.map((p) => [p.taskId, p.to] as const));
  if (targets.size === 0) return tasks as Task[];
  let changed = false;
  const next = tasks.map((task) => {
    const to = targets.get(task.id);
    if (!to || task.locked || task.status === "done") return task;
    const same = task.placement?.date === to.date && task.placement.startMin === to.startMin;
    if (same) return task;
    changed = true;
    const placement: Placement = { date: to.date, startMin: to.startMin };
    return { ...task, placement };
  });
  return changed ? next : (tasks as Task[]);
}
