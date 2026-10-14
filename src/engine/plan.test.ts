import { describe, expect, it } from "vitest";
import { detectConflicts } from "@/domain/conflicts";
import { buildScenario, SCENARIOS } from "@/domain/scenarios";
import { buildTask } from "@/domain/task-ops";
import type { Task } from "@/domain/tasks";
import { DEFAULT_PREFS } from "@/prefs/schema";
import { applyPlan, planSchedule, type PlanInput } from ".";

const planning = DEFAULT_PREFS.planning; // Mon–Fri 09–17, lunch 12–13, 10 min buffer, 6h cap
const engine = DEFAULT_PREFS.engine;
const MONDAY = "2026-10-12";
const TODAY = "2026-10-14"; // Wednesday
const NOW = { date: TODAY, minutes: 9 * 60 };

let seq = 0;
const task = (id: string, extra: Partial<Task> = {}): Task => ({
  ...buildTask(
    { title: `Task ${id}`, durationMin: 60, priority: "medium" },
    id,
    `2026-10-12T00:00:${String(++seq % 60).padStart(2, "0")}.000Z`,
  ),
  ...extra,
});
const at = (date: string, startMin: number | null) => ({ date, startMin });

const run = (tasks: Task[], extra: Partial<PlanInput> = {}) =>
  planSchedule({ tasks, planning, engine, now: NOW, mode: "inbox", ...extra });

const slotOf = (plan: ReturnType<typeof run>, id: string) => plan.proposals.find((p) => p.taskId === id)?.to;

describe("planSchedule: basics", () => {
  it("places an inbox task in the first free slot", () => {
    const plan = run([task("a")]);
    expect(slotOf(plan, "a")).toEqual({ date: TODAY, startMin: 9 * 60 });
    expect(plan.summary).toEqual({ considered: 1, placed: 1, moved: 0, unplaced: 0 });
  });

  it("never starts before now", () => {
    const plan = run([task("a")], { now: { date: TODAY, minutes: 10 * 60 + 5 } });
    expect(slotOf(plan, "a")).toEqual({ date: TODAY, startMin: 10 * 60 + 15 });
  });

  it("does nothing for an empty inbox", () => {
    const placed = task("a", { placement: at(TODAY, 600) });
    const plan = run([placed]);
    expect(plan.proposals).toEqual([]);
    expect(applyPlan([placed], plan)).toEqual([placed]);
  });

  it("leaves a plan alone once it is applied (idempotent)", () => {
    const tasks = [task("a"), task("b", { priority: "high" }), task("c", { durationMin: 90 })];
    const once = applyPlan(tasks, run(tasks));
    expect(run(once).proposals).toEqual([]);
  });
});

describe("planSchedule: ordering", () => {
  it("plans higher priority first", () => {
    const plan = run([task("low", { priority: "low" }), task("high", { priority: "high" })]);
    expect(slotOf(plan, "high")?.startMin).toBeLessThan(slotOf(plan, "low")?.startMin ?? 0);
  });

  it("puts a deadline-critical task ahead of a higher priority one in strict mode", () => {
    const urgent = task("urgent", { priority: "low", deadline: TODAY });
    const big = task("big", { priority: "high" });
    const plan = run([big, urgent]);
    expect(slotOf(plan, "urgent")).toEqual({ date: TODAY, startMin: 9 * 60 });
  });

  it("gives identical results whatever order the tasks arrive in", () => {
    const tasks = ["a", "b", "c", "d", "e"].map((id, i) =>
      task(id, { priority: (["low", "medium", "high"] as const)[i % 3], deadline: i % 2 ? "2026-10-20" : null }),
    );
    const forward = run(tasks);
    expect(run([...tasks].reverse())).toEqual(forward);
    expect(run([tasks[3]!, tasks[0]!, tasks[4]!, tasks[1]!, tasks[2]!])).toEqual(forward);
  });

  it("breaks exact ties by creation time, then id", () => {
    const first = task("x", { createdAt: "2026-10-01T00:00:00.000Z" });
    const second = task("y", { createdAt: "2026-10-02T00:00:00.000Z" });
    const plan = run([second, first]);
    expect(slotOf(plan, "x")?.startMin).toBeLessThan(slotOf(plan, "y")?.startMin ?? 0);
  });
});

