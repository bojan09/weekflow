import "server-only";
import { randomUUID } from "node:crypto";
import { ID, Permission, Query, Role as AppwriteRole, type Models } from "node-appwrite";
import { z } from "zod";
import { TASK_HUES } from "@/domain/tasks";
import { isValidISO } from "@/lib/dates";
import * as ops from "@/domain/team/ops";
import { can, canChangeRole, canRemoveMember } from "@/domain/team/permissions";
import { ROLES, teamProjectSchema, teamStateSchema, teamTaskSchema, type Member, type Role, type TeamState } from "@/domain/team/types";
import { adminServices, DATABASE_ID, requireUser } from "./appwrite";
import { codeOf, HttpError } from "./http";

export const TEAM_TABLE_ID = "team_states";
const idSchema = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,35}$/);
const userIdSchema = z.string().min(1).max(64);
const revisionSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER - 1);
const nameSchema = z.string().trim().min(1).max(40);
const taskInput = teamTaskSchema.pick({ title: true, notes: true, projectId: true, assigneeId: true, priority: true, deadline: true, durationMin: true })
  .extend({ deadline: z.string().refine(isValidISO, "Use a valid deadline").nullable() }).partial().required({ title: true }).strict();
const taskPatch = taskInput.extend({ status: teamTaskSchema.shape.status }).partial().strict().refine((p) => Object.keys(p).length > 0);
const sharedCommand = z.discriminatedUnion("type", [
  z.object({ type: z.literal("project.add"), name: nameSchema, hue: z.enum(TASK_HUES) }).strict(),
  z.object({ type: z.literal("project.update"), projectId: idSchema, name: nameSchema, hue: z.enum(TASK_HUES) }).strict(),
  z.object({ type: z.literal("project.delete"), projectId: idSchema }).strict(),
  z.object({ type: z.literal("task.add"), input: taskInput }).strict(),
  z.object({ type: z.literal("task.update"), taskId: idSchema, patch: taskPatch }).strict(),
  z.object({ type: z.literal("task.delete"), taskId: idSchema }).strict(),
  z.object({ type: z.literal("comment.add"), taskId: idSchema, text: z.string().trim().min(1).max(500) }).strict(),
  z.object({ type: z.literal("comment.delete"), taskId: idSchema, commentId: idSchema }).strict(),
]);
const membershipCommand = z.discriminatedUnion("type", [
  z.object({ type: z.literal("member.role"), memberId: userIdSchema, role: z.enum(ROLES) }).strict(),
  z.object({ type: z.literal("member.remove"), memberId: userIdSchema }).strict(),
  z.object({ type: z.literal("invitation.cancel"), membershipId: idSchema }).strict(),
  z.object({ type: z.literal("workspace.rename"), name: nameSchema }).strict(),
]);
export type SharedTeamCommand = z.infer<typeof sharedCommand>;
export type TeamCommand = SharedTeamCommand | z.infer<typeof membershipCommand>;
const requestSchema = z.object({ revision: revisionSchema, command: z.union([sharedCommand, membershipCommand]) }).strict();
const envelopeSchema = z.object({
  revision: revisionSchema,
  state: z.object({
    projects: z.array(teamProjectSchema), tasks: z.array(teamTaskSchema),
    // Teams membership writes cannot participate in a TablesDB transaction.
    // A committed lease serializes them across workers and blocks shared writes.
    membershipLease: z.object({ id: z.string(), until: z.number() }).nullable().default(null),
  }),
});
type Envelope = z.infer<typeof envelopeSchema>;
type Session = Awaited<ReturnType<typeof requireUser>>;
type Admin = ReturnType<typeof adminServices>;
export interface TeamWorkspace {
  revision: number;
  actorId: string;
  emailVerified: boolean;
  state: TeamState;
  pending: { id: string; email: string; role: Role }[];
}

function permit(decision: { ok: boolean; reason?: string }): void {
  if (!decision.ok) throw new HttpError(403, decision.reason || "You cannot make this change.");
}

