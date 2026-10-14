import { describe, expect, it } from "vitest";
import { seedTeam } from "@/data/team";
import { commonWindow, weeklyCapacityMin, workloadOf } from "./availability";
import * as ops from "./ops";
import { can, canAssign, canChangeRole, canCommentDelete, canEditTask, canRemoveMember, type Action } from "./permissions";
import { ROLES, teamStateSchema, type Member, type Role, type TeamState } from "./types";

const base = (): TeamState => seedTeam();
const member = (state: TeamState, id: string): Member => state.members.find((m) => m.id === id)!;
const NOW = "2026-10-14T10:00:00.000Z";

const ok = (r: ops.Result): TeamState => {
  if (!r.ok) throw new Error(`expected ok, got: ${r.reason}`);
  return r.state;
};
const refused = (r: ops.Result): string => {
  if (r.ok) throw new Error("expected a refusal");
  return r.reason;
};

describe("seed", () => {
  it("is valid and has one person per role", () => {
    const state = base();
    expect(teamStateSchema.safeParse(state).success).toBe(true);
    expect(new Set(state.members.map((m) => m.role))).toEqual(new Set(ROLES));
  });
});

describe("permission matrix", () => {
  const expected: Record<Role, Action[]> = {
    owner: [
      "workspace.rename", "workspace.delete", "member.invite", "member.remove", "member.changeRole", "project.manage",
      "task.create", "task.editAny", "task.editOwn", "task.assignAny", "task.deleteAny", "comment.create", "comment.deleteAny", "comment.deleteOwn",
    ],
    admin: [
      "workspace.rename", "member.invite", "member.remove", "member.changeRole", "project.manage",
      "task.create", "task.editAny", "task.editOwn", "task.assignAny", "task.deleteAny", "comment.create", "comment.deleteAny", "comment.deleteOwn",
    ],
    member: ["task.create", "task.editOwn", "comment.create", "comment.deleteOwn"],
    viewer: [],
  };

  for (const role of ROLES) {
    it(`${role} can do exactly what the table says`, () => {
      const all: Action[] = [...new Set(Object.values(expected).flat())];
      for (const action of all) expect(can(role, action), `${role}:${action}`).toBe(expected[role].includes(action));
    });
  }

  it("lets members edit only their own or assigned tasks", () => {
    expect(canEditTask("member", { createdBy: "a", assigneeId: null }, "a").ok).toBe(true);
    expect(canEditTask("member", { createdBy: "b", assigneeId: "a" }, "a").ok).toBe(true);
    expect(canEditTask("member", { createdBy: "b", assigneeId: "c" }, "a").ok).toBe(false);
    expect(canEditTask("viewer", { createdBy: "a", assigneeId: "a" }, "a").ok).toBe(false);
    expect(canEditTask("admin", { createdBy: "b", assigneeId: "c" }, "a").ok).toBe(true);
  });

  it("lets members assign only themselves", () => {
    expect(canAssign("member", "a", "a").ok).toBe(true);
    expect(canAssign("member", "a", null).ok).toBe(true);
    expect(canAssign("member", "a", "b").ok).toBe(false);
    expect(canAssign("admin", "a", "b").ok).toBe(true);
    expect(canAssign("viewer", "a", "a").ok).toBe(false);
  });

  it("lets members delete only their own comments", () => {
    expect(canCommentDelete("member", { authorId: "a" }, "a").ok).toBe(true);
    expect(canCommentDelete("member", { authorId: "b" }, "a").ok).toBe(false);
    expect(canCommentDelete("admin", { authorId: "b" }, "a").ok).toBe(true);
    expect(canCommentDelete("viewer", { authorId: "a" }, "a").ok).toBe(false);
  });
});

