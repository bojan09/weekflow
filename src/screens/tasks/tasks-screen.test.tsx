import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { tasksCollection } from "@/data/tasks";
import { buildTask } from "@/domain/task-ops";
import { TasksScreen } from "./tasks-screen";
vi.mock("next/navigation", () => ({ usePathname: () => "/demo/tasks" }));
beforeEach(() => {
  tasksCollection.write([
    buildTask({ title: "Send the outline", durationMin: 30, priority: "high" }, "a", "2026-10-16T00:00:00Z"),
    buildTask({ title: "Read notes", durationMin: 30, priority: "low" }, "b", "2026-10-16T00:00:00Z"),
  ]);
});
it("keeps mobile filters collapsible, preserves selection, and offers a visible reset", async () => {
  render(<TasksScreen />);
  const toggle = await screen.findByRole("button", { name: "Filters" });
  expect(toggle).toHaveAttribute("aria-expanded", "false");
  fireEvent.click(toggle);
  expect(toggle).toHaveAttribute("aria-expanded", "true");
  fireEvent.change(screen.getByLabelText("Filter by priority"), { target: { value: "high" } });
  expect(screen.queryByRole("button", { name: /^Read notes$/ })).toBeNull();
  expect(screen.getByRole("button", { name: "Filters (1)" })).toBeTruthy();
  fireEvent.click(toggle);
  expect(toggle).toHaveAttribute("aria-expanded", "false");
  fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
  expect(screen.getByRole("button", { name: "Read notes" })).toBeTruthy();
});
