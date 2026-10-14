import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useGuideStore } from "@/guide/store";
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
  it("shows three doors and the progress count", () => {
    render(<StartHere />);
    expect(screen.getByRole("heading", { name: "Start here" })).toBeTruthy();
    expect(screen.getByText("0 of 6 done")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Map" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Do" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Learn" })).toBeTruthy();
  });

  it("marks finished steps in text, not just colour", () => {
    useGuideStore.setState({ done: { "add-task": true } });
    render(<StartHere />);
    expect(screen.getByText("1 of 6 done")).toBeTruthy();
    expect(screen.getByText("Done: Add a task")).toBeTruthy();
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

  it("renders nothing until saved progress is loaded", () => {
    useGuideStore.setState({ hydrated: false });
    const { container } = render(<StartHere />);
    expect(container).toBeEmptyDOMElement();
  });
});
