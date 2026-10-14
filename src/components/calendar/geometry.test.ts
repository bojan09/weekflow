import { describe, expect, it } from "vitest";
import {
  computeMove,
  computeResize,
  layoutDay,
  minutesToPx,
  pointToCell,
  pxToMinutes,
  snapMinutes,
  type GridMetrics,
} from "./geometry";

const grid: GridMetrics = { left: 100, top: -200, width: 700, dayCount: 7, hourHeight: 60 };

describe("geometry", () => {
  it("converts between minutes and pixels", () => {
    expect(minutesToPx(90, 60)).toBe(90);
    expect(pxToMinutes(56, 56)).toBe(60);
    expect(minutesToPx(30, 56)).toBe(28);
  });

  it("snaps to 15 minutes", () => {
    expect(snapMinutes(7)).toBe(0);
    expect(snapMinutes(8)).toBe(15);
    expect(snapMinutes(62)).toBe(60);
    expect(snapMinutes(68)).toBe(75);
  });

  it("finds the day and minute under a point, accounting for scroll", () => {
    // x 250 -> (250-100)/100 = day 1; y 160 -> (160+200)/60 h = 6h = 360 min
    expect(pointToCell(250, 160, grid)).toEqual({ dayIndex: 1, minutes: 360 });
  });

  it("clamps points outside the grid", () => {
    expect(pointToCell(0, 160, grid).dayIndex).toBe(0);
    expect(pointToCell(5000, 160, grid).dayIndex).toBe(6);
    expect(pointToCell(250, -999, grid).minutes).toBe(0);
    expect(pointToCell(250, 99999, grid).minutes).toBe(1440);
  });

  it("keeps the grab point under the cursor when moving", () => {
    // Pointer at 10:00 (600), grabbed 30 min below the top -> block starts 09:30.
    expect(computeMove({ dayIndex: 2, minutes: 600 }, 30, 60)).toEqual({ dayIndex: 2, startMin: 570 });
  });

  it("clamps a move so the block stays inside the day", () => {
    expect(computeMove({ dayIndex: 0, minutes: 1430 }, 0, 60).startMin).toBe(1380);
    expect(computeMove({ dayIndex: 0, minutes: 5 }, 40, 60).startMin).toBe(0);
  });

  it("resizes by the bottom edge with a minimum and a day limit", () => {
    expect(computeResize(660, 540)).toBe(120);
    expect(computeResize(545, 540)).toBe(15);
    expect(computeResize(300, 540)).toBe(15);
    expect(computeResize(2000, 1380)).toBe(60);
  });
});

describe("layoutDay", () => {
  const item = (id: string, start: number, end: number) => ({ id, start, end });

  it("gives a lone block the full width", () => {
    expect(layoutDay([item("a", 0, 60)]).get("a")).toEqual({ lane: 0, lanes: 1 });
  });

  it("places overlapping blocks side by side", () => {
    const l = layoutDay([item("a", 0, 60), item("b", 30, 90)]);
    expect(l.get("a")).toEqual({ lane: 0, lanes: 2 });
    expect(l.get("b")).toEqual({ lane: 1, lanes: 2 });
  });

  it("does not widen blocks that merely touch", () => {
    const l = layoutDay([item("a", 0, 60), item("b", 60, 120)]);
    expect(l.get("a")).toEqual({ lane: 0, lanes: 1 });
    expect(l.get("b")).toEqual({ lane: 0, lanes: 1 });
  });

  it("reuses a lane once it frees up inside a cluster", () => {
    const l = layoutDay([item("a", 0, 120), item("b", 30, 60), item("c", 70, 100)]);
    expect(l.get("b")?.lane).toBe(1);
    expect(l.get("c")?.lane).toBe(1);
    expect(l.get("a")?.lanes).toBe(2);
  });

  it("is independent of input order", () => {
    const items = [item("a", 0, 120), item("b", 30, 60), item("c", 70, 100), item("d", 200, 260)];
    const forward = layoutDay(items);
    const backward = layoutDay([...items].reverse());
    for (const { id } of items) expect(backward.get(id)).toEqual(forward.get(id));
    expect(forward.get("d")).toEqual({ lane: 0, lanes: 1 });
  });
});
