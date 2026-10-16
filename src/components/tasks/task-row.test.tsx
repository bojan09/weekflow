import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { buildTask } from "@/domain/task-ops";
vi.mock("./actions", () => ({ removeTask: vi.fn(), toggleDone: vi.fn(), toggleLock: vi.fn() }));
import { removeTask } from "./actions";
import { TaskRow } from "./task-row";

it("provides direct edit and delete actions without opening the overflow menu", () => {
  const task = buildTask({ title: "Prepare outline", priority: "medium", durationMin: 60 }, "outline", "2026-10-16T00:00:00Z");
  const open = vi.fn();
  render(<ul><TaskRow task={task} format="24h" today="2026-10-16" onOpen={open} /></ul>);
  fireEvent.click(screen.getByRole("button", { name: "Edit Prepare outline" }));
  expect(open).toHaveBeenCalledWith(task.id);
  fireEvent.click(screen.getByRole("button", { name: "Delete Prepare outline" }));
  expect(removeTask).toHaveBeenCalledWith(task);
  expect(open).toHaveBeenCalledOnce();
});
