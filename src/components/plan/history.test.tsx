import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { clearHistory, commitSchedule, historyCollection } from "@/data/history";
import { tasksCollection } from "@/data/tasks";
import { addDays, localISO } from "@/lib/dates";
import { buildTask } from "@/domain/task-ops";
import type { Task } from "@/domain/tasks";
import { useAutoReplan } from "@/hooks/use-auto-replan";
import { usePrefsStore } from "@/prefs/store";
import { useUiStore } from "@/stores/ui";
import { HistoryDialog } from "./history-dialog";

const YESTERDAY = addDays(localISO(new Date()), -1);
const missed = (id: string): Task => ({
  ...buildTask({ title: `Missed ${id}`, durationMin: 30, priority: "high" }, id, "2026-10-12T00:00:00.000Z"),
  placement: { date: YESTERDAY, startMin: 10 * 60 },
});

beforeEach(() => {
  act(() => {
    clearHistory();
    tasksCollection.write([missed("a"), missed("b")]);
    useUiStore.setState({ historyOpen: false });
    usePrefsStore.getState().update("engine", { autoReschedule: "ask" });
  });
});

describe("commitSchedule and history", () => {
  it("saves the schedule from before the change, and nothing for a no-op", () => {
    expect(commitSchedule("noop", (t) => t as Task[])).toBeNull();
    expect(historyCollection.getSnapshot()).toHaveLength(0);

    const previous = commitSchedule("Before test", (tasks) => tasks.map((t) => ({ ...t, placement: null })));
    expect(previous).toHaveLength(2);
    const [snapshot] = historyCollection.getSnapshot();
    expect(snapshot?.label).toBe("Before test");
    expect(snapshot?.entries["a"]).toEqual({ date: YESTERDAY, startMin: 600 });
  });
});

describe("HistoryDialog", () => {
  it("explains an empty history", () => {
    render(<HistoryDialog />);
    act(() => useUiStore.getState().setHistoryOpen(true));
    expect(screen.getByText(/No history yet/)).toBeTruthy();
  });

  it("restores an earlier schedule in one click", () => {
    commitSchedule("Before Plan my week", (tasks) => tasks.map((t) => ({ ...t, placement: null })));
    render(<HistoryDialog />);
    act(() => useUiStore.getState().setHistoryOpen(true));
    expect(screen.getByText(/2 tasks would move/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Restore/ }));
    expect(tasksCollection.getSnapshot().every((t) => t.placement?.date === YESTERDAY)).toBe(true);
    // The restore itself is recorded, so it can be rolled back too.
    expect(historyCollection.getSnapshot()[0]?.label).toMatch(/Before restoring/);
  });
});

describe("useAutoReplan", () => {
  it("does nothing unless Replan automatically is chosen", () => {
    renderHook(() => useAutoReplan());
    expect(tasksCollection.getSnapshot().every((t) => t.placement?.date === YESTERDAY)).toBe(true);
  });

  it("replans missed tasks once, saves history, and leaves nothing missed", () => {
    act(() => usePrefsStore.getState().update("engine", { autoReschedule: "auto" }));
    renderHook(() => useAutoReplan());
    const after = tasksCollection.getSnapshot();
    expect(after.every((t) => t.placement !== null && t.placement.date >= localISO(new Date()))).toBe(true);
    expect(historyCollection.getSnapshot()).toHaveLength(1);
    expect(historyCollection.getSnapshot()[0]?.label).toBe("Before auto-replanning");
  });
});
