import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { STEPS } from "@/guide/progress";
import { useGuideStore } from "@/guide/store";
import { useUiStore } from "@/stores/ui";
import { StartHere } from "./start-here";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

beforeEach(() => {
  useGuideStore.setState({ done: {}, panelHidden: false, dismissedHints: {}, hydrated: true });
});

describe("StartHere", () => {
  it("shows one next step and the progress count without the map or glossary", () => {
    render(<StartHere />);
    expect(screen.getByRole("heading", { name: "Start here" })).toBeTruthy();
    expect(screen.getByText("0 of 6 done")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Map" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Learn" })).toBeNull();
    expect(screen.getByText("Add a task")).toBeTruthy();
    expect(screen.queryByText("Lock a task")).toBeNull();
  });

  it("marks finished steps in text, not just colour", () => {
    useGuideStore.setState({ done: { "add-task": true } });
    render(<StartHere />);
    expect(screen.getByText("1 of 6 done")).toBeTruthy();
    expect(screen.getByText("Put a task on your calendar")).toBeTruthy();
    expect(screen.queryByText("Add a task")).toBeNull();
  });

  it("can be hidden, leaving a link to the Guide", () => {
    const { rerender } = render(<StartHere />);
    fireEvent.click(screen.getByRole("button", { name: "Hide" }));
    rerender(<StartHere />);
    expect(screen.queryByRole("heading", { name: "Start here" })).toBeNull();
    expect(screen.getByRole("link", { name: /Open the Guide/ })).toBeTruthy();
  });

  it("collapses to a Guide link when all six steps are done", () => {
    useGuideStore.setState({
      done: { "add-task": true, "schedule-task": true, "lock-task": true, "preview-plan": true, "check-rules": true, "open-review": true },
    });
    render(<StartHere />);
    expect(screen.queryByRole("heading", { name: "Start here" })).toBeNull();
    expect(screen.getByRole("link", { name: /Open the Guide/ })).toBeTruthy();
  });

  it("every step's button really does something, and none points at the page you are on", () => {
    for (const step of STEPS) {
      if (step.go.type === "link") expect(step.go.route, step.id).not.toBe("home");
    }
    render(<StartHere />);
    expect(screen.getByText(STEPS[0]!.go.label)).toBeTruthy();
    expect(screen.getByRole("link", { name: /Open the Guide/ })).toHaveAttribute("href", "/demo/guide#setup");
  });

  it("Add one opens the new task editor, and Preview it opens the plan preview", () => {
    useUiStore.setState({ editor: null, planOpen: false });
    const { unmount } = render(<StartHere />);
    fireEvent.click(screen.getByRole("button", { name: "Add one" }));
    expect(useUiStore.getState().editor).toEqual({ kind: "new" });
    unmount();
    useGuideStore.setState({ done: { "add-task": true, "schedule-task": true, "lock-task": true } });
    render(<StartHere />);
    fireEvent.click(screen.getByRole("button", { name: "Preview it" }));
    expect(useUiStore.getState().planOpen).toBe(true);
  });

  it("Lock a task points at the Tasks page, where the menu has Lock in place", () => {
    useGuideStore.setState({ done: { "add-task": true, "schedule-task": true } });
    render(<StartHere />);
    expect(screen.getByRole("link", { name: "Open Tasks" }).getAttribute("href")).toBe("/demo/tasks");
  });

  it("renders nothing until saved progress is loaded", () => {
    useGuideStore.setState({ hydrated: false });
    const { container } = render(<StartHere />);
    expect(container).toBeEmptyDOMElement();
  });
});
