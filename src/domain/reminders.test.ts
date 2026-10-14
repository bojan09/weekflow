import { describe, expect, it } from "vitest";
import { dueReminders, reminderMessage } from "./reminders";
import { buildTask } from "./task-ops";
import type { Task } from "./tasks";

const task = (id: string, startMin: number | null, extra: Partial<Task> = {}): Task => ({
  ...buildTask({ title: `Task ${id}`, durationMin: 30, priority: "medium" }, id, "2026-10-12T00:00:00.000Z"),
  placement: startMin === null ? null : { date: "2026-10-14", startMin },
  ...extra,
});
const NOW = { date: "2026-10-14", minutes: 9 * 60 + 50 }; // 09:50

describe("dueReminders", () => {
  it("is due from the lead time until the start minute", () => {
    expect(dueReminders([task("a", 10 * 60)], NOW, 10, new Set()).map((r) => r.task.id)).toEqual(["a"]);
    expect(dueReminders([task("a", 10 * 60 + 1)], NOW, 10, new Set())).toEqual([]); // 11 min away
    expect(dueReminders([task("a", 9 * 60 + 50)], NOW, 0, new Set())[0]?.startsInMin).toBe(0);
  });

  it("never shows a stale reminder for a task that already started", () => {
    expect(dueReminders([task("a", 9 * 60 + 49)], NOW, 10, new Set())).toEqual([]);
  });

  it("skips tasks that are done, unscheduled, day-only, on another day, or already reminded", () => {
    const tasks = [
      task("done", 10 * 60, { status: "done" }),
      task("inbox", null),
      task("dayonly", null, { placement: { date: "2026-10-14", startMin: null } }),
      task("tomorrow", 10 * 60, { placement: { date: "2026-10-15", startMin: 10 * 60 } }),
      task("seen", 10 * 60),
    ];
    const reminded = new Set(["seen:2026-10-14:600"]);
    expect(dueReminders(tasks, NOW, 10, reminded)).toEqual([]);
  });

  it("orders by start and words the message", () => {
    const due = dueReminders([task("b", 10 * 60), task("a", 9 * 60 + 55)], NOW, 10, new Set());
    expect(due.map((r) => r.task.id)).toEqual(["a", "b"]);
    expect(reminderMessage(due[0]!)).toBe("Task a starts in 5 min");
    expect(reminderMessage({ ...due[0]!, startsInMin: 0 })).toBe("Task a starts now");
  });

  it("changes the key when the task is moved, so it reminds again", () => {
    const first = dueReminders([task("a", 10 * 60)], NOW, 10, new Set())[0]!;
    const moved = dueReminders([task("a", 10 * 60 + 5)], NOW, 15, new Set())[0]!;
    expect(first.key).not.toBe(moved.key);
  });
});
