import { describe, expect, it } from "vitest";
import { buildTask } from "@/domain/task-ops";
import { focusMinute } from "./focus-time";

const day = "2026-10-16";
const task = (id: string, date: string, startMin: number, durationMin = 60) => buildTask({ title: id, priority: "medium", durationMin, placement: { date, startMin } }, id, "2026-10-16T00:00:00Z");
describe("opening calendar focus", () => {
  it("shows the task currently in progress instead of an earlier or upcoming task", () => {
    expect(focusMinute([task("later", day, 960), task("current", day, 840, 120), task("earlier", day, 540)], [day], { date: day, minutes: 900 }, 540)).toBe(840);
  });
  it("shows the next unfinished task, skipping completed tasks", () => {
    expect(focusMinute([{ ...task("done", day, 930), status: "done" }, task("next", day, 1020)], [day], { date: day, minutes: 900 }, 540)).toBe(1020);
  });
  it("finds upcoming tasks on a later day in the visible week", () => {
    expect(focusMinute([task("tomorrow", "2026-10-17", 600)], [day, "2026-10-17"], { date: day, minutes: 900 }, 540)).toBe(600);
  });
  it("uses the first task in another week, working hours when empty, and now after today's tasks", () => {
    expect(focusMinute([task("past", "2026-10-10", 840)], ["2026-10-10"], { date: day, minutes: 900 }, 540)).toBe(840);
    expect(focusMinute([], ["2026-10-10"], { date: day, minutes: 900 }, 540)).toBe(540);
    expect(focusMinute([], [day], { date: day, minutes: 900 }, 540)).toBe(900);
  });
});
