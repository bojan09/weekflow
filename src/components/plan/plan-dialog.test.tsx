import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { tasksCollection } from "@/data/tasks";
import { buildTask } from "@/domain/task-ops";
import { isInbox } from "@/domain/tasks";
import { useUiStore } from "@/stores/ui";
import { PlanDialog } from "./plan-dialog";

const inbox = (id: string, title: string) => buildTask({ title, durationMin: 45, priority: "high" }, id, "2026-10-12T00:00:00.000Z");

beforeEach(() => {
  act(() => {
    useUiStore.setState({ planOpen: false });
    tasksCollection.write([inbox("a", "Write the report"), inbox("b", "Book flights")]);
  });
});

const open = (): void => {
  render(<PlanDialog />);
  act(() => useUiStore.getState().setPlanOpen(true));
};

describe("PlanDialog", () => {
  it("previews the plan with reasons and changes nothing until applied", async () => {
    open();
    expect(await screen.findByText(/2 to place/)).toBeTruthy();
    expect(screen.getByText("Write the report")).toBeTruthy();
    expect(screen.getAllByText("Why here?")).toHaveLength(2);
    expect(tasksCollection.getSnapshot().filter(isInbox)).toHaveLength(2);
  });

  it("applies the plan in one step", async () => {
    open();
    fireEvent.click(await screen.findByRole("button", { name: /Apply plan \(2\)/ }));
    expect(tasksCollection.getSnapshot().filter(isInbox)).toHaveLength(0);
    expect(useUiStore.getState().planOpen).toBe(false);
  });

  it("cancel leaves the calendar untouched", async () => {
    open();
    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));
    expect(tasksCollection.getSnapshot().filter(isInbox)).toHaveLength(2);
  });

  it("says so when there is nothing to plan, and disables Apply", async () => {
    act(() => tasksCollection.write([]));
    open();
    expect(await screen.findByText(/Nothing to plan/)).toBeTruthy();
    expect((screen.getByRole("button", { name: "Nothing to apply" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
