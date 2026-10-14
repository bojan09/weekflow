import { describe, expect, it } from "vitest";
import { availableMinutes, findFreeSlot, offHours, scheduledMinutes, workWindows } from "./availability";
import { detectConflicts } from "./conflicts";
import { activeRules } from "./rules";
import { buildScenario, SCENARIOS } from "./scenarios";
import { formatDuration, weekStats } from "./stats";
import { buildTask } from "./task-ops";
import { tasksSchema, type Task } from "./tasks";
import { DEFAULT_PREFS, sanitizePrefs } from "@/prefs/schema";
import { weekDates } from "@/lib/dates";

const planning = DEFAULT_PREFS.planning; // Mon–Fri 09:00–17:00, lunch 12–13, 10 min buffer, 6h cap
const MONDAY = "2026-10-12";
const TODAY = "2026-10-14"; // Wednesday
const NOW = { date: TODAY, minutes: 9 * 60 };

const task = (id: string, extra: Partial<Task> = {}): Task => ({
  ...buildTask({ title: `Task ${id}`, durationMin: 60, priority: "medium" }, id, `2026-10-12T00:00:${id.length}0.000Z`),
  ...extra,
});
const at = (date: string, startMin: number | null) => ({ date, startMin });

describe("availability", () => {
  it("splits working hours around breaks", () => {
    expect(workWindows(planning, MONDAY)).toEqual([
      { start: 540, end: 720 },
      { start: 780, end: 1020 },
    ]);
    expect(availableMinutes(planning, MONDAY)).toBe(420);
  });

  it("has no working time on days off", () => {
    expect(workWindows(planning, "2026-10-17")).toEqual([]);
  });

  it("shades everything outside working time, including breaks and days off", () => {
    expect(offHours(planning, MONDAY)).toEqual([
      { start: 0, end: 540 },
      { start: 720, end: 780 },
      { start: 1020, end: 1440 },
    ]);
    expect(offHours(planning, "2026-10-17")).toEqual([{ start: 0, end: 1440 }]);
  });

  it("counts open scheduled minutes, including day-only tasks", () => {
    const tasks = [
      task("a", { placement: at(MONDAY, 540) }),
      task("b", { placement: at(MONDAY, null), durationMin: 30 }),
      task("c", { placement: at(MONDAY, 600), status: "done" }),
    ];
    expect(scheduledMinutes(tasks, MONDAY)).toBe(90);
  });
});

describe("findFreeSlot", () => {
  it("starts at the beginning of the working day when empty", () => {
    expect(findFreeSlot([], planning, { durationMin: 60, fromDate: MONDAY })).toEqual({ date: MONDAY, startMin: 540 });
  });

  it("leaves the configured buffer after an existing task", () => {
    const tasks = [task("a", { placement: at(MONDAY, 540) })];
    // 09:00-10:00 + 10 min buffer -> 10:10 -> next 15-minute slot 10:15.
    expect(findFreeSlot(tasks, planning, { durationMin: 30, fromDate: MONDAY })).toEqual({ date: MONDAY, startMin: 615 });
  });

  it("does not place work across a break", () => {
    // 150 minutes cannot fit before lunch (09:00-12:00 leaves 180, but a task at 09:00 blocks).
    const tasks = [task("a", { placement: at(MONDAY, 540), durationMin: 60 })];
    const slot = findFreeSlot(tasks, planning, { durationMin: 150, fromDate: MONDAY });
    expect(slot).toEqual({ date: MONDAY, startMin: 780 });
  });

  it("skips days off and honours 'from' time today", () => {
    expect(findFreeSlot([], planning, { durationMin: 60, fromDate: "2026-10-17" })).toEqual({
      date: "2026-10-19",
      startMin: 540,
    });
    expect(findFreeSlot([], planning, { durationMin: 60, fromDate: MONDAY, fromMin: 14 * 60 + 5 })).toEqual({
      date: MONDAY,
      startMin: 14 * 60 + 15,
    });
  });

  it("returns null when nothing fits before a deadline", () => {
    expect(findFreeSlot([], planning, { durationMin: 600, fromDate: MONDAY, notAfter: "2026-10-13" })).toBeNull();
  });

  it("moves to another day once the daily cap is reached", () => {
    const tasks = [
      task("a", { placement: at(MONDAY, 540), durationMin: 180 }),
      task("b", { placement: at(MONDAY, 780), durationMin: 180 }),
    ];
    expect(findFreeSlot(tasks, planning, { durationMin: 60, fromDate: MONDAY })?.date).toBe("2026-10-13");
  });

  it("ignores the task being moved", () => {
    const tasks = [task("a", { placement: at(MONDAY, 540) })];
    expect(findFreeSlot(tasks, planning, { durationMin: 60, fromDate: MONDAY, excludeId: "a" })?.startMin).toBe(540);
  });

  it("is deterministic", () => {
    const tasks = buildScenario("standard", MONDAY, TODAY);
    const q = { durationMin: 45, fromDate: TODAY, fromMin: 600 };
    expect(findFreeSlot(tasks, planning, q)).toEqual(findFreeSlot([...tasks].reverse(), planning, q));
  });
});

