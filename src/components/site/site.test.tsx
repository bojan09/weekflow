import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RELEASES } from "@/generated/version";
import { LANDING_SECTION_IDS, SITE_LINKS } from "@/lib/site";
import { Faq, Features, HowItWorks, Panel, Roadmap } from "./sections";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe("site navigation", () => {
  it("every anchor link points at a known landing section", () => {
    const anchors = SITE_LINKS.filter((l) => l.href.startsWith("/#")).map((l) => l.href.slice(2));
    for (const id of anchors) expect(LANDING_SECTION_IDS as readonly string[]).toContain(id);
  });

  it("the landing sections render the ids the links expect", () => {
    render(
      <>
        <HowItWorks />
        <Features />
        <Panel id="customize" title="Make it yours">
          x
        </Panel>
        <Roadmap />
        <Faq />
      </>,
    );
    for (const id of LANDING_SECTION_IDS) expect(document.getElementById(id), id).not.toBeNull();
  });

  it("never mentions the tech stack in release notes", () => {
    const text = JSON.stringify(RELEASES);
    for (const word of ["Next.js", "Appwrite", "Tailwind", "shadcn", "Zustand", "Vercel"]) {
      expect(text).not.toContain(word);
    }
  });

  it("never mentions the tech stack", () => {
    const { container } = render(
      <>
        <SiteHeader />
        <HowItWorks />
        <Features />
        <Roadmap />
        <Faq />
        <SiteFooter />
      </>,
    );
    const text = container.textContent ?? "";
    for (const word of ["Next.js", "Appwrite", "Tailwind", "shadcn", "Zustand"]) {
      expect(text).not.toContain(word);
    }
  });

  it("marks features that are not built yet as coming soon", () => {
    render(<Features />);
    expect(screen.getAllByText("Coming soon").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Available now").length).toBeGreaterThan(0);
  });
});

describe("site header", () => {
  it("opens the mobile menu with every link and a call to action", () => {
    render(<SiteHeader />);
    const button = screen.getByRole("button", { name: "Open menu" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(button);
    const nav = screen.getByRole("navigation", { name: "Mobile" });
    for (const link of SITE_LINKS) expect(nav).toHaveTextContent(link.label);
    expect(screen.getByRole("button", { name: "Close menu" })).toBeInTheDocument();
  });
});

describe("site footer", () => {
  it("lists navigation and the free-forever promise", () => {
    render(<SiteFooter />);
    expect(screen.getByRole("navigation", { name: "Product" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Project" })).toBeInTheDocument();
    expect(screen.getByText(/Free forever/)).toBeInTheDocument();
  });
});