/** This actor ID comes from requireUser(), never a posted viewer or author. */
export function applyTeamCommand(state: TeamState, actorId: string, raw: unknown): TeamState {
  const command = sharedCommand.parse(raw);
  const actor = state.members.find((m) => m.id === actorId);
  if (!actor) throw new HttpError(403, "You are not a member of this workspace.");
  const input = command.type === "task.add" ? command.input : command.type === "task.update" ? command.patch : null;
  if (input?.assigneeId && !state.members.some((m) => m.id === input.assigneeId)) throw new HttpError(400, "That person is not in the workspace.");
  if (input?.projectId && !state.projects.some((p) => p.id === input.projectId)) throw new HttpError(400, "That project no longer exists.");
  let result: ops.Result;
  switch (command.type) {
    case "project.add": result = ops.addProject(state, actorId, ID.unique(), command.name, command.hue); break;
    case "project.update": {
      if (!can(actor.role, "project.manage")) throw new HttpError(403, "Only owners and admins can manage projects.");
      if (!state.projects.some((p) => p.id === command.projectId)) throw new HttpError(404, "That project no longer exists.");
      if (state.projects.some((p) => p.id !== command.projectId && p.name.toLowerCase() === command.name.toLowerCase())) throw new HttpError(400, "A project with that name already exists.");
      result = { ok: true, state: { ...state, projects: state.projects.map((p) => p.id === command.projectId ? { ...p, name: command.name, hue: command.hue } : p) } };
      break;
    }
    case "project.delete": result = ops.deleteProject(state, actorId, command.projectId); break;
    case "task.add": result = ops.addTask(state, actorId, command.input, ID.unique(), new Date().toISOString()); break;
    case "task.update": result = ops.updateTask(state, actorId, command.taskId, command.patch); break;
    case "task.delete": result = ops.deleteTask(state, actorId, command.taskId); break;
    case "comment.add": result = ops.addComment(state, actorId, command.taskId, command.text, ID.unique(), new Date().toISOString()); break;
    case "comment.delete": result = ops.deleteComment(state, actorId, command.taskId, command.commentId); break;
  }
  if (!result.ok) throw new HttpError(403, result.reason);
  return teamStateSchema.parse(result.state);
}

function roleOf(roles: string[]): Role {
  return ROLES.find((role) => roles.includes(role)) ?? "viewer";
}

async function membershipsOf(admin: Admin, teamId: string): Promise<Models.Membership[]> {
  const all: Models.Membership[] = [];
  for (;;) {
    const page = await admin.teams.listMemberships({ teamId, queries: [Query.limit(100), Query.offset(all.length)] });
    all.push(...page.memberships);
    if (page.memberships.length < 100) return all;
  }
}

async function context(teamId: string, session: Session, admin: Admin) {
  idSchema.parse(teamId);
  const memberships = await membershipsOf(admin, teamId);
  const own = memberships.find((m) => m.userId === session.user.$id && m.confirm);
  if (!own) throw new HttpError(403, "You are not a confirmed member of this workspace.");
  const team = await admin.teams.get({ teamId });
  const members: Member[] = memberships.filter((m) => m.confirm).map((m) => ({
    id: m.userId, name: m.userName || m.userEmail || m.userId, email: m.userEmail,
    role: roleOf(m.roles), hue: "slate", week: [null, null, null, null, null, null, null],
  }));
  return { memberships, team, members, actor: members.find((m) => m.id === session.user.$id)! };
}

function decode(data: unknown): Envelope {
  try { return envelopeSchema.parse(JSON.parse(String(data))); }
  catch { throw new HttpError(503, "The shared workspace could not be read. No changes were saved."); }
}

