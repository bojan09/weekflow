import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Term } from "./term";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe("Term", () => {
  it("is a labelled button that explains the word on click", () => {
    render(<Term id="buffer" />);
    const button = screen.getByRole("button", { name: "What is Buffer?" });
    expect(screen.queryByText(/gap Weekflow keeps/)).toBeNull();
    fireEvent.click(button);
    expect(screen.getByText(/gap Weekflow keeps/)).toBeTruthy();
    expect(screen.getByRole("link", { name: /More in the Guide/ }).getAttribute("href")).toBe("/demo/guide#term-buffer");
  });

  it("links to the related setting when there is one", () => {
    render(<Term id="stability" />);
    fireEvent.click(screen.getByRole("button", { name: "What is Stability?" }));
    expect(screen.getByRole("link", { name: /Scheduling engine/ }).getAttribute("href")).toBe("/demo/settings/engine");
  });
});
