import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TeamWorkspace } from "@/server/team";
import { AccountTeam } from "./account-team";

const workspace = (role: "owner" | "viewer" = "owner"): TeamWorkspace => ({
  revision: 1, actorId: "me", emailVerified: true, pending: [],
  state: {
    workspace: { id: "one", name: "Studio" }, viewerId: "me", invitations: [], projects: [],
    members: [{ id: "me", name: "Alex", email: "alex@example.com", role, hue: "slate", week: Array(7).fill(null) }],
    tasks: [{ id: "task1", title: "Shared task", notes: "", projectId: null, assigneeId: "me", createdBy: "me", status: "todo", priority: "medium", durationMin: 60, deadline: null, comments: [], createdAt: "2026-10-16T09:00:00Z" }],
  },
});
const response = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
afterEach(() => vi.unstubAllGlobals());

describe("account team UI", () => {
  it("shows real members and keeps viewers read-only without demo controls", async () => {
    vi.stubGlobal("fetch", vi.fn((_url: string) => response(_url === "/api/team" ? { teams: [{ id: "one", name: "Studio", role: "viewer" }] } : workspace("viewer"))));
    render(<AccountTeam />);
    expect(await screen.findByText("alex@example.com")).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Members", selected: true })).toBeTruthy();
    expect(screen.getByText("You", { exact: true })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Shared task" })).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: "Shared Tasks" }));
    fireEvent.click(await screen.findByRole("button", { name: "Shared task" }));
    expect(screen.queryByRole("button", { name: "Add shared task" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Send invitation" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Post comment" })).toBeNull();
    expect(screen.getByLabelText("Task title")).toBeDisabled();
    expect(screen.queryByText(/Act as/)).toBeNull();
  });
  it("posts revisioned task commands without a viewer or author and keeps failed edits", async () => {
    const fetcher = vi.fn((url: string, init?: RequestInit) => {
      if (init?.method === "POST") return response({ message: "This workspace changed. Refresh it before trying again." }, 409);
      return response(url === "/api/team" ? { teams: [{ id: "one", name: "Studio", role: "owner" }] } : workspace());
    });
    vi.stubGlobal("fetch", fetcher);
    render(<AccountTeam />);
    fireEvent.click(await screen.findByRole("tab", { name: "Shared Tasks" }));
    fireEvent.click(await screen.findByRole("button", { name: "Shared task" }));
    fireEvent.change(screen.getByLabelText("Task title"), { target: { value: "Updated title" } });
    fireEvent.click(screen.getByRole("button", { name: "Save task" }));
    await screen.findByRole("alert");
    expect(screen.getByLabelText("Task title")).toHaveValue("Updated title");
    const call = fetcher.mock.calls.find(([, init]) => init?.method === "POST")!;
    const posted = JSON.parse(String(call[1]!.body));
    expect(posted.revision).toBe(1);
    expect(posted.command.type).toBe("task.update");
    expect(posted.command.patch.title).toBe("Updated title");
    expect(posted).not.toHaveProperty("actorId");
    expect(posted.command.patch).not.toHaveProperty("createdBy");
    expect(screen.getByRole("button", { name: "Save task" })).toBeDisabled();
  });
  it("clears the previous workspace while a different workspace is loading", async () => {
    let resolveSecond!: (value: Response) => void;
    vi.stubGlobal("fetch", vi.fn((url: string) => url === "/api/team" ? response({ teams: [{ id: "one", name: "Studio", role: "owner" }, { id: "two", name: "Other", role: "owner" }] }) : url === "/api/team/two" ? new Promise<Response>((resolve) => { resolveSecond = resolve; }) : response(workspace())));
    render(<AccountTeam />);
    fireEvent.click(await screen.findByRole("tab", { name: "Shared Tasks" }));
    await screen.findByRole("button", { name: "Shared task" });
    fireEvent.change(screen.getByLabelText("Workspace"), { target: { value: "two" } });
    await waitFor(() => expect(screen.queryByRole("button", { name: "Shared task" })).toBeNull());
    const second = workspace();
    second.state.workspace = { id: "two", name: "Other" };
    second.state.tasks = [];
    resolveSecond(await response(second));
    await screen.findByRole("heading", { name: "Other" });
    expect(screen.queryByRole("button", { name: "Shared task" })).toBeNull();
  });
  it("shows accurate team statistics and reveals projects and workspace editing on demand", async () => {
    const data = workspace();
    data.state.projects = [{ id: "project1", name: "Launch", hue: "blue" }];
    data.state.tasks.push({ ...data.state.tasks[0]!, id: "task2", title: "Finished task", status: "done" });
    data.pending = [{ id: "invite1", email: "next@example.com", role: "member" }];
    vi.stubGlobal("fetch", vi.fn((url: string) => response(url === "/api/team" ? { teams: [{ id: "one", name: "Studio", role: "owner" }] } : data)));
    render(<AccountTeam />);
    const stats = await screen.findByRole("complementary", { name: "Team stats" });
    for (const label of ["Members", "Projects", "Open tasks", "Completed tasks"]) {
      expect(within(stats).getByText(label).parentElement).toHaveTextContent(`${label}1`);
    }
    expect(within(stats).getByText("Pending invitations").parentElement).toHaveTextContent("Pending invitations1");
    const workspaceDisclosure = screen.getByText("Workspace details", { exact: true });
    expect(workspaceDisclosure.closest("details")).not.toHaveAttribute("open");
    fireEvent.click(workspaceDisclosure);
    expect(workspaceDisclosure.closest("details")).toHaveAttribute("open");
    expect(screen.getByRole("textbox", { name: "Workspace name" })).toHaveValue("Studio");
    expect(screen.queryByRole("textbox", { name: "New project name" })).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: "Projects" }));
    expect(await screen.findByRole("textbox", { name: "New project name" })).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Project name: Launch" })).toHaveValue("Launch");
    expect(screen.queryByText(/online|last active/i)).toBeNull();
  });
});