describe("planSchedule: rules", () => {
  it("works around locked tasks and buffers, and skips weekends", () => {
    const locked = task("lock", { placement: at(TODAY, 9 * 60), locked: true });
    const plan = run([locked, task("a")]);
    // 09:00–10:00 locked + 10 min buffer, so 10:15 is the first fit.
    expect(slotOf(plan, "a")).toEqual({ date: TODAY, startMin: 10 * 60 + 15 });
    const friday = run([task("w", { durationMin: 120 })], { now: { date: "2026-10-16", minutes: 16 * 60 } });
    expect(slotOf(friday, "w")?.date).toBe("2026-10-19"); // Monday, skipping the weekend
  });

  it("respects the daily workload limit", () => {
    const capped = { ...planning, maxDailyHours: 2 };
    const tasks = Array.from({ length: 3 }, (_, i) => task(`t${i}`, { durationMin: 60 }));
    const plan = planSchedule({ tasks, planning: capped, engine, now: NOW, mode: "inbox" });
    const days = plan.proposals.map((p) => p.to.date);
    expect(days.filter((d) => d === TODAY)).toHaveLength(2); // the third rolls over
    expect(days).toContain("2026-10-15");
  });

  it("keeps a strict deadline, or reports why it cannot", () => {
    const fits = run([task("a", { deadline: "2026-10-15" })]);
    expect((slotOf(fits, "a")?.date ?? "9") <= "2026-10-15").toBe(true);

    const full = run([
      task("a", { durationMin: 240, deadline: TODAY, priority: "high" }),
      task("b", { durationMin: 120, deadline: TODAY }),
      task("c", { durationMin: 60, deadline: TODAY, priority: "low" }),
    ]);
    const missed = full.unplaced.find((u) => u.code === "no-room-before-deadline");
    expect(missed).toBeDefined();
    expect(missed?.message).toMatch(/deadline/);
  });

  it("lets a soft deadline slip, and says so", () => {
    const tasks = [
      task("a", { durationMin: 240, deadline: TODAY, priority: "high" }),
      task("b", { durationMin: 120, deadline: TODAY }),
      task("c", { durationMin: 60, deadline: TODAY, priority: "low" }),
    ];
    const plan = run(tasks, { engine: { ...engine, deadlineBehavior: "soft" } });
    const late = plan.proposals.find((p) => p.late);
    expect(late?.taskId).toBe("c");
    expect(late?.reasons.some((r) => r.code === "deadline" && /flexible/.test(r.text))).toBe(true);
  });

  it("places an overdue task at the first free time", () => {
    const plan = run([task("old", { deadline: "2026-10-10" })]);
    expect(slotOf(plan, "old")).toEqual({ date: TODAY, startMin: 9 * 60 });
  });

  it("honours earliest start", () => {
    const plan = run([task("a", { earliestStart: "2026-10-16" })]);
    expect(slotOf(plan, "a")?.date).toBe("2026-10-16");
    expect(plan.proposals[0]?.reasons.map((r) => r.code)).toContain("earliest-start");
  });

  it("reports an impossible window", () => {
    const plan = run([task("a", { earliestStart: "2026-10-20", deadline: "2026-10-16" })]);
    expect(plan.unplaced[0]?.code).toBe("impossible-window");
  });

  it("prefers the chosen time of day when it can", () => {
    const afternoon = { ...planning, preferredTime: "afternoon" as const };
    const plan = planSchedule({ tasks: [task("a")], planning: afternoon, engine, now: NOW, mode: "inbox" });
    expect(slotOf(plan, "a")?.startMin).toBe(13 * 60);
    expect(plan.proposals[0]?.reasons.some((r) => r.code === "preference" && /Matches/.test(r.text))).toBe(true);
  });
});

describe("planSchedule: dependencies", () => {
  it("places a task after its prerequisite", () => {
    const first = task("first", { priority: "low" });
    const second = task("second", { priority: "high", dependsOn: ["first"] });
    const plan = run([second, first]);
    const a = slotOf(plan, "first");
    const b = slotOf(plan, "second");
    expect(a !== undefined && b !== undefined && b.startMin >= a.startMin + 60).toBe(true);
    expect(plan.proposals.find((p) => p.taskId === "second")?.reasons.map((r) => r.code)).toContain("dependency");
  });

  it("waits for a prerequisite that is already scheduled", () => {
    const dep = task("dep", { placement: at("2026-10-15", 14 * 60), locked: true });
    const plan = run([dep, task("after", { dependsOn: ["dep"] })]);
    const slot = slotOf(plan, "after");
    expect(slot?.date).toBe("2026-10-15");
    expect(slot?.startMin).toBeGreaterThanOrEqual(15 * 60 + 10);
  });

  it("reports a dependency loop instead of guessing", () => {
    const plan = run([task("a", { dependsOn: ["b"] }), task("b", { dependsOn: ["a"] }), task("c")]);
    expect(plan.proposals.map((p) => p.taskId)).toEqual(["c"]);
    expect(plan.unplaced.map((u) => u.code)).toEqual(["dependency-cycle", "dependency-cycle"]);
  });

  it("flags a task whose prerequisite could not be placed", () => {
    const dep = task("dep", { deadline: TODAY, durationMin: 420 });
    const plan = run([dep, task("next", { dependsOn: ["dep"] })]);
    expect(plan.unplaced.map((u) => u.code).sort()).toEqual(["blocked-dependency", "no-room-before-deadline"]);
  });
});