describe("roles and people", () => {
  it("an owner changes a role; the original state is untouched", () => {
    const state = base();
    const next = ok(ops.changeRole(state, "m-sam", "m-marco", "admin"));
    expect(member(next, "m-marco").role).toBe("admin");
    expect(member(state, "m-marco").role).toBe("member");
  });

  it("nobody changes their own role", () => {
    expect(refused(ops.changeRole(base(), "m-sam", "m-sam", "admin"))).toMatch(/own role/);
  });

  it("an admin cannot touch owners or make owners", () => {
    const s = base();
    expect(refused(ops.changeRole(s, "m-priya", "m-sam", "member"))).toMatch(/owner/i);
    expect(refused(ops.changeRole(s, "m-priya", "m-marco", "owner"))).toMatch(/owner/i);
    expect(refused(ops.removeMember(s, "m-priya", "m-sam"))).toMatch(/owner/i);
  });

  it("the last owner cannot be demoted or removed", () => {
    const s = base();
    // Make Priya an owner, then she (an owner) tries to remove the only other owner after Sam is demoted.
    const twoOwners = ok(ops.changeRole(s, "m-sam", "m-priya", "owner"));
    const oneOwner = ok(ops.changeRole(twoOwners, "m-priya", "m-sam", "admin"));
    expect(member(oneOwner, "m-priya").role).toBe("owner");
    expect(refused(ops.changeRole(oneOwner, "m-sam", "m-priya", "member"))).toMatch(/owner/i);
    expect(canChangeRole(member(oneOwner, "m-sam"), member(oneOwner, "m-priya"), "member", oneOwner.members).ok).toBe(false);
    expect(canRemoveMember(member(oneOwner, "m-sam"), member(oneOwner, "m-priya"), oneOwner.members).ok).toBe(false);
  });

  it("members and viewers cannot manage people", () => {
    const s = base();
    expect(ops.changeRole(s, "m-marco", "m-lena", "admin").ok).toBe(false);
    expect(ops.removeMember(s, "m-tom", "m-lena").ok).toBe(false);
    expect(ops.inviteMember(s, "m-marco", "x@example.com", "member", "i", NOW).ok).toBe(false);
  });

  it("removing a person keeps their tasks, unassigned", () => {
    const next = ok(ops.removeMember(base(), "m-sam", "m-marco"));
    expect(next.members.some((m) => m.id === "m-marco")).toBe(false);
    expect(next.tasks.find((t) => t.id === "tt-1")?.assigneeId).toBeNull();
    expect(next.tasks).toHaveLength(base().tasks.length);
  });

  it("you cannot remove yourself", () => {
    expect(refused(ops.removeMember(base(), "m-sam", "m-sam"))).toMatch(/yourself/);
  });
});

describe("invitations", () => {
  it("validates, de-duplicates and cancels", () => {
    const s = base();
    expect(refused(ops.inviteMember(s, "m-sam", "not-an-email", "member", "i", NOW))).toMatch(/valid email/);
    expect(refused(ops.inviteMember(s, "m-sam", "SAM.RIVERA@example.com", "member", "i", NOW))).toMatch(/already in/);
    expect(refused(ops.inviteMember(s, "m-sam", "alex.novak@example.com", "member", "i", NOW))).toMatch(/already been invited/);
    const next = ok(ops.inviteMember(s, "m-priya", "new@example.com", "viewer", "inv-2", NOW));
    expect(next.invitations.at(-1)).toMatchObject({ email: "new@example.com", role: "viewer", invitedBy: "m-priya" });
    expect(ok(ops.cancelInvitation(next, "m-sam", "inv-2")).invitations).toHaveLength(1);
    expect(ops.cancelInvitation(next, "m-marco", "inv-2").ok).toBe(false);
  });
});

describe("tasks", () => {
  it("a viewer cannot create, edit, delete or comment", () => {
    const s = base();
    expect(ops.addTask(s, "m-tom", { title: "x" }, "n", NOW).ok).toBe(false);
    expect(ops.updateTask(s, "m-tom", "tt-1", { title: "x" }).ok).toBe(false);
    expect(ops.deleteTask(s, "m-tom", "tt-1").ok).toBe(false);
    expect(ops.addComment(s, "m-tom", "tt-1", "hi", "c", NOW).ok).toBe(false);
  });

  it("a member creates tasks, but only assigns themselves", () => {
    const s = base();
    expect(ok(ops.addTask(s, "m-marco", { title: "  Mine  ", assigneeId: "m-marco" }, "n1", NOW)).tasks.at(-1)).toMatchObject({ title: "Mine", createdBy: "m-marco", assigneeId: "m-marco" });
    expect(refused(ops.addTask(s, "m-marco", { title: "x", assigneeId: "m-lena" }, "n2", NOW))).toMatch(/themselves/);
    expect(refused(ops.addTask(s, "m-marco", { title: "   " }, "n3", NOW))).toMatch(/title/);
  });

  it("a member edits their assigned task and moves its status, but not someone else's", () => {
    const s = base();
    expect(ok(ops.setStatus(s, "m-marco", "tt-1", "done")).tasks.find((t) => t.id === "tt-1")?.status).toBe("done");
    expect(refused(ops.setStatus(s, "m-marco", "tt-3", "done"))).toMatch(/created or are assigned/);
  });

  it("a member cannot hand their task to someone else, an admin can", () => {
    const s = base();
    expect(refused(ops.updateTask(s, "m-marco", "tt-1", { assigneeId: "m-lena" }))).toMatch(/themselves/);
    expect(ok(ops.updateTask(s, "m-priya", "tt-1", { assigneeId: "m-lena" })).tasks.find((t) => t.id === "tt-1")?.assigneeId).toBe("m-lena");
    expect(refused(ops.updateTask(s, "m-priya", "tt-1", { assigneeId: "ghost" }))).toMatch(/not in the workspace/);
  });

  it("only owners and admins delete tasks", () => {
    const s = base();
    expect(ops.deleteTask(s, "m-marco", "tt-1").ok).toBe(false);
    expect(ok(ops.deleteTask(s, "m-priya", "tt-1")).tasks.some((t) => t.id === "tt-1")).toBe(false);
  });

  it("projects: managed by owners and admins, deleting keeps tasks", () => {
    const s = base();
    expect(ops.addProject(s, "m-marco", "p", "X", "teal").ok).toBe(false);
    expect(refused(ops.addProject(s, "m-sam", "p", "website LAUNCH", "teal"))).toMatch(/already exists/);
    expect(refused(ops.addProject(s, "m-sam", "p", "  ", "teal"))).toMatch(/name/);
    const next = ok(ops.deleteProject(s, "m-sam", "tp-launch"));
    expect(next.projects.map((p) => p.id)).toEqual(["tp-q4"]);
    expect(next.tasks.find((t) => t.id === "tt-1")?.projectId).toBeNull();
    expect(next.tasks).toHaveLength(s.tasks.length);
  });
});