describe("conflict detection", () => {
  it("finds overlaps and offers a move for the less important unlocked task", () => {
    const tasks = [
      task("a", { priority: "high", placement: at(TODAY, 600) }),
      task("b", { priority: "low", placement: at(TODAY, 630) }),
    ];
    const conflicts = detectConflicts(tasks, planning, NOW);
    const overlap = conflicts.find((c) => c.kind === "overlap");
    expect(overlap?.severity).toBe("high");
    expect(overlap?.actions[0]).toMatchObject({ type: "move", taskId: "b" });
  });

  it("offers unlock when the task to move is locked", () => {
    const tasks = [
      task("a", { locked: true, placement: at(TODAY, 600) }),
      task("b", { locked: true, placement: at(TODAY, 630) }),
    ];
    const overlap = detectConflicts(tasks, planning, NOW).find((c) => c.kind === "overlap");
    expect(overlap?.actions.every((a) => a.type === "unlock")).toBe(true);
  });

  it("does not treat back-to-back tasks as overlapping", () => {
    const tasks = [task("a", { placement: at(TODAY, 540) }), task("b", { placement: at(TODAY, 600) })];
    expect(detectConflicts(tasks, planning, NOW).some((c) => c.kind === "overlap")).toBe(false);
  });

  it("ignores completed tasks", () => {
    const tasks = [
      task("a", { placement: at(TODAY, 600) }),
      task("b", { status: "done", completedOn: TODAY, placement: at(TODAY, 600) }),
    ];
    expect(detectConflicts(tasks, planning, NOW)).toEqual([]);
  });

  it("flags an overloaded day", () => {
    const tasks = [
      task("a", { placement: at(TODAY, 540), durationMin: 180 }),
      task("b", { placement: at(TODAY, 780), durationMin: 240 }),
    ];
    expect(detectConflicts(tasks, planning, NOW).some((c) => c.kind === "overload")).toBe(true);
  });

  it("flags overdue, after-deadline and due-soon tasks", () => {
    const tasks = [
      task("a", { deadline: "2026-10-13" }),
      task("b", { deadline: "2026-10-14", placement: at("2026-10-15", 540) }),
      task("c", { deadline: "2026-10-16" }),
    ];
    const kinds = detectConflicts(tasks, planning, NOW).map((c) => c.kind);
    expect(kinds).toContain("overdue");
    expect(kinds).toContain("after-deadline");
    expect(kinds).toContain("deadline-risk");
  });

  it("flags a task scheduled before its prerequisite finishes", () => {
    const tasks = [
      task("a", { placement: at(TODAY, 600) }),
      task("b", { dependsOn: ["a"], placement: at(TODAY, 540) }),
    ];
    expect(detectConflicts(tasks, planning, NOW).some((c) => c.kind === "dependency")).toBe(true);
    const ok = [task("a", { placement: at(TODAY, 540) }), task("b", { dependsOn: ["a"], placement: at(TODAY, 600) })];
    expect(detectConflicts(ok, planning, NOW).some((c) => c.kind === "dependency")).toBe(false);
  });

  it("flags work outside working time", () => {
    const tasks = [task("a", { placement: at(TODAY, 19 * 60) }), task("b", { placement: at("2026-10-17", 600) })];
    const outside = detectConflicts(tasks, planning, NOW).filter((c) => c.kind === "outside-hours");
    expect(outside).toHaveLength(2);
  });

  it("flags a task scheduled before its earliest start", () => {
    const tasks = [task("a", { earliestStart: "2026-10-16", placement: at(TODAY, 540) })];
    expect(detectConflicts(tasks, planning, NOW).some((c) => c.kind === "before-start")).toBe(true);
  });

  it("sorts high severity first and is independent of input order", () => {
    const tasks = buildScenario("conflicts", MONDAY, TODAY);
    const a = detectConflicts(tasks, planning, NOW);
    const b = detectConflicts([...tasks].reverse(), planning, NOW);
    expect(a).toEqual(b);
    const order = ["high", "medium", "low"];
    const ranks = a.map((c) => order.indexOf(c.severity));
    expect([...ranks].sort((x, y) => x - y)).toEqual(ranks);
  });

  it("always offers at least one action", () => {
    const tasks = buildScenario("conflicts", MONDAY, TODAY);
    for (const conflict of detectConflicts(tasks, planning, NOW)) {
      expect(conflict.actions.length, conflict.id).toBeGreaterThan(0);
    }
  });

  it("never suggests a slot in the past or past a deadline", () => {
    const tasks = [task("a", { deadline: "2026-10-14" }), task("z", { placement: at(TODAY, 540), durationMin: 480 })];
    const overdue = detectConflicts(tasks, planning, { date: TODAY, minutes: 10 * 60 });
    for (const conflict of overdue) {
      for (const action of conflict.actions) {
        if (action.type === "move") {
          expect(action.placement.date >= TODAY).toBe(true);
          if (action.taskId === "a") expect(action.placement.date <= "2026-10-14").toBe(true);
        }
      }
    }
  });
});

