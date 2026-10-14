import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useGuideStore } from "@/guide/store";
import { ScreenHint } from "./screen-hint";

let pathname = "/demo/week";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

beforeEach(() => {
  pathname = "/demo/week";
  useGuideStore.setState({ done: {}, panelHidden: false, dismissedHints: {}, hydrated: true });
});

describe("ScreenHint", () => {
  it("shows the screen's hint once and remembers the dismissal", () => {
    const { container } = render(<ScreenHint />);
    expect(screen.getByText(/Drag a task onto the calendar/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Got it" }));
    expect(container).toBeEmptyDOMElement();
    expect(useGuideStore.getState().dismissedHints.week).toBe(true);
  });

  it("waits for saved progress before showing anything", () => {
    useGuideStore.setState({ hydrated: false });
    const { container } = render(<ScreenHint />);
    expect(container).toBeEmptyDOMElement();
  });

  it("stays away from the Guide, the changelog and Home while Start here is showing", () => {
    pathname = "/demo/guide";
    const { container, rerender } = render(<ScreenHint />);
    expect(container).toBeEmptyDOMElement();
    pathname = "/demo/home";
    rerender(<ScreenHint />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows on Home once Start here is hidden", () => {
    pathname = "/demo/home";
    useGuideStore.setState({ panelHidden: true });
    render(<ScreenHint />);
    expect(screen.getByText(/Home is your overview/)).toBeTruthy();
  });
});
