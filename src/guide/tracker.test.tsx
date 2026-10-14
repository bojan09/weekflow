import { act, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { tasksCollection } from "@/data/tasks";
import { buildTask } from "@/domain/task-ops";
import { useUiStore } from "@/stores/ui";
import { GuideTracker } from "./tracker";
import { useGuideStore } from "./store";

let pathname = "/demo/home";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

const mk = (id: string) => buildTask({ title: id, durationMin: 30, priority: "low" }, id, "2026-10-12T00:00:00.000Z");

beforeEach(() => {
  window.localStorage.clear();
  pathname = "/demo/home";
  useGuideStore.setState({ done: {}, panelHidden: false, dismissedHints: {}, hydrated: false });
  useUiStore.setState({ planOpen: false });
  act(() => tasksCollection.write([mk("a"), mk("b")]));
});

describe("GuideTracker", () => {
  it("marks the guide store hydrated", () => {
    render(<GuideTracker />);
    expect(useGuideStore.getState().hydrated).toBe(true);
  });

  it("ticks add, schedule and lock from real task changes", () => {
    render(<GuideTracker />);
    act(() => tasksCollection.write([mk("a"), mk("b"), mk("c")]));
    expect(useGuideStore.getState().done["add-task"]).toBe(true);

    act(() =>
      tasksCollection.write([
        { ...mk("a"), placement: { date: "2026-10-14", startMin: 600 } },
        mk("b"),
        mk("c"),
      ]),
    );
    expect(useGuideStore.getState().done["schedule-task"]).toBe(true);

    act(() =>
      tasksCollection.write([
        { ...mk("a"), placement: { date: "2026-10-14", startMin: 600 }, locked: true },
        mk("b"),
        mk("c"),
      ]),
    );
    expect(useGuideStore.getState().done["lock-task"]).toBe(true);
  });

  it("does not tick anything when the whole list is replaced", () => {
    render(<GuideTracker />);
    act(() => tasksCollection.write([mk("x"), mk("y"), mk("z")]));
    expect(useGuideStore.getState().done).toEqual({});
  });

  it("ticks preview-plan when the plan dialog opens", () => {
    render(<GuideTracker />);
    act(() => useUiStore.getState().setPlanOpen(true));
    expect(useGuideStore.getState().done["preview-plan"]).toBe(true);
  });

  it("ticks check-rules and open-review from the page visited", () => {
    pathname = "/demo/settings/planning";
    const { rerender } = render(<GuideTracker />);
    expect(useGuideStore.getState().done["check-rules"]).toBe(true);
    pathname = "/demo/review";
    rerender(<GuideTracker />);
    expect(useGuideStore.getState().done["open-review"]).toBe(true);
  });
});