describe("week stats", () => {
  const week = weekDates(TODAY, "monday");

  it("counts tasks, completions, overdue and free time", () => {
    const tasks = [
      task("a", { placement: at(MONDAY, 540), status: "done", completedOn: MONDAY }),
      task("b", { placement: at(TODAY, 540), durationMin: 120 }),
      task("c", { deadline: "2026-10-10" }),
      task("d", { placement: at("2026-10-27", 540) }),
    ];
    const stats = weekStats(tasks, planning, week, TODAY);
    expect(stats.total).toBe(2);
    expect(stats.completed).toBe(1);
    expect(stats.overdue).toBe(1);
    // Wed (420-120) + Thu (420) + Fri (420) = 1140 free minutes from today.
    expect(stats.freeMin).toBe(1140);
  });

  it("formats durations", () => {
    expect(formatDuration(750)).toBe("12h 30m");
    expect(formatDuration(45)).toBe("45m");
    expect(formatDuration(120)).toBe("2h");
    expect(formatDuration(-5)).toBe("0m");
  });
});

describe("active rules", () => {
  it("reflects the saved settings", () => {
    const labels = activeRules(DEFAULT_PREFS).map((r) => r.label);
    expect(labels).toContain("Prioritize high priority");
    expect(labels).toContain("Respect deadlines");
    expect(labels).toContain("Work 09:00–17:00");
    expect(labels).toContain("Max 6h a day");
    expect(labels).toContain("Keep focus time");
    expect(labels).toContain("10 min buffers");
  });

  it("drops rules that are turned off and swaps wording", () => {
    const prefs = sanitizePrefs({
      engine: { deadlineBehavior: "soft", weights: { priority: 1, deadline: 8, stability: 5 }, allowMoveExisting: false },
      planning: { focusTime: { enabled: false, minutes: 90 }, bufferMin: 0 },
    });
    const labels = activeRules(prefs).map((r) => r.label);
    expect(labels).not.toContain("Prioritize high priority");
    expect(labels).not.toContain("Keep focus time");
    expect(labels).not.toContain("0 min buffers");
    expect(labels).toContain("Flexible deadlines");
    expect(labels).toContain("Keep placements fixed");
  });
});

describe("scenarios", () => {
  it("produces schema-valid tasks for every scenario", () => {
    for (const { id } of SCENARIOS) {
      const tasks = buildScenario(id, MONDAY, TODAY);
      expect(tasksSchema.safeParse(tasks).success, id).toBe(true);
      expect(new Set(tasks.map((t) => t.id)).size).toBe(tasks.length);
    }
  });

  it("is deterministic", () => {
    expect(buildScenario("standard", MONDAY, TODAY)).toEqual(buildScenario("standard", MONDAY, TODAY));
  });

  it("completes past tasks but keeps the missed one open", () => {
    const tasks = buildScenario("standard", MONDAY, TODAY);
    const mondayTasks = tasks.filter((t) => t.placement?.date === MONDAY);
    expect(mondayTasks.every((t) => t.status === "done")).toBe(true);
    expect(tasks.find((t) => t.title === "Send the invoice")?.status).toBe("todo");
  });

  it("the normal week has no overlaps, overloads or broken dependencies", () => {
    const kinds = detectConflicts(buildScenario("standard", MONDAY, TODAY), planning, NOW).map((c) => c.kind);
    expect(kinds).not.toContain("overlap");
    expect(kinds).not.toContain("overload");
    expect(kinds).not.toContain("dependency");
  });

  it("the overloaded week is overloaded", () => {
    const kinds = detectConflicts(buildScenario("overloaded", MONDAY, TODAY), planning, NOW).map((c) => c.kind);
    expect(kinds).toContain("overload");
  });

  it("the conflicts week shows several kinds of problem with suggested fixes", () => {
    const conflicts = detectConflicts(buildScenario("conflicts", MONDAY, TODAY), planning, NOW);
    const kinds = new Set(conflicts.map((c) => c.kind));
    for (const kind of ["overlap", "dependency", "after-deadline", "outside-hours", "overdue"] as const) {
      expect(kinds.has(kind), kind).toBe(true);
    }
    expect(conflicts.some((c) => c.actions.some((a) => a.type === "move"))).toBe(true);
  });

  it("the empty scenario is empty", () => {
    expect(buildScenario("empty", MONDAY, TODAY)).toEqual([]);
  });
});
