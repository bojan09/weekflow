import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { buildTask } from "@/domain/task-ops";
import { TaskBlock } from "./task-block";

const task = {
  ...buildTask({ title: "Write the proposal", durationMin: 120, priority: "high" }, "proposal", "2026-10-16T08:00:00Z"),
  placement: { date: "2026-10-16", startMin: 810 },
};

describe("calendar task blocks", () => {
  it("keeps the full title, time and priority available without crowding the time label", () => {
    render(<TaskBlock task={task} format="24h" label="Write the proposal, Friday 13:30 – 15:30, High priority" style={{ height: 110 }} />);
    expect(screen.getByRole("button")).toHaveAccessibleDescription(/Write the proposal.*13:30 – 15:30.*High priority/);
    expect(screen.getByText("13:30 – 15:30")).toBeTruthy();
    expect(screen.queryByText(/15:30 · High/)).toBeNull();
  });

  it("provides full details for short blocks without inflating their height", () => {
    render(<TaskBlock task={task} format="12h" label="Proposal" style={{ height: 18 }} />);
    expect(screen.getByRole("button")).toHaveStyle({ height: "18px" });
    expect(screen.getByRole("button")).toHaveAccessibleDescription(/1:30 PM – 3:30 PM/);
  });

  it("preserves keyboard and resize handlers and omits the handle when locked", () => {
    const resize = vi.fn();
    const key = vi.fn();
    const { container, rerender } = render(<TaskBlock task={task} format="24h" label="Proposal" onResizePointerDown={resize} onKeyDown={key} />);
    fireEvent.pointerDown(container.querySelector("[data-resize-handle]")!);
    fireEvent.keyDown(screen.getByRole("button"), { key: "ArrowDown" });
    expect(resize).toHaveBeenCalledOnce();
    expect(key).toHaveBeenCalledOnce();
    rerender(<TaskBlock task={{ ...task, locked: true }} format="24h" label="Proposal, locked" onResizePointerDown={resize} />);
    expect(container.querySelector("[data-resize-handle]")).toBeNull();
  });
});
