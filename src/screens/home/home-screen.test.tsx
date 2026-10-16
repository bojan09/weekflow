import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { tasksCollection } from "@/data/tasks";
import { useGuideStore } from "@/guide/store";
import { useUiStore } from "@/stores/ui";
import { HomeScreen } from "./home-screen";

beforeEach(() => {
  tasksCollection.write([]);
  useGuideStore.setState({ hydrated: true, panelHidden: false, done: {} });
  useUiStore.setState({ planOpen: false });
});

describe("calendar-first Home", () => {
  it("puts the schedule before attention items and optional onboarding", async () => {
    render(<HomeScreen />);
    const calendar = await screen.findByRole("region", { name: "Week calendar" });
    const attention = screen.getByRole("complementary", { name: "Needs attention" });
    const onboarding = screen.getByRole("region", { name: "Start here" });
    expect(calendar.compareDocumentPosition(attention) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(calendar.compareDocumentPosition(onboarding) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Quick add a task" })).toBeTruthy();
  });

  it("opens a preview rather than silently changing the schedule", () => {
    render(<HomeScreen />);
    fireEvent.click(screen.getByRole("button", { name: "Preview a plan" }));
    expect(useUiStore.getState().planOpen).toBe(true);
    expect(tasksCollection.getSnapshot()).toEqual([]);
  });
});
