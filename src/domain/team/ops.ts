import { z } from "zod";
import type { ProjectHue } from "../project-colors";
import type { Priority } from "../tasks";
import {
  can,
  canAssign,
  canChangeRole,
  canCommentDelete,
  canDeleteTask,
  canEditTask,
  canRemoveMember,
  type Decision,
} from "./permissions";
import type { Invitation, Member, Role, TeamProject, TeamState, TeamTask, TeamTaskStatus } from "./types";

/**
 * Pure team operations. Each one checks the permission model and either
 * returns the new state or says why it refused, changing nothing.
 */
export type Result = { ok: true; state: TeamState } | { ok: false; reason: string };

const fail = (reason: string): Result => ({ ok: false, reason });
const done = (state: TeamState): Result => ({ ok: true, state });

export function viewerOf(state: TeamState): Member {
  return state.members.find((m) => m.id === state.viewerId) ?? state.members[0]!;
}

function guard(state: TeamState, actorId: string, check: (actor: Member) => Decision): Result | Member {
  const actor = state.members.find((m) => m.id === actorId);
  if (!actor) return fail("You are not a member of this workspace.");
  const decision = check(actor);
  return decision.ok ? actor : fail(decision.reason);
}

const isResult = (value: Result | Member): value is Result => "ok" in value;

/** Demo only: act as a different member. Not a permission, because there is no sign-in yet. */
export function setViewer(state: TeamState, memberId: string): TeamState {
  return state.members.some((m) => m.id === memberId) ? { ...state, viewerId: memberId } : state;
}

export function renameWorkspace(state: TeamState, actorId: string, name: string): Result {
  const actor = guard(state, actorId, (a) => (can(a.role, "workspace.rename") ? { ok: true } : { ok: false, reason: "Only owners and admins can rename the workspace." }));
  if (isResult(actor)) return actor;
  const trimmed = name.trim();
  if (trimmed === "") return fail("Give the workspace a name.");
  return done({ ...state, workspace: { ...state.workspace, name: trimmed.slice(0, 40) } });
}

export function inviteMember(
  state: TeamState,
  actorId: string,
  email: string,
  role: Exclude<Role, "owner">,
  id: string,
  nowIso: string,
): Result {
  const actor = guard(state, actorId, (a) => (can(a.role, "member.invite") ? { ok: true } : { ok: false, reason: "Only owners and admins can invite people." }));
  if (isResult(actor)) return actor;
  const parsed = z.email().safeParse(email.trim());
  if (!parsed.success) return fail("Enter a valid email address.");
  const lower = parsed.data.toLowerCase();
  if (state.members.some((m) => m.email.toLowerCase() === lower)) return fail("That person is already in the workspace.");
  if (state.invitations.some((i) => i.email.toLowerCase() === lower)) return fail("That person has already been invited.");
  const invitation: Invitation = { id, email: parsed.data, role, invitedBy: actor.id, invitedAt: nowIso };
  return done({ ...state, invitations: [...state.invitations, invitation] });
}

export function cancelInvitation(state: TeamState, actorId: string, invitationId: string): Result {
  const actor = guard(state, actorId, (a) => (can(a.role, "member.invite") ? { ok: true } : { ok: false, reason: "Only owners and admins can cancel invitations." }));
  if (isResult(actor)) return actor;
  return done({ ...state, invitations: state.invitations.filter((i) => i.id !== invitationId) });
}

export function changeRole(state: TeamState, actorId: string, memberId: string, newRole: Role): Result {
  const target = state.members.find((m) => m.id === memberId);
  if (!target) return fail("That person is not in the workspace.");
  const actor = guard(state, actorId, (a) => canChangeRole(a, target, newRole, state.members));
  if (isResult(actor)) return actor;
  return done({ ...state, members: state.members.map((m) => (m.id === memberId ? { ...m, role: newRole } : m)) });
}

export function removeMember(state: TeamState, actorId: string, memberId: string): Result {
  const target = state.members.find((m) => m.id === memberId);
  if (!target) return fail("That person is not in the workspace.");
  const actor = guard(state, actorId, (a) => canRemoveMember(a, target, state.members));
  if (isResult(actor)) return actor;
  return done({
    ...state,
    members: state.members.filter((m) => m.id !== memberId),
    // Their tasks stay, unassigned, so no work disappears with a person.
    tasks: state.tasks.map((t) => (t.assigneeId === memberId ? { ...t, assigneeId: null } : t)),
  });
}

export function addProject(state: TeamState, actorId: string, id: string, name: string, hue: ProjectHue): Result {
  const actor = guard(state, actorId, (a) => (can(a.role, "project.manage") ? { ok: true } : { ok: false, reason: "Only owners and admins can manage projects." }));
  if (isResult(actor)) return actor;
  const trimmed = name.trim();
  if (trimmed === "") return fail("Give the project a name.");
  if (state.projects.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) return fail("A project with that name already exists.");
  const project: TeamProject = { id, name: trimmed.slice(0, 40), hue };
  return done({ ...state, projects: [...state.projects, project] });
}

