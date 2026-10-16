import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TeamState } from "@/domain/team/types";

vi.mock("server-only", () => ({}));
const sdk = vi.hoisted(() => ({ requireUser: vi.fn(), adminServices: vi.fn() }));
vi.mock("./appwrite", () => ({ ...sdk, DATABASE_ID: "weekflow" }));
import { applyTeamCommand, getTeamWorkspace, runTeamCommand, inviteTeamMember, acceptTeamInvitation, leaveTeamForAccountDeletion, createTeamWorkspace, listTeamWorkspaces } from "./team";

const member = (id: string, role: "owner" | "admin" | "member" | "viewer") => ({ id, name: id, email: `${id}@example.com`, role, hue: "blue" as const, week: Array(7).fill(null) });
const state = (): TeamState => ({ workspace: { id: "team1", name: "Real team" }, viewerId: "owner", members: [member("owner", "owner"), member("admin", "admin"), member("writer", "member"), member("reader", "viewer")], invitations: [], projects: [], tasks: [] });

describe("server team commands", () => {
  it("uses the authenticated actor, never the state's viewer", () => {
    expect(() => applyTeamCommand(state(), "reader", { type: "task.add", input: { title: "Spoof" } })).toThrow(/Viewers/);
    expect(() => applyTeamCommand(state(), "outsider", { type: "task.add", input: { title: "Spoof" } })).toThrow(/member/);
    expect(() => applyTeamCommand(state(), "reader", { type: "task.add", input: { title: "Spoof" }, actorId: "owner" })).toThrow();
  });
  it("enforces member ownership and assignment independently of posted fields", () => {
    const created = applyTeamCommand(state(), "writer", { type: "task.add", input: { title: "Work", assigneeId: "writer" } });
    const task = created.tasks[0]!;
    expect(task.createdBy).toBe("writer");
    expect(() => applyTeamCommand(created, "writer", { type: "task.update", taskId: task.id, patch: { assigneeId: "owner" } })).toThrow(/themselves/);
    expect(() => applyTeamCommand(created, "reader", { type: "task.update", taskId: task.id, patch: { status: "done" } })).toThrow(/Viewers/);
    expect(() => applyTeamCommand(created, "writer", { type: "task.delete", taskId: task.id })).toThrow(/owners and admins/);
    expect(() => applyTeamCommand(created, "writer", { type: "task.update", taskId: task.id, patch: { createdBy: "owner" } })).toThrow();
    expect(applyTeamCommand(created, "admin", { type: "task.delete", taskId: task.id }).tasks).toEqual([]);
  });
  it("validates project references, edits and deletion without touching personal time", () => {
    expect(() => applyTeamCommand(state(), "writer", { type: "project.add", name: "No", hue: "blue" })).toThrow(/owners and admins/);
    let next = applyTeamCommand(state(), "admin", { type: "project.add", name: "Launch", hue: "blue" });
    const projectId = next.projects[0]!.id;
    next = applyTeamCommand(next, "admin", { type: "project.update", projectId, name: "Release", hue: "teal" });
    next = applyTeamCommand(next, "writer", { type: "task.add", input: { title: "Work", projectId } });
    expect(next.projects[0]!.name).toBe("Release");
    expect(() => applyTeamCommand(next, "writer", { type: "task.add", input: { title: "Bad", projectId: "missing" } })).toThrow(/project/);
    expect(() => applyTeamCommand(next, "writer", { type: "task.add", input: { title: "Bad", assigneeId: "missing" } })).toThrow(/workspace/);
    expect(() => applyTeamCommand(next, "admin", { type: "task.update", taskId: next.tasks[0]!.id, patch: { placement: { startMin: 0 }, locked: false } })).toThrow();
    next = applyTeamCommand(next, "admin", { type: "project.delete", projectId });
    expect(next.projects).toEqual([]);
    expect(next.tasks[0]!.projectId).toBeNull();
  });
  it("derives comment authors and checks deletion roles", () => {
    let next = applyTeamCommand(state(), "writer", { type: "task.add", input: { title: "Work" } });
    const taskId = next.tasks[0]!.id;
    next = applyTeamCommand(next, "writer", { type: "comment.add", taskId, text: "Ready" });
    const comment = next.tasks[0]!.comments[0]!;
    expect(comment.authorId).toBe("writer");
    expect(() => applyTeamCommand(next, "reader", { type: "comment.add", taskId, text: "No" })).toThrow(/Viewers/);
    expect(() => applyTeamCommand(next, "reader", { type: "comment.delete", taskId, commentId: comment.id })).toThrow(/own comments/);
    expect(applyTeamCommand(next, "writer", { type: "comment.delete", taskId, commentId: comment.id }).tasks[0]!.comments).toEqual([]);
  });
  it("updates every editable task field while preserving immutable authors and comments", () => {
    let next = applyTeamCommand(state(), "admin", { type: "project.add", name: "Release", hue: "teal" });
    next = applyTeamCommand(next, "writer", { type: "task.add", input: { title: "Draft" } });
    const taskId = next.tasks[0]!.id;
    const createdAt = next.tasks[0]!.createdAt;
    next = applyTeamCommand(next, "writer", { type: "comment.add", taskId, text: "First draft" });
    next = applyTeamCommand(next, "writer", { type: "task.update", taskId, patch: { title: "Final", notes: "Approved", priority: "high", durationMin: 90, deadline: "2026-10-30", status: "doing", projectId: next.projects[0]!.id, assigneeId: "writer" } });
    expect(next.tasks[0]).toMatchObject({ title: "Final", notes: "Approved", priority: "high", durationMin: 90, deadline: "2026-10-30", status: "doing", assigneeId: "writer", createdBy: "writer", createdAt });
    expect(next.tasks[0]!.comments[0]!.text).toBe("First draft");
    expect(() => applyTeamCommand(next, "writer", { type: "task.update", taskId, patch: { deadline: "2026-02-30" } })).toThrow();
  });
});

