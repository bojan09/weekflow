import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  diffDays,
  formatRange,
  isValidISO,
  localISO,
  monthGrid,
  startOfWeek,
  weekdayOf,
  weekDates,
} from "./dates";

describe("dates", () => {
  it("validates ISO dates strictly", () => {
    expect(isValidISO("2026-10-14")).toBe(true);
    expect(isValidISO("2026-02-30")).toBe(false);
    expect(isValidISO("2026-1-4")).toBe(false);
    expect(isValidISO("nope")).toBe(false);
  });

  it("adds days across month, year and leap boundaries", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("is not affected by DST transitions", () => {
    expect(diffDays("2026-03-28", "2026-03-30")).toBe(2);
    expect(diffDays("2026-10-24", "2026-10-26")).toBe(2);
    expect(addDays("2026-03-29", 1)).toBe("2026-03-30");
  });

  it("finds the weekday", () => {
    expect(weekdayOf("2026-10-14")).toBe(3);
  });

  it("finds the start of the week for each week-start setting", () => {
    expect(startOfWeek("2026-10-14", "monday")).toBe("2026-10-12");
    expect(startOfWeek("2026-10-14", "sunday")).toBe("2026-10-11");
    expect(startOfWeek("2026-10-14", "saturday")).toBe("2026-10-10");
    expect(startOfWeek("2026-10-12", "monday")).toBe("2026-10-12");
    expect(startOfWeek("2026-10-18", "monday")).toBe("2026-10-12");
  });

  it("lists seven consecutive dates for a week", () => {
    const dates = weekDates("2026-10-14", "monday");
    expect(dates).toHaveLength(7);
    expect(dates[0]).toBe("2026-10-12");
    expect(dates[6]).toBe("2026-10-18");
  });

  it("formats a range with the year once", () => {
    expect(formatRange("2026-10-12", "2026-10-18")).toBe("Oct 12 – Oct 18, 2026");
  });

  it("builds a six-week month grid starting on the week start", () => {
    const grid = monthGrid("2026-10-14", "monday");
    expect(grid).toHaveLength(6);
    expect(grid[0]?.[0]).toBe("2026-09-28");
    expect(grid.flat()).toContain("2026-10-31");
  });

  it("adds months", () => {
    expect(addMonths("2026-10-14", 1)).toBe("2026-11-01");
    expect(addMonths("2026-01-31", -1)).toBe("2025-12-01");
  });

  it("reads the local calendar date", () => {
    expect(localISO(new Date(2026, 9, 14, 23, 59))).toBe("2026-10-14");
  });
});
