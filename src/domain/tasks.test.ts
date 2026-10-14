import { describe, expect, it } from "vitest";
import { parseQuickAdd } from "./quick-add";
import {
  addTask,
  buildTask,
  deleteTask,
  moveTask,
  resizeTask,
  setDone,
  setLocked,
  unscheduleTask,
  updateTask,
  wouldCreateCycle,
} from "./task-ops";
import { taskSchema, type Task } from "./tasks";

const make = (id: string, extra: Partial<Task> = {}): Task => ({
  ...buildTask({ title: `Task ${id}`, durationMin: 60, priority: "medium" }, id, `2026-10-12T00:00:0${id.length}.000Z`),
  ...extra,
});

describe("task schema", () => {
  it("accepts a built task", () => {
    expect(taskSchema.safeParse(make("a")).success).toBe(true);
  });

  it("rejects a locked task without a placement", () => {
    expect(taskSchema.safeParse(make("a", { locked: true })).success).toBe(false);
  });

  it("rejects a task that would run past midnight", () => {
    const bad = make("a", { placement: { date: "2026-10-12", startMin: 1400 }, durationMin: 60 });
    expect(taskSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects an empty title and an invalid date", () => {
    expect(taskSchema.safeParse(make("a", { title: "  " })).success).toBe(false);
    expect(taskSchema.safeParse(make("a", { deadline: "2026-02-30" })).success).toBe(false);
  });
});

describe("task operations", () => {
  const placed = (id: string, extra: Partial<Task> = {}): Task =>
    make(id, { placement: { date: "2026-10-12", startMin: 540 }, ...extra });

  it("clamps duration to 5-minute steps within limits", () => {
    expect(buildTask({ title: "x", durationMin: 2, priority: "low" }, "i", "t").durationMin).toBe(5);
    expect(buildTask({ title: "x", durationMin: 1000, priority: "low" }, "i", "t").durationMin).toBe(720);
    expect(buildTask({ title: "x", durationMin: 47, priority: "low" }, "i", "t").durationMin).toBe(45);
  });

  it("moves a task and keeps it inside the day", () => {
    const tasks = [placed("a")];
    const moved = moveTask(tasks, "a", { date: "2026-10-13", startMin: 1430 });
    expect(moved[0]?.placement).toEqual({ date: "2026-10-13", startMin: 1380 });
  });

  it("does not move or resize a locked task", () => {
    const tasks = [placed("a", { locked: true })];
    expect(moveTask(tasks, "a", { date: "2026-10-13", startMin: 600 })).toBe(tasks);
    expect(resizeTask(tasks, "a", 120)).toBe(tasks);
    expect(unscheduleTask(tasks, "a")).toBe(tasks);
  });

  it("returns the same array when nothing changes", () => {
    const tasks = [placed("a")];
    expect(moveTask(tasks, "a", { date: "2026-10-12", startMin: 540 })).toBe(tasks);
    expect(resizeTask(tasks, "a", 60)).toBe(tasks);
    expect(setLocked(tasks, "a", false)).toBe(tasks);
    expect(moveTask(tasks, "missing", { date: "2026-10-12", startMin: 0 })).toBe(tasks);
  });

  it("resizes within the day", () => {
    const tasks = [placed("a", { placement: { date: "2026-10-12", startMin: 1380 } })];
    expect(resizeTask(tasks, "a", 240)[0]?.durationMin).toBe(60);
    expect(resizeTask([placed("a")], "a", 90)[0]?.durationMin).toBe(90);
  });

  it("only locks a placed task", () => {
    expect(setLocked([make("a")], "a", true)[0]?.locked).toBe(false);
    expect(setLocked([placed("a")], "a", true)[0]?.locked).toBe(true);
  });

  it("completes and reopens with the completion date", () => {
    const done = setDone([make("a")], "a", true, "2026-10-14");
    expect(done[0]).toMatchObject({ status: "done", completedOn: "2026-10-14" });
    expect(setDone(done, "a", false, "2026-10-15")[0]).toMatchObject({ status: "todo", completedOn: null });
  });

  it("unschedules an unlocked task", () => {
    expect(unscheduleTask([placed("a")], "a")[0]?.placement).toBeNull();
  });

  it("deleting a task removes dependencies on it", () => {
    const tasks = [make("a"), make("b", { dependsOn: ["a"] })];
    const next = deleteTask(tasks, "a");
    expect(next).toHaveLength(1);
    expect(next[0]?.dependsOn).toEqual([]);
  });

  it("adds and updates tasks immutably", () => {
    const tasks = [make("a")];
    const added = addTask(tasks, make("b"));
    expect(tasks).toHaveLength(1);
    expect(added).toHaveLength(2);
    expect(updateTask(added, "b", { title: "Renamed" })[1]?.title).toBe("Renamed");
  });

  it("detects dependency cycles", () => {
    const tasks = [make("a", { dependsOn: ["b"] }), make("b"), make("c", { dependsOn: ["a"] })];
    expect(wouldCreateCycle(tasks, "b", ["c"])).toBe(true);
    expect(wouldCreateCycle(tasks, "b", [])).toBe(false);
    expect(wouldCreateCycle(tasks, "a", ["a"])).toBe(true);
  });
});

describe("quick add parser", () => {
  const today = "2026-10-14"; // Wednesday

  it("keeps a plain title untouched", () => {
    expect(parseQuickAdd("Write report", today)).toEqual({
      title: "Write report",
      durationMin: null,
      priority: null,
      deadline: null,
    });
  });

  it("parses duration forms", () => {
    expect(parseQuickAdd("a 45m", today).durationMin).toBe(45);
    expect(parseQuickAdd("a 2h", today).durationMin).toBe(120);
    expect(parseQuickAdd("a 1h30", today).durationMin).toBe(90);
    expect(parseQuickAdd("a 1.5h", today).durationMin).toBe(90);
  });

  it("parses priority", () => {
    expect(parseQuickAdd("a !high", today).priority).toBe("high");
    expect(parseQuickAdd("a !h", today).priority).toBe("high");
    expect(parseQuickAdd("a !low", today).priority).toBe("low");
    expect(parseQuickAdd("a !med", today).priority).toBe("medium");
  });

  it("parses deadlines", () => {
    expect(parseQuickAdd("a due today", today).deadline).toBe("2026-10-14");
    expect(parseQuickAdd("a due tomorrow", today).deadline).toBe("2026-10-15");
    expect(parseQuickAdd("a due fri", today).deadline).toBe("2026-10-16");
    expect(parseQuickAdd("a due wed", today).deadline).toBe("2026-10-21");
    expect(parseQuickAdd("a due 2026-11-02", today).deadline).toBe("2026-11-02");
  });

  it("combines tokens and strips them from the title", () => {
    expect(parseQuickAdd("Write report 1h30 !high due fri", today)).toEqual({
      title: "Write report",
      durationMin: 90,
      priority: "high",
      deadline: "2026-10-16",
    });
  });

  it("leaves unrecognised look-alikes in the title", () => {
    const result = parseQuickAdd("Call mum due nonsense", today);
    expect(result.title).toBe("Call mum due nonsense");
    expect(result.deadline).toBeNull();
  });
});
