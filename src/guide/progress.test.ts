import { describe, expect, it } from "vitest";
import { buildTask } from "@/domain/task-ops";
import type { Task } from "@/domain/tasks";
import { STEPS, stepsFromPath, stepsFromTaskChange } from "./progress";

const task = (id: string, extra: Partial<Task> = {}): Task => ({
  ...buildTask({ title: `Task ${id}`, durationMin: 30, priority: "medium" }, id, "2026-10-12T00:00:00.000Z"),
  ...extra,
});
const placed = { date: "2026-10-14", startMin: 600 };

describe("stepsFromTaskChange", () => {
  const base = [task("a"), task("b")];

  it("ticks add-task for exactly one new task with all old ones kept", () => {
    expect(stepsFromTaskChange(base, [...base, task("c")])).toEqual(["add-task"]);
  });

  it("ticks schedule-task when an existing task gains a place", () => {
    const next = [{ ...base[0]!, placement: placed }, base[1]!];
    expect(stepsFromTaskChange(base, next)).toEqual(["schedule-task"]);
  });

  it("ticks lock-task when an existing task becomes locked", () => {
    const prev = [task("a", { placement: placed }), base[1]!];
    const next = [{ ...prev[0]!, locked: true }, prev[1]!];
    expect(stepsFromTaskChange(prev, next)).toEqual(["lock-task"]);
  });

  it("ticks nothing when tasks are replaced wholesale (a scenario load)", () => {
    const scenario = [task("x", { placement: placed }), task("y", { placement: placed, locked: true }), task("z")];
    expect(stepsFromTaskChange(base, scenario)).toEqual([]);
  });

  it("ticks nothing for several new tasks at once, or for no change", () => {
    expect(stepsFromTaskChange(base, [...base, task("c"), task("d")])).toEqual([]);
    expect(stepsFromTaskChange(base, base)).toEqual([]);
  });

  it("does not tick when a placement is removed or a lock is released", () => {
    const prev = [task("a", { placement: placed, locked: true })];
    expect(stepsFromTaskChange(prev, [{ ...prev[0]!, locked: false }])).toEqual([]);
    expect(stepsFromTaskChange(prev, [{ ...prev[0]!, locked: false, placement: null }])).toEqual([]);
  });
});

describe("stepsFromPath", () => {
  it("ticks check-rules on Settings, Planning only", () => {
    expect(stepsFromPath("/demo/settings/planning")).toEqual(["check-rules"]);
    expect(stepsFromPath("/demo/settings/engine")).toEqual([]);
    expect(stepsFromPath("/demo/settings")).toEqual([]);
  });
  it("ticks open-review on the Review page", () => {
    expect(stepsFromPath("/demo/review")).toEqual(["open-review"]);
  });
  it("ticks nothing elsewhere", () => {
    expect(stepsFromPath("/demo/home")).toEqual([]);
  });
});

describe("STEPS", () => {
  it("lists the six steps with unique ids", () => {
    expect(STEPS).toHaveLength(6);
    expect(new Set(STEPS.map((s) => s.id)).size).toBe(6);
  });
});
