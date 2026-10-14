import { describe, expect, it } from "vitest";
import { addMonthsClamped, describeRecurrence, nextDate, nextOccurrence } from "./recurrence";
import { buildTask } from "./task-ops";
import type { Recurrence, Task } from "./tasks";

const rule = (extra: Partial<Recurrence> = {}): Recurrence => ({ freq: "daily", interval: 1, weekdays: [], until: null, ...extra });
const task = (extra: Partial<Task> = {}): Task => ({
  ...buildTask({ title: "Standup", durationMin: 15, priority: "medium" }, "t1", "2026-10-01T00:00:00.000Z"),
  ...extra,
});

describe("nextDate", () => {
  it("steps days", () => {
    expect(nextDate(rule(), "2026-10-14")).toBe("2026-10-15");
    expect(nextDate(rule({ interval: 3 }), "2026-10-14")).toBe("2026-10-17");
  });

  it("clamps month ends", () => {
    expect(addMonthsClamped("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonthsClamped("2028-01-31", 1)).toBe("2028-02-29");
    expect(addMonthsClamped("2026-11-30", 3)).toBe("2027-02-28");
    expect(nextDate(rule({ freq: "monthly" }), "2026-10-14")).toBe("2026-11-14");
    expect(nextDate(rule({ freq: "monthly", interval: 12 }), "2026-10-14")).toBe("2027-10-14");
  });

  it("repeats weekly on the same weekday when none are chosen", () => {
    expect(nextDate(rule({ freq: "weekly" }), "2026-10-14")).toBe("2026-10-21");
    expect(nextDate(rule({ freq: "weekly", interval: 2 }), "2026-10-14")).toBe("2026-10-28");
  });

  it("finds the next chosen weekday, then wraps to the next week", () => {
    const mwf = rule({ freq: "weekly", weekdays: [1, 3, 5] });
    expect(nextDate(mwf, "2026-10-12")).toBe("2026-10-14"); // Mon -> Wed
    expect(nextDate(mwf, "2026-10-14")).toBe("2026-10-16"); // Wed -> Fri
    expect(nextDate(mwf, "2026-10-16")).toBe("2026-10-19"); // Fri -> Mon
  });

  it("skips whole weeks for an interval above one", () => {
    const biweekly = rule({ freq: "weekly", interval: 2, weekdays: [1, 3] });
    expect(nextDate(biweekly, "2026-10-12")).toBe("2026-10-14"); // same week, Mon -> Wed
    expect(nextDate(biweekly, "2026-10-14")).toBe("2026-10-26"); // Wed -> Mon two weeks later
  });
});

describe("nextOccurrence", () => {
  const today = "2026-10-14";

  it("is null for a task that does not repeat", () => {
    expect(nextOccurrence(task(), today, "n1", "now")).toBeNull();
  });

  it("copies a timed, placed task to the next day and keeps its time", () => {
    const t = task({
      recurrence: rule({ freq: "weekly" }),
      placement: { date: "2026-10-14", startMin: 600 },
      locked: true,
      deadline: "2026-10-15",
      status: "done",
      completedOn: today,
      actualMin: 20,
      checklist: [{ id: "c1", text: "Agenda", done: true }],
      dependsOn: ["x"],
    });
    const next = nextOccurrence(t, today, "n1", "2026-10-14T09:00:00.000Z");
    expect(next).toMatchObject({
      id: "n1",
      status: "todo",
      completedOn: null,
      actualMin: null,
      placement: { date: "2026-10-21", startMin: 600 },
      locked: true,
      deadline: "2026-10-22",
      dependsOn: [],
      createdAt: "2026-10-14T09:00:00.000Z",
    });
    expect(next?.checklist).toEqual([{ id: "c1", text: "Agenda", done: false }]);
  });

  it("keeps an inbox task in the inbox, dated from today", () => {
    const next = nextOccurrence(task({ recurrence: rule() }), today, "n1", "now");
    expect(next?.placement).toBeNull();
    expect(next?.deadline).toBeNull();
  });

  it("never lands before today when finished late", () => {
    const late = task({ recurrence: rule(), placement: { date: "2026-10-01", startMin: 540 } });
    expect(nextOccurrence(late, today, "n1", "now")?.placement?.date).toBe(today);
  });

  it("stops after the end date", () => {
    const ending = task({ recurrence: rule({ until: "2026-10-14" }), placement: { date: "2026-10-14", startMin: 540 } });
    expect(nextOccurrence(ending, today, "n1", "now")).toBeNull();
    const open = task({ recurrence: rule({ until: "2026-10-15" }), placement: { date: "2026-10-14", startMin: 540 } });
    expect(nextOccurrence(open, today, "n1", "now")?.placement?.date).toBe("2026-10-15");
  });

  it("drops the lock when the task has no place", () => {
    const next = nextOccurrence(task({ recurrence: rule() }), today, "n1", "now");
    expect(next?.locked).toBe(false);
  });
});

describe("describeRecurrence", () => {
  it("reads naturally", () => {
    expect(describeRecurrence(rule())).toBe("Every day");
    expect(describeRecurrence(rule({ freq: "weekly", interval: 2, weekdays: [3, 1] }))).toBe("Every 2 weeks on Mon, Wed");
    expect(describeRecurrence(rule({ freq: "monthly", until: "2026-12-01" }))).toMatch(/^Every month until /);
  });
});
