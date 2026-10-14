import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { seedTeam, teamCollection } from "@/data/team";
import { TeamScreen } from "./team-screen";

vi.mock("next/navigation", () => ({ usePathname: () => "/demo/team", useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const actAs = (id: string): void => {
  act(() => teamCollection.write({ ...teamCollection.getSnapshot(), viewerId: id }));
};

beforeEach(() => {
  act(() => teamCollection.write(seedTeam()));
});

describe("TeamScreen", () => {
  it("says it is a preview and shows what your role can do", async () => {
    render(<TeamScreen />);
    expect(await screen.findByText(/A preview on sample data/)).toBeTruthy();
    expect(screen.getByText(/Everything, including deleting the workspace/)).toBeTruthy();
  });

  it("an owner can add a task and assign it to anyone", async () => {
    render(<TeamScreen />);
    fireEvent.change(await screen.findByLabelText("New team task title"), { target: { value: "Plan the offsite" } });
    fireEvent.change(screen.getByLabelText("Assign to"), { target: { value: "m-lena" } });
    fireEvent.click(screen.getByRole("button", { name: /Add task/ }));
    const added = teamCollection.getSnapshot().tasks.at(-1);
    expect(added).toMatchObject({ title: "Plan the offsite", assigneeId: "m-lena", createdBy: "m-sam" });
  });

  it("a viewer can read but gets no way to add tasks", async () => {
    actAs("m-tom");
    render(<TeamScreen />);
    expect(await screen.findByText(/Viewers can read tasks but not add or change them/)).toBeTruthy();
    expect(screen.queryByLabelText("New team task title")).toBeNull();
  });

  it("a member can only assign tasks to themselves", async () => {
    actAs("m-marco");
    render(<TeamScreen />);
    const assign = await screen.findByLabelText("Assign to");
    const options = within(assign).getAllByRole("option").map((o) => o.textContent);
    expect(options).toEqual(["Unassigned", "Marco Díaz (you)"]);
  });

  it("People tab: an admin cannot change the owner, and the last-owner rule holds", async () => {
    actAs("m-priya");
    render(<TeamScreen />);
    fireEvent.click(await screen.findByRole("radio", { name: "People" }));
    expect(screen.queryByLabelText("Role of Sam Rivera")).toBeNull(); // owner: badge only
    expect(screen.getByLabelText("Role of Marco Díaz")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Remove Sam Rivera" })).toBeNull();
  });

  it("People tab: invite validates, then saves a pending invitation", async () => {
    render(<TeamScreen />);
    fireEvent.click(await screen.findByRole("radio", { name: "People" }));
    fireEvent.change(screen.getByLabelText("Email to invite"), { target: { value: "nope" } });
    fireEvent.click(screen.getByRole("button", { name: /Invite/ }));
    expect(teamCollection.getSnapshot().invitations).toHaveLength(1);
    fireEvent.change(screen.getByLabelText("Email to invite"), { target: { value: "new.person@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /Invite/ }));
    expect(teamCollection.getSnapshot().invitations.map((i) => i.email)).toContain("new.person@example.com");
  });

  it("Availability tab: shows shared hours, the overlap row and workload in text", async () => {
    render(<TeamScreen />);
    fireEvent.click(await screen.findByRole("radio", { name: "Availability" }));
    expect(screen.getByRole("table")).toBeTruthy();
    expect(screen.getByText("Everyone overlaps")).toBeTruthy();
    expect(screen.getByText(/Personal tasks and calendars stay private/)).toBeTruthy();
    expect(screen.getAllByText(/Room to spare|Nearly full|Over capacity/).length).toBeGreaterThan(0);
  });

  it("opening a task shows its comments; a viewer cannot write one", async () => {
    actAs("m-tom");
    render(<TeamScreen />);
    fireEvent.click(await screen.findByRole("button", { name: /Write the launch announcement/ }));
    expect(await screen.findByText(/Keep it under 300 words/)).toBeTruthy();
    expect(screen.getByText(/Viewers can read comments but not write them/)).toBeTruthy();
    expect(screen.queryByLabelText("Write a comment")).toBeNull();
  });

  it("a member can comment on a task", async () => {
    actAs("m-lena");
    render(<TeamScreen />);
    fireEvent.click(await screen.findByRole("button", { name: /Write the launch announcement/ }));
    fireEvent.change(await screen.findByLabelText("Write a comment"), { target: { value: "On it" } });
    fireEvent.click(screen.getByRole("button", { name: "Comment" }));
    expect(teamCollection.getSnapshot().tasks[0]?.comments.at(-1)).toMatchObject({ authorId: "m-lena", text: "On it" });
  });
});
