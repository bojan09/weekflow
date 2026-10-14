import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useUiStore } from "@/stores/ui";
import { HelpButton } from "./help-button";
import { HelpPanel } from "./help-panel";

let pathname = "/demo/week";
vi.mock("next/navigation", () => ({ usePathname: () => pathname, useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

beforeEach(() => {
  pathname = "/demo/week";
  useUiStore.setState({ helpOpen: false });
});

describe("help panel", () => {
  it("opens from the button and shows the current screen's guide", () => {
    render(
      <>
        <HelpButton />
        <HelpPanel />
      </>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Help for this page" }));
    expect(screen.getByText("About My Week")).toBeTruthy();
    expect(screen.getByText(/Drag a task from Unscheduled/)).toBeTruthy();
    expect(screen.getByRole("link", { name: /Read the full guide/ }).getAttribute("href")).toBe("/demo/guide#week");
  });

  it("follows the route", () => {
    pathname = "/demo/review";
    render(<HelpPanel />);
    act(() => useUiStore.getState().setHelpOpen(true));
    expect(screen.getByText("About Weekly review")).toBeTruthy();
  });

  it("explains an unbuilt screen honestly", () => {
    pathname = "/demo/team";
    render(<HelpPanel />);
    act(() => useUiStore.getState().setHelpOpen(true));
    expect(screen.getByText(/Arrives in version 0.0.8/)).toBeTruthy();
  });

  it("closes with Escape", () => {
    render(<HelpPanel />);
    act(() => useUiStore.getState().setHelpOpen(true));
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    expect(useUiStore.getState().helpOpen).toBe(false);
  });
});