export function deleteProject(state: TeamState, actorId: string, projectId: string): Result {
  const actor = guard(state, actorId, (a) => (can(a.role, "project.manage") ? { ok: true } : { ok: false, reason: "Only owners and admins can manage projects." }));
  if (isResult(actor)) return actor;
  return done({
    ...state,
    projects: state.projects.filter((p) => p.id !== projectId),
    tasks: state.tasks.map((t) => (t.projectId === projectId ? { ...t, projectId: null } : t)),
  });
}

export interface NewTeamTask {
  title: string;
  projectId?: string | null;
  assigneeId?: string | null;
  priority?: Priority;
  deadline?: string | null;
  durationMin?: number;
  notes?: string;
}

export function addTask(state: TeamState, actorId: string, input: NewTeamTask, id: string, nowIso: string): Result {
  const actor = guard(state, actorId, (a) =>
    can(a.role, "task.create") ? canAssign(a.role, a.id, input.assigneeId ?? null) : { ok: false, reason: "Viewers cannot create tasks." },
  );
  if (isResult(actor)) return actor;
  const title = input.title.trim();
  if (title === "") return fail("Give the task a title.");
  const task: TeamTask = {
    id,
    title: title.slice(0, 120),
    notes: input.notes ?? "",
    projectId: input.projectId ?? null,
    assigneeId: input.assigneeId ?? null,
    createdBy: actor.id,
    status: "todo",
    priority: input.priority ?? "medium",
    deadline: input.deadline ?? null,
    durationMin: input.durationMin ?? 60,
    comments: [],
    createdAt: nowIso,
  };
  return done({ ...state, tasks: [...state.tasks, task] });
}

export type TaskPatch = Partial<Pick<TeamTask, "title" | "notes" | "projectId" | "assigneeId" | "priority" | "deadline" | "durationMin" | "status">>;

export function updateTask(state: TeamState, actorId: string, taskId: string, patch: TaskPatch): Result {
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task) return fail("That task no longer exists.");
  const actor = guard(state, actorId, (a) => {
    const edit = canEditTask(a.role, task, a.id);
    if (!edit.ok) return edit;
    return patch.assigneeId !== undefined ? canAssign(a.role, a.id, patch.assigneeId) : edit;
  });
  if (isResult(actor)) return actor;
  if (patch.title !== undefined && patch.title.trim() === "") return fail("Give the task a title.");
  if (patch.assigneeId && !state.members.some((m) => m.id === patch.assigneeId)) return fail("That person is not in the workspace.");
  return done({ ...state, tasks: state.tasks.map((t) => (t.id === taskId ? { ...t, ...patch, title: (patch.title ?? t.title).trim() } : t)) });
}

export function setStatus(state: TeamState, actorId: string, taskId: string, status: TeamTaskStatus): Result {
  return updateTask(state, actorId, taskId, { status });
}

export function deleteTask(state: TeamState, actorId: string, taskId: string): Result {
  const actor = guard(state, actorId, (a) => canDeleteTask(a.role));
  if (isResult(actor)) return actor;
  return done({ ...state, tasks: state.tasks.filter((t) => t.id !== taskId) });
}

export function addComment(state: TeamState, actorId: string, taskId: string, text: string, id: string, nowIso: string): Result {
  const actor = guard(state, actorId, (a) => (can(a.role, "comment.create") ? { ok: true } : { ok: false, reason: "Viewers cannot comment." }));
  if (isResult(actor)) return actor;
  const trimmed = text.trim();
  if (trimmed === "") return fail("Write something first.");
  if (!state.tasks.some((t) => t.id === taskId)) return fail("That task no longer exists.");
  return done({
    ...state,
    tasks: state.tasks.map((t) =>
      t.id === taskId ? { ...t, comments: [...t.comments, { id, authorId: actor.id, text: trimmed.slice(0, 500), at: nowIso }] } : t,
    ),
  });
}

export function deleteComment(state: TeamState, actorId: string, taskId: string, commentId: string): Result {
  const task = state.tasks.find((t) => t.id === taskId);
  const comment = task?.comments.find((c) => c.id === commentId);
  if (!task || !comment) return fail("That comment no longer exists.");
  const actor = guard(state, actorId, (a) => canCommentDelete(a.role, comment, a.id));
  if (isResult(actor)) return actor;
  return done({
    ...state,
    tasks: state.tasks.map((t) => (t.id === taskId ? { ...t, comments: t.comments.filter((c) => c.id !== commentId) } : t)),
  });
}