function projectState(ctx: Awaited<ReturnType<typeof context>>, env: Envelope, actorId: string): TeamState {
  const ids = new Set(ctx.members.map((m) => m.id));
  return {
    workspace: { id: ctx.team.$id, name: ctx.team.name }, members: ctx.members, invitations: [], viewerId: actorId,
    projects: env.state.projects,
    tasks: env.state.tasks.map((t) => t.assigneeId && !ids.has(t.assigneeId) ? { ...t, assigneeId: null } : t),
  };
}

function snapshot(ctx: Awaited<ReturnType<typeof context>>, env: Envelope, session: Session): TeamWorkspace {
  return {
    revision: env.revision, actorId: session.user.$id, emailVerified: session.user.emailVerification,
    state: projectState(ctx, env, session.user.$id),
    pending: ctx.memberships.filter((m) => !m.confirm).map((m) => ({ id: m.$id, email: m.userEmail, role: roleOf(m.roles) })),
  };
}

const rowAddress = (teamId: string) => ({ databaseId: DATABASE_ID, tableId: TEAM_TABLE_ID, rowId: teamId });
const changed = () => new HttpError(409, "This workspace changed. Refresh it before trying again.");

/** Stage a no-op first so the revision read is inside the conflict window,
 * rather than leaving a read-then-stage lost-update gap. */
async function transaction<T>(admin: Admin, teamId: string, expected: number | null, change: (env: Envelope) => Promise<T>, incrementRevision = true): Promise<T> {
  // Appwrite rejects an empty update payload. Only this immutable creator field
  // is read outside the transaction; shared data/revision are read after staging.
  const initial = await admin.tables.getRow(rowAddress(teamId));
  const ownerId = z.string().min(1).max(64).parse(initial.ownerId);
  const tx = await admin.tables.createTransaction({ ttl: 60 });
  const address = { ...rowAddress(teamId), transactionId: tx.$id };
  try {
    await admin.tables.updateRow({ ...address, data: { ownerId }, permissions: [Permission.read(AppwriteRole.team(teamId))] });
    const row = await admin.tables.getRow(address);
    const env = decode(row.data);
    if (expected !== null && env.revision !== expected) throw changed();
    const result = await change(env);
    if (incrementRevision) env.revision += 1;
    const data = JSON.stringify(env);
    await admin.tables.updateRow({ ...address, data: { data } });
    await admin.tables.updateTransaction({ transactionId: tx.$id, commit: true });
    return result;
  } catch (error) {
    try { await admin.tables.updateTransaction({ transactionId: tx.$id, rollback: true }); } catch { /* The transaction may already have expired. */ }
    if (codeOf(error) === 409) throw changed();
    throw error;
  }
}

function assertUnlocked(env: Envelope) {
  if (env.state.membershipLease && env.state.membershipLease.until > Date.now()) throw new HttpError(409, "A membership change is in progress. Refresh and try again shortly.");
}

async function withMembershipLease(teamId: string, revision: number | null, admin: Admin, action: () => Promise<void>) {
  const token = randomUUID();
  await transaction(admin, teamId, revision, async (env) => {
    assertUnlocked(env);
    env.state.membershipLease = { id: token, until: Date.now() + 180_000 };
  }, false);
  let succeeded = false;
  try {
    // Re-read real roles after acquiring the lease, including owner count.
    await action();
    succeeded = true;
  } finally {
    await transaction(admin, teamId, null, async (env) => {
      if (env.state.membershipLease?.id !== token) throw changed();
      env.state.membershipLease = null;
    }, succeeded);
  }
}

async function membershipWrite(teamId: string, revision: number, session: Session, admin: Admin, action: (ctx: Awaited<ReturnType<typeof context>>) => Promise<void>) {
  // Check membership before any privileged row access or lease acquisition.
  await context(teamId, session, admin);
  await withMembershipLease(teamId, revision, admin, async () => action(await context(teamId, session, admin)));
}

export async function getTeamWorkspace(teamId: string): Promise<TeamWorkspace> {
  const session = await requireUser();
  const admin = adminServices();
  const ctx = await context(teamId, session, admin);
  const row = await admin.tables.getRow(rowAddress(teamId));
  return snapshot(ctx, decode(row.data), session);
}

