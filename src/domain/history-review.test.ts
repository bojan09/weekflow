import { describe, expect, it } from "vitest";
import { captureSchedule, MAX_SNAPSHOTS, pushSnapshot, restoreSchedule, snapshotChanges, historySchema } from "./history";
import { categoryBreakdown, dayWorkload, estimateAccuracy, weeklyReview } from "./review";
import { buildTask } from "./task-ops";
import { isMissed, type Task } from "./tasks";
import { DEFAULT_PREFS } from "@/prefs/schema";
import { weekDates } from "@/lib/dates";

const planning = DEFAULT_PREFS.planning; // Mon–Fri 09–17, 6h cap
const TODAY = "2026-10-14"; // Wednesday
const NOW = { date: TODAY, minutes: 12 * 60 };
const WEEK = weekDates(TODAY, "monday");

const task = (id: string, extra: Partial<Task> = {}): Task => ({
  ...buildTask({ title: `Task ${id}`, durationMin: 60, priority: "medium" }, id, "2026-10-12T00:00:00.000Z"),
  ...extra,
});
const at = (date: string, startMin: number | null) => ({ date, startMin });

describe("isMissed", () => {
  it("is true for earlier days and for earlier times today", () => {
    expect(isMissed(task("a", { placement: at("2026-10-13", 600) }), NOW)).toBe(true);
    expect(isMissed(task("b", { placement: at(TODAY, 9 * 60) }), NOW)).toBe(true);
  });
  it("is false for running, upcoming, unplaced, done and day-only-today tasks", () => {
    expect(isMissed(task("a", { placement: at(TODAY, 11 * 60 + 30) }), NOW)).toBe(false); // ends 12:30
    expect(isMissed(task("b", { placement: at(TODAY, 14 * 60) }), NOW)).toBe(false);
    expect(isMissed(task("c"), NOW)).toBe(false);
    expect(isMissed(task("d", { status: "done", placement: at("2026-10-13", 600) }), NOW)).toBe(false);
    expect(isMissed(task("e", { placement: at(TODAY, null) }), NOW)).toBe(false);
    expect(isMissed(task("f", { placement: at("2026-10-13", null) }), NOW)).toBe(true);
  });
});

describe("schedule history", () => {
  const tasks = [task("a", { placement: at(TODAY, 600) }), task("b"), task("c", { status: "done" })];

  it("captures open tasks only, and the result is valid", () => {
    const snap = captureSchedule(tasks, "s1", "2026-10-14T10:00:00.000Z", "Before plan");
    expect(Object.keys(snap.entries).sort()).toEqual(["a", "b"]);
    expect(historySchema.safeParse([snap]).success).toBe(true);
  });

  it("restores placements and reports exactly what changes", () => {
    const snap = captureSchedule(tasks, "s1", "t", "x");
    const moved = tasks.map((t) => (t.id === "a" ? { ...t, placement: at("2026-10-15", 700) } : t.id === "b" ? { ...t, placement: at(TODAY, 900) } : t));
    const changes = snapshotChanges(snap, moved);
    expect(changes.map((c) => c.taskId)).toEqual(["a", "b"]);
    const back = restoreSchedule(moved, snap);
    expect(back.find((t) => t.id === "a")?.placement).toEqual(at(TODAY, 600));
    expect(back.find((t) => t.id === "b")?.placement).toBeNull();
    expect(restoreSchedule(back, snap)).toBe(back); // nothing left to change
  });

  it("leaves locked, finished, new and deleted tasks alone, and keeps edits", () => {
    const snap = captureSchedule(tasks, "s1", "t", "x");
    const now = [
      { ...tasks[0]!, locked: true, placement: at("2026-10-16", 600) },
      { ...tasks[1]!, title: "Renamed", placement: at(TODAY, 900) },
      task("new", { placement: at(TODAY, 1000) }),
    ];
    const back = restoreSchedule(now, snap);
    expect(back[0]?.placement).toEqual(at("2026-10-16", 600)); // locked
    expect(back[1]).toMatchObject({ title: "Renamed", placement: null }); // edit kept, place restored
    expect(back[2]).toBe(now[2]); // not in snapshot
  });

  it("keeps the newest snapshots only", () => {
    let history = pushSnapshot([], captureSchedule([], "0", "t", "x"));
    for (let i = 1; i <= MAX_SNAPSHOTS + 5; i += 1) history = pushSnapshot(history, captureSchedule([], String(i), "t", "x"));
    expect(history).toHaveLength(MAX_SNAPSHOTS);
    expect(history[0]?.id).toBe(String(MAX_SNAPSHOTS + 5));
  });
});

describe("workload and review", () => {
  const tasks = [
    task("a", { durationMin: 240, placement: at("2026-10-12", 540), category: "focus" }),
    task("b", { durationMin: 180, placement: at("2026-10-12", 780), category: "focus" }), // 7h > 6h cap
    task("c", { durationMin: 60, placement: at(TODAY, 840), category: "admin" }),
    task("d", { durationMin: 330, placement: at("2026-10-15", 540) }), // 5.5h: near the limit
    task("e", { status: "done", completedOn: "2026-10-13", durationMin: 60, actualMin: 90, category: "admin", placement: at("2026-10-13", 600) }),
    task("f", { placement: at("2026-10-13", 600) }), // missed
  ];

  it("flags overloaded, nearly full and day-off days in plain statuses", () => {
    const rows = dayWorkload(tasks, planning, WEEK);
    const status = Object.fromEntries(rows.map((r) => [r.date, r.status]));
    expect(status["2026-10-12"]).toBe("over");
    expect(status["2026-10-15"]).toBe("near");
    expect(status[TODAY]).toBe("light");
    expect(status["2026-10-17"]).toBe("off");
    expect(rows[0]?.capMin).toBe(360);
  });

  it("groups minutes by category, using actual time for finished tasks", () => {
    const shares = categoryBreakdown(tasks, WEEK);
    expect(shares[0]).toMatchObject({ category: "focus", minutes: 420 });
    expect(shares.find((s) => s.category === "admin")).toMatchObject({ minutes: 150, tasks: 2 });
  });

  it("compares estimates with actual time", () => {
    expect(estimateAccuracy(tasks, WEEK)).toEqual({ samples: 1, estimatedMin: 60, actualMin: 90 });
    expect(estimateAccuracy([], WEEK).samples).toBe(0);
  });

  it("builds the weekly review", () => {
    const review = weeklyReview([...tasks, task("g", { deadline: "2026-10-16" })], WEEK, NOW);
    expect(review.completed.map((t) => t.id)).toEqual(["e"]);
    expect(review.missed.map((t) => t.id)).toEqual(["a", "b", "f"]); // a, b on Mon; f on Tue
    expect(review.ahead.map((t) => t.id)).toEqual(["c", "d"]);
    expect(review.dueSoonUnscheduled.map((t) => t.id)).toEqual(["g"]);
    expect(review.completedMin).toBe(90);
  });
});