describe("planSchedule: moving existing tasks", () => {
  const overlap = (): Task[] => [
    task("keep", { priority: "high", placement: at(TODAY, 10 * 60) }),
    task("clash", { priority: "low", placement: at(TODAY, 10 * 60 + 30) }),
    task("fine", { placement: at(TODAY, 14 * 60) }),
  ];

  it("inbox mode never moves anything", () => {
    expect(run(overlap()).proposals).toEqual([]);
  });

  it("fix mode moves only the task that breaks a rule, and says why", () => {
    const plan = run(overlap(), { mode: "fix" });
    expect(plan.proposals.map((p) => p.taskId)).toEqual(["clash"]);
    expect(plan.proposals[0]?.from).toEqual(at(TODAY, 10 * 60 + 30));
    expect(plan.proposals[0]?.reasons[0]).toMatchObject({ code: "moved" });
    expect(plan.summary.moved).toBe(1);
  });

  it("fix mode leaves everything alone when moving is turned off", () => {
    const plan = run(overlap(), { mode: "fix", engine: { ...engine, allowMoveExisting: false } });
    expect(plan.proposals).toEqual([]);
  });

  it("never moves locked tasks", () => {
    const tasks = overlap().map((t) => (t.id === "clash" ? { ...t, locked: true } : t));
    const plan = run(tasks, { mode: "fix" });
    expect(plan.proposals.every((p) => p.taskId !== "clash")).toBe(true);
    expect(applyPlan(tasks, plan).find((t) => t.id === "clash")?.placement).toEqual(at(TODAY, 10 * 60 + 30));
  });

  it("low stability re-plans every movable task", () => {
    const tasks = [task("a", { placement: at("2026-10-15", 15 * 60) }), task("b", { placement: at("2026-10-16", 15 * 60) })];
    const loose = { ...engine, weights: { ...engine.weights, stability: 0 } };
    const plan = run(tasks, { mode: "fix", engine: loose });
    expect(plan.proposals.map((p) => p.to.date)).toEqual([TODAY, TODAY]);
    expect(run(tasks, { mode: "fix" }).proposals).toEqual([]); // default stability keeps valid places
  });

  it("does not touch done tasks", () => {
    const done = task("d", { status: "done", placement: at(TODAY, 600) });
    expect(applyPlan([done], run([done], { mode: "fix" }))[0]).toBe(done);
  });
});

describe("planSchedule: invariants over every demo scenario", () => {
  for (const scenario of SCENARIOS) {
    it(`${scenario.label}: obeys the rules and is reproducible`, () => {
      const tasks = buildScenario(scenario.id, MONDAY, TODAY);
      for (const mode of ["inbox", "fix"] as const) {
        const plan = run(tasks, { mode });
        expect(run([...tasks].reverse(), { mode })).toEqual(plan);

        const after = applyPlan(tasks, plan);
        const before = detectConflicts(tasks, planning, NOW);
        const remaining = detectConflicts(after, planning, NOW);
        const touched = new Set(plan.proposals.map((p) => p.taskId));

        // A task the engine placed must not cause a conflict that was not already there.
        for (const conflict of remaining) {
          if (conflict.taskIds.some((id) => touched.has(id))) {
            expect(before.some((b) => b.id === conflict.id), `${scenario.id}/${mode}: new ${conflict.id}`).toBe(true);
          }
        }
        // Locked tasks stay exactly where they were.
        for (const t of tasks.filter((x) => x.locked)) {
          expect(after.find((x) => x.id === t.id)?.placement).toEqual(t.placement);
        }
      }
    });
  }
});