export async function listTeamWorkspaces() {
  const session = await requireUser();
  const admin = adminServices();
  const teams: { id: string; name: string; role: Role }[] = [];
  let offset = 0;
  for (;;) {
    const page = await session.teams.list({ queries: [Query.limit(100), Query.offset(offset)] });
    for (const team of page.teams) {
      try {
        const ctx = await context(team.$id, session, admin);
        await admin.tables.getRow(rowAddress(team.$id));
        teams.push({ id: team.$id, name: team.name, role: ctx.actor.role });
      } catch (error) {
        // Appwrite teams from other applications and pending invitations are not workspaces.
        if (codeOf(error) !== 404 && !(error instanceof HttpError && error.status === 403)) throw error;
      }
    }
    if (page.teams.length < 100) break;
    offset += page.teams.length;
  }
  return { teams };
}

export async function createTeamWorkspace(raw: unknown): Promise<TeamWorkspace> {
  const { name } = z.object({ name: nameSchema }).strict().parse(raw);
  const session = await requireUser();
  const admin = adminServices();
  const team = await session.teams.create({ teamId: ID.unique(), name, roles: ["owner"] });
  try {
    const envelope: Envelope = { revision: 0, state: { projects: [], tasks: [], membershipLease: null } };
    await admin.tables.createRow({ ...rowAddress(team.$id), data: { ownerId: session.user.$id, data: JSON.stringify(envelope) }, permissions: [Permission.read(AppwriteRole.team(team.$id))] });
  } catch (error) {
    try { await session.teams.delete({ teamId: team.$id }); } catch { /* A retry will not silently overwrite an existing workspace. */ }
    throw error;
  }
  return getTeamWorkspace(team.$id);
}

export async function runTeamCommand(teamId: string, raw: unknown): Promise<TeamWorkspace> {
  const { revision, command } = requestSchema.parse(raw);
  const session = await requireUser();
  const admin = adminServices();
  await context(teamId, session, admin);
  if (membershipCommand.safeParse(command).success) {
    const memberCommand = membershipCommand.parse(command);
    await membershipWrite(teamId, revision, session, admin, async (ctx) => {
      if (memberCommand.type === "workspace.rename") {
        permit({ ok: can(ctx.actor.role, "workspace.rename") });
        await admin.teams.updateName({ teamId, name: memberCommand.name });
      } else if (memberCommand.type === "invitation.cancel") {
        permit({ ok: can(ctx.actor.role, "member.invite") });
        const target = ctx.memberships.find((m) => m.$id === memberCommand.membershipId && !m.confirm);
        if (!target) throw new HttpError(404, "That pending invitation no longer exists.");
        if (target.roles.includes("owner") && ctx.actor.role !== "owner") throw new HttpError(403, "Only owners can cancel an owner invitation.");
        await admin.teams.deleteMembership({ teamId, membershipId: target.$id });
      } else {
        const target = ctx.members.find((m) => m.id === memberCommand.memberId);
        if (!target) throw new HttpError(404, "That person is not in this workspace.");
        if (target.id === ctx.actor.id) throw new HttpError(403, "Ask another owner to change your role or remove your membership.");
        const membership = ctx.memberships.find((m) => m.confirm && m.userId === target.id)!;
        if (memberCommand.type === "member.role") {
          permit(canChangeRole(ctx.actor, target, memberCommand.role, ctx.members));
          await admin.teams.updateMembership({ teamId, membershipId: membership.$id, roles: [memberCommand.role] });
        } else {
          permit(canRemoveMember(ctx.actor, target, ctx.members));
          await admin.teams.deleteMembership({ teamId, membershipId: membership.$id });
        }
      }
    });
  } else {
    await transaction(admin, teamId, revision, async (env) => {
      assertUnlocked(env);
      const ctx = await context(teamId, session, admin);
      const next = applyTeamCommand(projectState(ctx, env, session.user.$id), session.user.$id, command);
      env.state.projects = next.projects;
      env.state.tasks = next.tasks;
    });
  }
  return getTeamWorkspace(teamId);
}

