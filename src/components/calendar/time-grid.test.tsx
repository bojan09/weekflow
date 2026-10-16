import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_PREFS } from "@/prefs/schema";
import { calendarHourHeight, computeMove, minutesToPx } from "./geometry";
import { TimeGrid } from "./time-grid";

function gridProps(stepMin: number) {
  return { stepMin, days: ["2026-10-16"], tasks: [], allTasks: [], planning: DEFAULT_PREFS.planning,
    format: "24h" as const, density: "comfortable" as const, now: { date: "2026-10-16", minutes: 1020 },
    conflictedIds: new Set<string>(), scrollerRef: createRef<HTMLDivElement>(), bodyRef: createRef<HTMLDivElement>(), drag: null,
    heightClass: "h-96", onBlockPointerDown: vi.fn(), onResizePointerDown: vi.fn(), onOpenTask: vi.fn(),
    onMoveTask: vi.fn(), onResizeTask: vi.fn(), onToggleLock: vi.fn(), onCreateAt: vi.fn(), announce: vi.fn() };
}
describe("visible calendar time spacing", () => {
  it.each([5, 10, 15, 30])("labels every %i-minute row and leaves readable space between labels", (step) => {
    render(<TimeGrid {...gridProps(step)} />);
    const first = screen.getByText("17:00");
    const second = screen.getByText(`17:${String(step).padStart(2, "0")}`);
    expect(parseFloat(second.style.top) - parseFloat(first.style.top)).toBeGreaterThanOrEqual(24);
    expect(screen.getByText(`18:${String(step).padStart(2, "0")}`)).toBeTruthy();
    if (step !== 5) expect(screen.queryByText("17:05")).toBeNull();
    const height = calendarHourHeight("comfortable", step);
    expect(minutesToPx(60, height)).toBe(height);
    expect(computeMove({ dayIndex: 0, minutes: 1020 + step }, 0, 60, step).startMin).toBe(1020 + step);
  });
  it("keeps the same visible time when spacing changes", () => {
    const props = gridProps(15);
    const { rerender } = render(<TimeGrid {...props} />);
    props.scrollerRef.current!.scrollTop = minutesToPx(1020, calendarHourHeight("comfortable", 15));
    rerender(<TimeGrid {...props} stepMin={5} />);
    expect(props.scrollerRef.current!.scrollTop).toBe(minutesToPx(1020, calendarHourHeight("comfortable", 5)));
  });
});