describe("comments", () => {
  it("members comment and delete only their own; admins delete any", () => {
    const s = ok(ops.addComment(base(), "m-lena", "tt-1", "  Looks good  ", "c-new", NOW));
    expect(s.tasks[0]?.comments.at(-1)).toMatchObject({ authorId: "m-lena", text: "Looks good" });
    expect(refused(ops.deleteComment(s, "m-marco", "tt-1", "c-new"))).toMatch(/your own/);
    expect(ok(ops.deleteComment(s, "m-lena", "tt-1", "c-new")).tasks[0]?.comments.some((c) => c.id === "c-new")).toBe(false);
    expect(ok(ops.deleteComment(s, "m-priya", "tt-1", "c-new")).tasks[0]?.comments.some((c) => c.id === "c-new")).toBe(false);
    expect(refused(ops.addComment(s, "m-lena", "tt-1", "   ", "c2", NOW))).toMatch(/something/);
  });
});

describe("workspace", () => {
  it("owners and admins rename; members cannot", () => {
    expect(ok(ops.renameWorkspace(base(), "m-priya", "  New name ")).workspace.name).toBe("New name");
    expect(ops.renameWorkspace(base(), "m-marco", "X").ok).toBe(false);
    expect(refused(ops.renameWorkspace(base(), "m-sam", "   "))).toMatch(/name/);
  });

  it("an unknown actor is refused, and setViewer ignores unknown people", () => {
    expect(refused(ops.addTask(base(), "ghost", { title: "x" }, "n", NOW))).toMatch(/not a member/);
    const s = base();
    expect(ops.setViewer(s, "m-tom").viewerId).toBe("m-tom");
    expect(ops.setViewer(s, "ghost")).toBe(s);
    expect(ops.viewerOf(s).id).toBe("m-sam");
  });
});

describe("availability and workload", () => {
  it("finds the hours everyone overlaps, and none when someone is off", () => {
    const s = base();
    const everyone = s.members;
    expect(commonWindow(everyone, 1)).toEqual({ start: 600, end: 900 }); // 10:00–15:00 Monday
    expect(commonWindow(everyone, 5)).toBeNull(); // Marco is off on Friday
    expect(commonWindow(everyone, 0)).toBeNull(); // weekend
    expect(commonWindow([], 1)).toBeNull();
    expect(commonWindow([member(s, "m-sam"), member(s, "m-priya")], 2)).toEqual({ start: 540, end: 990 });
  });

  it("sums a week of shared time", () => {
    expect(weeklyCapacityMin(member(base(), "m-sam"))).toBe(5 * 8 * 60);
    expect(weeklyCapacityMin(member(base(), "m-marco"))).toBe(4 * 8 * 60);
  });

  it("counts only open assigned work against capacity", () => {
    const s = base();
    const marco = workloadOf(member(s, "m-marco"), s.tasks); // tt-1 (120 open); tt-7 done, not counted
    expect(marco).toMatchObject({ openCount: 1, assignedMin: 120, status: "ok" });
    const heavy = { ...s.tasks[0]!, id: "x", assigneeId: "m-lena", durationMin: 2000 };
    expect(workloadOf(member(s, "m-lena"), [heavy]).status).toBe("over");
    expect(workloadOf(member(s, "m-lena"), [{ ...heavy, durationMin: 1500 }]).status).toBe("near");
    const off = { ...member(s, "m-tom"), week: member(s, "m-tom").week.map(() => null) };
    expect(workloadOf(off, [{ ...heavy, assigneeId: "m-tom" }]).status).toBe("over");
  });
});