export async function inviteTeamMember(teamId: string, raw: unknown, origin: string): Promise<TeamWorkspace> {
  const input = z.object({ revision: revisionSchema, email: z.email().max(320), role: z.enum(["admin", "member", "viewer"]) }).strict().parse(raw);
  const session = await requireUser();
  if (!session.user.emailVerification) throw new HttpError(403, "Verify your email before inviting people.");
  const admin = adminServices();
  await membershipWrite(teamId, input.revision, session, admin, async (ctx) => {
    if (ctx.actor.role !== "owner") throw new HttpError(403, "Only owners can send email invitations.");
    if (ctx.memberships.some((m) => m.userEmail.toLowerCase() === input.email.toLowerCase())) throw new HttpError(409, "This email already belongs to a member or pending invitation.");
    // A key client auto-adds people; only the session client sends a consent-based invitation.
    await session.teams.createMembership({ teamId, email: input.email, roles: [input.role], url: `${new URL(origin).origin}/accept-invitation` });
  });
  return getTeamWorkspace(teamId);
}

export async function acceptTeamInvitation(raw: unknown) {
  const input = z.object({ teamId: idSchema, membershipId: idSchema, userId: userIdSchema, secret: z.string().min(1).max(2048) }).strict().parse(raw);
  const session = await requireUser();
  if (input.userId !== session.user.$id) throw new HttpError(403, "Sign in with the account this invitation was sent to.");
  const admin = adminServices();
  const memberships = await membershipsOf(admin, input.teamId);
  if (!memberships.some((member) => member.$id === input.membershipId && member.userId === session.user.$id && !member.confirm)) {
    throw new HttpError(403, "This invitation is no longer available for your account.");
  }
  // Acceptance participates in the same lease as removal and owner deletion.
  await withMembershipLease(input.teamId, null, admin, async () => { await session.teams.updateMembershipStatus(input); });
  return { teamId: input.teamId };
}

/** Recheck sole ownership under the membership lease before deleting a team. */
export async function deleteSoloWorkspaceForAccount(teamId: string) {
  const session = await requireUser();
  const admin = adminServices();
  const ctx = await context(teamId, session, admin);
  const row = await admin.tables.getRow(rowAddress(teamId));
  await membershipWrite(teamId, decode(row.data).revision, session, admin, async (current) => {
    if (current.actor.role !== "owner" || current.members.some((member) => member.id !== session.user.$id)) {
      throw new HttpError(409, "The workspace membership changed. Make another member an owner before deleting your account.");
    }
    await admin.teams.delete({ teamId: ctx.team.$id });
  });
  await admin.tables.deleteRow(rowAddress(teamId));
}

/** Account deletion may leave a shared workspace after ownership is transferred.
 * left:false means this user is its sole confirmed member; the deletion flow
 * still owns deleting that workspace and its row. Pending invitations never
 * count as another owner. This helper never deletes a workspace. */
export async function leaveTeamForAccountDeletion(teamId: string): Promise<{ left: boolean }> {
  const session = await requireUser();
  const admin = adminServices();
  await context(teamId, session, admin);
  const row = await admin.tables.getRow(rowAddress(teamId));
  let left = false;
  await membershipWrite(teamId, decode(row.data).revision, session, admin, async (ctx) => {
    const others = ctx.members.filter((m) => m.id !== session.user.$id);
    if (ctx.actor.role === "owner" && !others.some((m) => m.role === "owner")) {
      if (others.length > 0) throw new HttpError(409, "Make another member an owner before deleting your account.");
      return;
    }
    const own = ctx.memberships.find((m) => m.confirm && m.userId === session.user.$id)!;
    await session.teams.deleteMembership({ teamId, membershipId: own.$id });
    left = true;
  });
  return { left };
}
