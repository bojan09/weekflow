import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SECTIONS } from "@/guide/content";
import { useGuideStore } from "@/guide/store";
import { TERMS } from "@/guide/terms";
import { GuideScreen } from "./guide-screen";

vi.mock("next/navigation", () => ({ usePathname: () => "/demo/guide", useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

beforeEach(() => {
  useGuideStore.setState({ done: { "add-task": true }, panelHidden: true, dismissedHints: {}, hydrated: true });
});

describe("GuideScreen", () => {
  it("renders every section and the glossary, with one h1", () => {
    render(<GuideScreen />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    for (const s of SECTIONS) expect(document.getElementById(s.id), s.id).not.toBeNull();
    expect(document.getElementById("glossary")).not.toBeNull();
    for (const t of TERMS) expect(document.getElementById(`term-${t.id}`), t.id).not.toBeNull();
  });

  it("filters as you type and announces the result count", () => {
    render(<GuideScreen />);
    fireEvent.change(screen.getByRole("searchbox", { name: "Search the guide" }), { target: { value: "buffer" } });
    expect(document.getElementById("planning")).not.toBeNull();
    expect(document.getElementById("profile")).toBeNull();
    expect(screen.getByRole("status").textContent).toMatch(/\d+ sections?, \d+ words?/);
  });

  it("says so when nothing matches", () => {
    render(<GuideScreen />);
    fireEvent.change(screen.getByRole("searchbox", { name: "Search the guide" }), { target: { value: "qzxqzx" } });
    expect(screen.getByText(/Nothing matches/)).toBeTruthy();
  });

  it("replays Start here", () => {
    render(<GuideScreen />);
    fireEvent.click(screen.getByRole("button", { name: "Replay Start here" }));
    expect(useGuideStore.getState().panelHidden).toBe(false);
    expect(useGuideStore.getState().done).toEqual({});
  });
});
