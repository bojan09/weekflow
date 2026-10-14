import type { Member, TeamTask } from "./types";

export interface Window {
  start: number;
  end: number;
}

/** A member's shared working window for a weekday (0 = Sunday), or null on a day off. */
export function windowOf(member: Member, weekday: number): Window | null {
  return member.week[weekday] ?? null;
}

/** The hours every one of these members is working on a weekday. Null when someone is off or nothing overlaps. */
export function commonWindow(members: readonly Member[], weekday: number): Window | null {
  if (members.length === 0) return null;
  let start = 0;
  let end = 1440;
  for (const member of members) {
    const w = windowOf(member, weekday);
    if (!w) return null;
    start = Math.max(start, w.start);
    end = Math.min(end, w.end);
  }
  return end > start ? { start, end } : null;
}

/** One week of the working time a member shares, in minutes. */
export function weeklyCapacityMin(member: Member): number {
  return member.week.reduce((sum, w) => sum + (w ? w.end - w.start : 0), 0);
}

export type LoadStatus = "ok" | "near" | "over";

export interface Workload {
  memberId: string;
  openCount: number;
  assignedMin: number;
  capacityMin: number;
  status: LoadStatus;
}

/** Open assigned work against one week of shared working time. Personal tasks are never counted. */
export function workloadOf(member: Member, tasks: readonly TeamTask[]): Workload {
  const open = tasks.filter((t) => t.assigneeId === member.id && t.status !== "done");
  const assignedMin = open.reduce((sum, t) => sum + t.durationMin, 0);
  const capacityMin = weeklyCapacityMin(member);
  const ratio = capacityMin === 0 ? (assignedMin > 0 ? 2 : 0) : assignedMin / capacityMin;
  return {
    memberId: member.id,
    openCount: open.length,
    assignedMin,
    capacityMin,
    status: ratio > 1 ? "over" : ratio >= 0.8 ? "near" : "ok",
  };
}
