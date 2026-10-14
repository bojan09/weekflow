import { describe, expect, it } from "vitest";
import { buildTask } from "@/domain/task-ops";
import type { Task } from "@/domain/tasks";
import { DEFAULT_PREFS } from "@/prefs/schema";
import { applyPlan, planSchedule } from ".";
import { blockTitle, splitBlocks } from "./blocks";

const planning = DEFAULT_PREFS.planning; // Mon–Fri 09–17, lunch 12–13, 10 min buffer, 6h cap
const engine = DEFAULT_PREFS.engine; // blocks 30–120 minutes
const NOW = { date: "2026-10-14", minutes: 9 * 60 };

const task = (id: string, durationMin: number, extra: Partial<Task> = {}): Task => ({
  ...buildTask({ title: `Task ${id}`, durationMin, priority: "medium" }, id, "2026-10-12T00:00:00.000Z"),
  ...extra,
});

describe("splitBlocks", () => {
  it("keeps a task that already fits", () => {
    expect(splitBlocks(90, 30, 120)).toEqual([90]);
    expect(splitBlocks(120, 30, 120)).toEqual([120]);
  });

  it("splits evenly in multiples of 5 that add up exactly", () => {
    expect(splitBlocks(240, 30, 120)).toEqual([120, 120]);
    expect(splitBlocks(250, 30, 120)).toEqual([85, 85, 80]);
    expect(splitBlocks(125, 30, 120)).toEqual([65, 60]);
    for (const d of [130, 175, 300, 505, 720]) {
      const blocks = splitBlocks(d, 30, 120);
      expect(blocks.reduce((a, b) => a + b, 0)).toBe(d);
      expect(Math.max(...blocks)).toBeLessThanOrEqual(120);
      expect(blocks.every((b) => b % 5 === 0)).toBe(true);
    }
  });

  it("does not split when blocks would be shorter than the minimum", () => {
    expect(splitBlocks(125, 90, 120)).toEqual([125]);
  });

  it("shortens long titles to fit", () => {
    expect(blockTitle("Report", 1, 3)).toBe("Report (2 of 3)");
    expect(blockTitle("x".repeat(120), 0, 2)).toHaveLength(120);
  });
});

describe("planning long tasks", () => {
  it("places the blocks one after another, with a buffer, and explains the split", () => {
    const plan = planSchedule({ tasks: [task("long", 240)], planning, engine, now: NOW, mode: "inbox" });
    const proposal = plan.proposals[0];
    expect(proposal?.blocks).toHaveLength(2);
    const [a, b] = proposal?.blocks ?? [];
    expect(a?.durationMin).toBe(120);
    expect(b?.durationMin).toBe(120);
    expect(a && b && (b.to.date > a.to.date || b.to.startMin >= a.to.startMin + 120 + planning.bufferMin)).toBe(true);
    expect(proposal?.reasons.map((r) => r.code)).toContain("split");
  });

  it("applying splits the task into titled blocks, and dependents wait for all of them", () => {
    const tasks = [task("long", 240), task("after", 30, { dependsOn: ["long"] })];
    const plan = planSchedule({ tasks, planning, engine, now: NOW, mode: "inbox" });
    let n = 0;
    const out = applyPlan(tasks, plan, () => `blk${++n}`);
    expect(out).toHaveLength(3);
    expect(out.find((t) => t.id === "long")).toMatchObject({ title: "Task long (1 of 2)", durationMin: 120 });
    expect(out.find((t) => t.id === "blk1")).toMatchObject({ title: "Task long (2 of 2)", durationMin: 120, locked: false });
    expect(out.find((t) => t.id === "after")?.dependsOn).toEqual(["long", "blk1"]);
    expect(out.every((t) => t.placement !== null)).toBe(true);
  });

  it("is all or nothing: no partial blocks when they cannot all fit before the deadline", () => {
    const plan = planSchedule({ tasks: [task("long", 240, { deadline: "2026-10-14" })], planning, engine, now: { date: "2026-10-14", minutes: 13 * 60 }, mode: "inbox" });
    expect(plan.proposals).toEqual([]);
    expect(plan.unplaced[0]?.code).toBe("no-room-before-deadline");
  });

  it("leaves tasks within the maximum block whole", () => {
    const plan = planSchedule({ tasks: [task("a", 90)], planning, engine, now: NOW, mode: "inbox" });
    expect(plan.proposals[0]?.blocks).toBeUndefined();
  });

  it("is deterministic and idempotent once applied", () => {
    const tasks = [task("long", 300), task("b", 60)];
    const first = planSchedule({ tasks, planning, engine, now: NOW, mode: "inbox" });
    expect(planSchedule({ tasks: [...tasks].reverse(), planning, engine, now: NOW, mode: "inbox" })).toEqual(first);
    let n = 0;
    const applied = applyPlan(tasks, first, () => `blk${++n}`);
    expect(planSchedule({ tasks: applied, planning, engine, now: NOW, mode: "inbox" }).proposals).toEqual([]);
  });
});