describe("real membership and revision boundary", () => {
  let memberships: Array<Record<string, unknown>>;
  let stored: { revision: number; state: { projects: unknown[]; tasks: unknown[]; membershipLease: null | { id: string; until: number } } };
  let tables: Record<string, ReturnType<typeof vi.fn>>;
  let teams: Record<string, ReturnType<typeof vi.fn>>;
  let sessionTeams: Record<string, ReturnType<typeof vi.fn>>;
  beforeEach(() => {
    vi.clearAllMocks();
    memberships = state().members.map((m) => ({ $id: `membership-${m.id}`, userId: m.id, userName: m.name, userEmail: m.email, roles: [m.role], confirm: true, invited: "2026-10-16", joined: "2026-10-16" }));
    stored = { revision: 4, state: { projects: [], tasks: [], membershipLease: null } };
    let staged = structuredClone(stored);
    tables = {
      getRow: vi.fn(async ({ transactionId }: { transactionId?: string }) => ({ ownerId: "owner", data: JSON.stringify(transactionId ? staged : stored) })),
      createTransaction: vi.fn(async () => { staged = structuredClone(stored); return { $id: "tx" }; }),
      updateRow: vi.fn(async ({ data }: { data?: { data?: string } }) => { if (data?.data) staged = JSON.parse(data.data); return {}; }),
      updateTransaction: vi.fn(async ({ commit }: { commit?: boolean }) => { if (commit) stored = structuredClone(staged); return {}; }),
    };
    teams = {
      get: vi.fn(async () => ({ $id: "team1", name: "Real team" })),
      listMemberships: vi.fn(async () => ({ memberships, total: memberships.length })),
      updateMembership: vi.fn(async () => ({})), deleteMembership: vi.fn(async () => ({})),
    };
    sessionTeams = { createMembership: vi.fn(async () => ({ $id: "pending", confirm: false })), updateMembershipStatus: vi.fn(async () => ({})) };
    sdk.adminServices.mockReturnValue({ teams, tables });
    sdk.requireUser.mockResolvedValue({ user: { $id: "writer", emailVerification: true }, teams: sessionTeams });
  });
  it("rejects a pending or absent membership even if stored state claims owner", async () => {
    memberships.find((m) => m.userId === "writer")!.confirm = false;
    await expect(getTeamWorkspace("team1")).rejects.toMatchObject({ status: 403 });
    memberships = memberships.filter((m) => m.userId !== "writer");
    await expect(getTeamWorkspace("team1")).rejects.toMatchObject({ status: 403 });
  });
  it("rejects stale revisions and propagates commit conflicts with no success", async () => {
    await expect(runTeamCommand("team1", { revision: 3, command: { type: "task.add", input: { title: "Old" } } })).rejects.toMatchObject({ status: 409 });
    expect(stored.revision).toBe(4);
    tables.updateTransaction.mockImplementation(async ({ commit }) => { if (commit) throw Object.assign(new Error("conflict"), { code: 409 }); return {}; });
    await expect(runTeamCommand("team1", { revision: 4, command: { type: "task.add", input: { title: "New" } } })).rejects.toMatchObject({ status: 409 });
    expect(stored.state.tasks).toEqual([]);
  });
  it("persists only server-derived task authors and increments the revision", async () => {
    const next = await runTeamCommand("team1", { revision: 4, command: { type: "task.add", input: { title: "Shared" } } });
    expect(next.revision).toBe(5);
    expect(next.state.tasks[0]!.createdBy).toBe("writer");
    expect(stored.state.tasks).toHaveLength(1);
    expect(tables.updateRow.mock.calls[0]![0].data).toEqual({ ownerId: "owner" });
    const transactionalRead = tables.getRow.mock.calls.findIndex(([args]) => args.transactionId === "tx");
    expect(transactionalRead).toBeGreaterThanOrEqual(0);
    expect(tables.updateRow.mock.invocationCallOrder[0]).toBeLessThan(tables.getRow.mock.invocationCallOrder[transactionalRead]!);
  });
  it("blocks viewers at the service boundary and serializes membership changes", async () => {
    sdk.requireUser.mockResolvedValue({ user: { $id: "reader", emailVerification: true }, teams: sessionTeams });
    await expect(runTeamCommand("team1", { revision: 4, command: { type: "project.add", name: "No", hue: "blue" } })).rejects.toMatchObject({ status: 403 });
    stored.state.membershipLease = { id: "other", until: Date.now() + 60_000 };
    await expect(runTeamCommand("team1", { revision: 4, command: { type: "member.remove", memberId: "owner" } })).rejects.toMatchObject({ status: 409 });
    expect(teams.deleteMembership).not.toHaveBeenCalled();
  });
  it("admins cannot promote owners or remove owners, and the sole owner cannot be removed", async () => {
    sdk.requireUser.mockResolvedValue({ user: { $id: "admin", emailVerification: true }, teams: sessionTeams });
    await expect(runTeamCommand("team1", { revision: 4, command: { type: "member.role", memberId: "writer", role: "owner" } })).rejects.toMatchObject({ status: 403 });
    await expect(runTeamCommand("team1", { revision: stored.revision, command: { type: "member.remove", memberId: "owner" } })).rejects.toMatchObject({ status: 403 });
    expect(teams.updateMembership).not.toHaveBeenCalled();
    expect(teams.deleteMembership).not.toHaveBeenCalled();
  });
  it("allows owners to promote a successor, while rejecting self-removal and self-demotion", async () => {
    sdk.requireUser.mockResolvedValue({ user: { $id: "owner", emailVerification: true }, teams: sessionTeams });
    await runTeamCommand("team1", { revision: 4, command: { type: "member.role", memberId: "writer", role: "owner" } });
    expect(teams.updateMembership).toHaveBeenCalledWith({ teamId: "team1", membershipId: "membership-writer", roles: ["owner"] });
    await expect(runTeamCommand("team1", { revision: stored.revision, command: { type: "member.role", memberId: "owner", role: "member" } })).rejects.toMatchObject({ status: 403 });
    await expect(runTeamCommand("team1", { revision: stored.revision, command: { type: "member.remove", memberId: "owner" } })).rejects.toMatchObject({ status: 403 });
    expect(teams.deleteMembership).not.toHaveBeenCalled();
  });
  it("requires verified owners and a session-based email invitation", async () => {
    sdk.requireUser.mockResolvedValue({ user: { $id: "owner", emailVerification: false }, teams: sessionTeams });
    await expect(inviteTeamMember("team1", { revision: 4, email: "new@example.com", role: "member" }, "https://weekflow-ashy.vercel.app")).rejects.toMatchObject({ status: 403 });
    expect(sessionTeams.createMembership).not.toHaveBeenCalled();
    sdk.requireUser.mockResolvedValue({ user: { $id: "owner", emailVerification: true }, teams: sessionTeams });
    await inviteTeamMember("team1", { revision: stored.revision, email: "new@example.com", role: "member" }, "https://weekflow-ashy.vercel.app");
    expect(sessionTeams.createMembership).toHaveBeenCalledWith(expect.objectContaining({ teamId: "team1", email: "new@example.com", roles: ["member"], url: "https://weekflow-ashy.vercel.app/accept-invitation" }));
  });
  it("requires the invitation user to match the session before accepting the secret", async () => {
    await expect(acceptTeamInvitation({ teamId: "team1", membershipId: "pending", userId: "owner", secret: "one-time-secret" })).rejects.toMatchObject({ status: 403 });
    expect(sessionTeams.updateMembershipStatus).not.toHaveBeenCalled();
    const pending = memberships.find((member) => member.userId === "writer")!;
    pending.$id = "pending";
    pending.confirm = false;
    await acceptTeamInvitation({ teamId: "team1", membershipId: "pending", userId: "writer", secret: "one-time-secret" });
    expect(sessionTeams.updateMembershipStatus).toHaveBeenCalledWith({ teamId: "team1", membershipId: "pending", userId: "writer", secret: "one-time-secret" });
  });
  it("leaves for account deletion only after another confirmed owner exists", async () => {
    sdk.requireUser.mockResolvedValue({ user: { $id: "owner", emailVerification: true }, teams: sessionTeams });
    sessionTeams.deleteMembership = vi.fn(async () => ({}));
    await expect(leaveTeamForAccountDeletion("team1")).rejects.toMatchObject({ status: 409 });
    expect(sessionTeams.deleteMembership).not.toHaveBeenCalled();
    memberships.find((m) => m.userId === "admin")!.roles = ["owner"];
    await expect(leaveTeamForAccountDeletion("team1")).resolves.toEqual({ left: true });
    expect(sessionTeams.deleteMembership).toHaveBeenCalledWith({ teamId: "team1", membershipId: "membership-owner" });
    expect(stored.state.membershipLease).toBeNull();
  });
  it("does not leave a sole-owner workspace or count pending owners as successors", async () => {
    sdk.requireUser.mockResolvedValue({ user: { $id: "owner", emailVerification: true }, teams: sessionTeams });
    sessionTeams.deleteMembership = vi.fn(async () => ({}));
    memberships = memberships.filter((m) => m.userId === "owner");
    await expect(leaveTeamForAccountDeletion("team1")).resolves.toEqual({ left: false });
    memberships.push({ ...memberships[0], $id: "pending-owner", userId: "successor", roles: ["owner"], confirm: false });
    await expect(leaveTeamForAccountDeletion("team1")).resolves.toEqual({ left: false });
    expect(sessionTeams.deleteMembership).not.toHaveBeenCalled();
  });
  it("lists session workspaces and creates a row with team read but no write permissions", async () => {
    sdk.requireUser.mockResolvedValue({ user: { $id: "owner", emailVerification: true }, teams: sessionTeams });
    sessionTeams.list = vi.fn(async () => ({ teams: [{ $id: "team1", name: "Real team" }], total: 1 }));
    await expect(listTeamWorkspaces()).resolves.toEqual({ teams: [{ id: "team1", name: "Real team", role: "owner" }] });
    sessionTeams.create = vi.fn(async () => ({ $id: "team1", name: "New team" }));
    tables.createRow = vi.fn(async () => ({}));
    await createTeamWorkspace({ name: "New team" });
    const created = tables.createRow.mock.calls[0]![0];
    expect(created.rowId).toBe("team1");
    expect(created.permissions).toEqual(['read("team:team1")']);
    expect(created.data.ownerId).toBe("owner");
    expect(JSON.parse(created.data.data)).toMatchObject({ revision: 0, state: { projects: [], tasks: [] } });
  });
  it("rolls back an uninitialized team when its shared row cannot be created", async () => {
    sessionTeams.create = vi.fn(async () => ({ $id: "team1", name: "New team" }));
    sessionTeams.delete = vi.fn(async () => ({}));
    tables.createRow = vi.fn(async () => { throw new Error("unavailable"); });
    await expect(createTeamWorkspace({ name: "New team" })).rejects.toThrow("unavailable");
    expect(sessionTeams.delete).toHaveBeenCalledWith({ teamId: "team1" });
  });
});
