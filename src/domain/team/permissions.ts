import type { Comment, Member, Role, TeamTask } from "./types";

/**
 * The team permission model. It is pure on purpose: in 0.1.0 the same rules
 * run on the server as the authoritative check, and the screens only mirror
 * them to disable what you cannot do.
 */
export type Action =
  | "workspace.rename"
  | "workspace.delete"
  | "member.invite"
  | "member.remove"
  | "member.changeRole"
  | "project.manage"
  | "task.create"
  | "task.editAny"
  | "task.editOwn"
  | "task.assignAny"
  | "task.deleteAny"
  | "comment.create"
  | "comment.deleteAny"
  | "comment.deleteOwn";

const ADMIN_ACTIONS: readonly Action[] = [
  "workspace.rename",
  "member.invite",
  "member.remove",
  "member.changeRole",
  "project.manage",
  "task.create",
  "task.editAny",
  "task.editOwn",
  "task.assignAny",
  "task.deleteAny",
  "comment.create",
  "comment.deleteAny",
  "comment.deleteOwn",
];

const MATRIX: Record<Role, ReadonlySet<Action>> = {
  owner: new Set<Action>([...ADMIN_ACTIONS, "workspace.delete"]),
  admin: new Set<Action>(ADMIN_ACTIONS),
  member: new Set<Action>(["task.create", "task.editOwn", "comment.create", "comment.deleteOwn"]),
  viewer: new Set<Action>(),
};

export function can(role: Role, action: Action): boolean {
  return MATRIX[role].has(action);
}

export type Decision = { ok: true } | { ok: false; reason: string };

const allow: Decision = { ok: true };
const deny = (reason: string): Decision => ({ ok: false, reason });

/** Owners and admins edit any task. Members edit tasks they created or are assigned to. */
export function canEditTask(role: Role, task: Pick<TeamTask, "createdBy" | "assigneeId">, userId: string): Decision {
  if (can(role, "task.editAny")) return allow;
  if (can(role, "task.editOwn") && (task.createdBy === userId || task.assigneeId === userId)) return allow;
  if (role === "viewer") return deny("Viewers can read but not change tasks.");
  return deny("You can only edit tasks you created or are assigned to.");
}

/** Owners and admins assign anyone. Members may only assign themselves. */
export function canAssign(role: Role, userId: string, assigneeId: string | null): Decision {
  if (can(role, "task.assignAny")) return allow;
  if (can(role, "task.create") && (assigneeId === null || assigneeId === userId)) return allow;
  return deny(role === "viewer" ? "Viewers cannot assign tasks." : "Members can only assign tasks to themselves.");
}

export function canDeleteTask(role: Role): Decision {
  return can(role, "task.deleteAny") ? allow : deny("Only owners and admins can delete tasks.");
}

export function canCommentDelete(role: Role, comment: Pick<Comment, "authorId">, userId: string): Decision {
  if (can(role, "comment.deleteAny")) return allow;
  if (can(role, "comment.deleteOwn") && comment.authorId === userId) return allow;
  return deny("You can only delete your own comments.");
}

const ownerCount = (members: readonly Member[]): number => members.filter((m) => m.role === "owner").length;

/** Whether `actor` may give `target` a new role. */
export function canChangeRole(actor: Member, target: Member, newRole: Role, members: readonly Member[]): Decision {
  if (!can(actor.role, "member.changeRole")) return deny("Only owners and admins can change roles.");
  if (actor.id === target.id) return deny("You cannot change your own role.");
  if (actor.role === "admin" && (target.role === "owner" || newRole === "owner")) {
    return deny("Only an owner can change an owner or make someone an owner.");
  }
  if (target.role === "owner" && newRole !== "owner" && ownerCount(members) <= 1) {
    return deny("A workspace needs at least one owner.");
  }
  return allow;
}

/** Whether `actor` may remove `target` from the workspace. */
export function canRemoveMember(actor: Member, target: Member, members: readonly Member[]): Decision {
  if (!can(actor.role, "member.remove")) return deny("Only owners and admins can remove people.");
  if (actor.id === target.id) return deny("You cannot remove yourself in the demo.");
  if (actor.role === "admin" && target.role === "owner") return deny("Only an owner can remove an owner.");
  if (target.role === "owner" && ownerCount(members) <= 1) return deny("A workspace needs at least one owner.");
  return allow;
}
