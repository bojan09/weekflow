import axe from "axe-core";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HelpPanel } from "@/components/guide/help-panel";
import { StartHere } from "@/components/guide/start-here";
import { PlanDialog } from "@/components/plan/plan-dialog";
import { Faq, Features, HowItWorks, Roadmap } from "@/components/site/sections";
import { SiteFooter } from "@/components/site/site-footer";
import { OrganizeDialog } from "@/components/tasks/organize-dialog";
import { seedTeam, teamCollection } from "@/data/team";
import { useGuideStore } from "@/guide/store";
import { GuideScreen } from "@/screens/guide/guide-screen";
import { ReviewScreen } from "@/screens/review/review-screen";
import { TeamScreen } from "@/screens/team/team-screen";
import { useUiStore } from "@/stores/ui";

vi.mock("next/navigation", () => ({ usePathname: () => "/demo/week", useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

/**
 * Structure and semantics, in jsdom. Colour contrast and layout are checked in
 * a real browser (see docs/AUDIT-0.0.9.md), because jsdom cannot compute them.
 * "region" is off because these tests render a single component, not a page.
 */
async function violations(node: Element = document.body): Promise<string[]> {
  const result = await axe.run(node, {
    rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
    resultTypes: ["violations"],
  });
  return result.violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`);
}

beforeEach(() => {
  act(() => {
    teamCollection.write(seedTeam());
    useGuideStore.setState({ done: {}, panelHidden: false, dismissedHints: {}, hydrated: true });
    useUiStore.setState({ helpOpen: false, planOpen: false, organizeOpen: false });
  });
});

describe("accessibility: no structural violations", () => {
  it("the Guide page", async () => {
    render(<GuideScreen />);
    expect(await violations()).toEqual([]);
  });

  it("the Start here panel", async () => {
    render(<StartHere />);
    expect(await violations()).toEqual([]);
  });

  it("the weekly review", async () => {
    render(<ReviewScreen />);
    await screen.findByRole("heading", { name: /Weekly review/ });
    expect(await violations()).toEqual([]);
  });

  it("every Team tab", async () => {
    render(<TeamScreen />);
    await screen.findByText(/A preview on sample data/);
    expect(await violations()).toEqual([]);
    for (const name of ["People", "Availability"]) {
      fireEvent.click(screen.getByRole("radio", { name }));
      expect(await violations(), name).toEqual([]);
    }
  });

  it("the public landing sections and footer", async () => {
    render(
      <>
        <HowItWorks />
        <Features />
        <Roadmap />
        <Faq />
        <SiteFooter />
      </>,
    );
    expect(await violations()).toEqual([]);
  });

  it("the help panel, plan preview and organize dialog when open", async () => {
    render(
      <>
        <HelpPanel />
        <PlanDialog />
        <OrganizeDialog />
      </>,
    );
    act(() => useUiStore.getState().setHelpOpen(true));
    expect(await violations()).toEqual([]);
    act(() => useUiStore.getState().setHelpOpen(false));
    act(() => useUiStore.getState().setPlanOpen(true));
    expect(await violations()).toEqual([]);
    act(() => useUiStore.getState().setPlanOpen(false));
    act(() => useUiStore.getState().setOrganizeOpen(true));
    expect(await violations()).toEqual([]);
  });
});
