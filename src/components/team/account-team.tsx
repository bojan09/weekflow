"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Building2, CheckCheck, FolderKanban, ListTodo, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RoleBadge } from "@/components/team/common";
import { initialsOf } from "@/domain/profile";
import { PRIORITIES, PRIORITY_LABEL, TASK_HUES, type Priority, type TaskHue } from "@/domain/tasks";
import { can, canAssign, canChangeRole, canCommentDelete, canEditTask, canRemoveMember } from "@/domain/team/permissions";
import { ROLE_LABEL, ROLES, STATUS_LABEL, TASK_STATUSES, type Member, type Role, type TeamProject, type TeamTask, type TeamTaskStatus } from "@/domain/team/types";
import type { TeamCommand, TeamWorkspace } from "@/server/team";

type WorkspaceLink = { id: string; name: string; role: Role };
type Save = (command: TeamCommand) => Promise<boolean>;
const panel = "space-y-4 rounded-2xl border bg-card p-4 sm:p-5";
const selectClass = "min-h-11 w-full min-w-0 rounded-lg border border-input bg-card px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60";

class TeamRequestError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

async function request<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method: body === undefined ? "GET" : "POST", credentials: "same-origin", cache: "no-store",
    ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  });
  const data = await response.json();
  if (!response.ok) throw new TeamRequestError(data.message || "The workspace could not be updated. Try again.", response.status);
  return data as T;
}
const messageOf = (error: unknown) => error instanceof Error ? error.message : "The workspace could not be loaded. Try again.";
const text = (data: FormData, name: string) => String(data.get(name) ?? "");

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block space-y-1.5 text-sm font-medium"><span>{label}</span>{children}</label>;
}

function IdentityInitials({ name }: { name: string }) {
  return <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-primary-border bg-primary-soft text-sm font-semibold text-primary-soft-text">{initialsOf(name)}</span>;
}

function TeamStats({ workspace }: { workspace: TeamWorkspace }) {
  const { state } = workspace;
  const completed = state.tasks.filter((task) => task.status === "done").length;
  const stats = [
    { label: "Members", value: state.members.length, icon: Users, color: "bg-primary-soft text-primary-soft-text" },
    { label: "Projects", value: state.projects.length, icon: FolderKanban, color: "bg-info-soft text-info-text" },
    { label: "Open tasks", value: state.tasks.length - completed, icon: ListTodo, color: "bg-warning-soft text-warning-text" },
    { label: "Completed tasks", value: completed, icon: CheckCheck, color: "bg-success-soft text-success-text" },
  ];
  return <aside aria-label="Team stats" className="min-w-0 space-y-4 self-start xl:sticky xl:top-6">
    <section className={`${panel} shadow-soft`}>
      <h2 className="text-base font-semibold">Team stats</h2>
      <dl className="grid grid-cols-2 gap-3">{stats.map(({ label, value, icon: Icon, color }) => <div key={label} className="relative min-w-0 rounded-xl border bg-background/60 p-3 pt-12">
        <span aria-hidden="true" className={`absolute top-3 left-3 flex size-7 items-center justify-center rounded-lg ${color}`}><Icon className="size-4" /></span>
        <dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 text-2xl font-semibold tabular-nums">{value}</dd>
      </div>)}</dl>
      <dl className="border-t pt-4"><div className="flex items-center justify-between gap-3 text-sm"><dt className="text-muted-foreground">Pending invitations</dt><dd className="font-medium tabular-nums">{workspace.pending.length}</dd></div></dl>
    </section>
    <section className="space-y-2 rounded-2xl border border-primary-border bg-primary-soft/40 p-5">
      <h2 className="text-sm font-semibold">Space for shared work</h2>
      <p className="text-sm leading-relaxed text-muted-foreground">Projects, tasks and comments are shared with your workspace. Your personal calendar stays private, and assignments never move protected time.</p>
    </section>
  </aside>;
}

function ProjectForm({ project, disabled, save }: { project?: TeamProject; disabled: boolean; save: Save }) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const name = text(values, "name");
    const hue = text(values, "hue") as TaskHue;
    const success = await save(project ? { type: "project.update", projectId: project.id, name, hue } : { type: "project.add", name, hue });
    if (success && !project) form.reset();
  }
  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
      <fieldset disabled={disabled} className="contents">
        <Field label={project ? `Project name: ${project.name}` : "New project name"}><Input className="h-11" name="name" defaultValue={project?.name ?? ""} required maxLength={40} /></Field>
        <Field label={project ? `Project color: ${project.name}` : "Project color"}><select className={selectClass} name="hue" defaultValue={project?.hue ?? "blue"}>{TASK_HUES.map((h) => <option key={h} value={h}>{h}</option>)}</select></Field>
        <Button className="min-h-11" type="submit">{project ? "Save project" : "Add project"}</Button>
        {project ? <Button className="min-h-11" variant="outline" type="button" onClick={() => { if (window.confirm(`Delete project “${project.name}”? Its tasks will remain without a project.`)) void save({ type: "project.delete", projectId: project.id }); }}>Delete project</Button> : null}
      </fieldset>
    </form>
  );
}

function TaskDetails({ task, workspace, actor, disabled, save, close }: { task: TeamTask; workspace: TeamWorkspace; actor: Member; disabled: boolean; save: Save; close: () => void }) {
  const editable = canEditTask(actor.role, task, actor.id).ok;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    await save({ type: "task.update", taskId: task.id, patch: {
      title: text(values, "title"), notes: text(values, "notes"), status: text(values, "status") as TeamTaskStatus,
      priority: text(values, "priority") as Priority, projectId: text(values, "projectId") || null,
      ...(text(values, "assigneeId") !== (task.assigneeId ?? "") ? { assigneeId: text(values, "assigneeId") || null } : {}), deadline: text(values, "deadline") || null,
      durationMin: Number(values.get("durationMin")),
    } });
  }
  return (
    <section aria-label="Task details" className="space-y-4 rounded-xl border p-4">
      <div className="flex items-center justify-between gap-3"><h3 className="font-semibold">Task details</h3><Button type="button" variant="ghost" className="min-h-11" onClick={close}>Close task</Button></div>
      <form onSubmit={submit}>
        <fieldset disabled={disabled || !editable} className="space-y-3">
          <Field label="Task title"><Input name="title" defaultValue={task.title} className="h-11" required maxLength={120} /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Task status"><select className={selectClass} name="status" defaultValue={task.status}>{TASK_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select></Field>
            <Field label="Assigned to"><select className={selectClass} name="assigneeId" defaultValue={task.assigneeId ?? ""}>
              <option value="">Unassigned</option>{workspace.state.members.map((m) => <option key={m.id} value={m.id} disabled={!canAssign(actor.role, actor.id, m.id).ok && m.id !== task.assigneeId}>{m.name}{m.id === actor.id ? " (you)" : ""}</option>)}
            </select></Field>
            <Field label="Task project"><select className={selectClass} name="projectId" defaultValue={task.projectId ?? ""}><option value="">No project</option>{workspace.state.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
            <Field label="Task priority"><select className={selectClass} name="priority" defaultValue={task.priority}>{PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}</select></Field>
            <Field label="Deadline"><Input className="h-11" type="date" name="deadline" defaultValue={task.deadline ?? ""} /></Field>
            <Field label="Length in minutes"><Input className="h-11" type="number" name="durationMin" defaultValue={task.durationMin} required min={5} max={720} /></Field>
          </div>
          <Field label="Task notes"><Textarea name="notes" defaultValue={task.notes} maxLength={1000} rows={3} /></Field>
          {editable ? <Button className="min-h-11" type="submit">Save task</Button> : null}
        </fieldset>
      </form>
      {!editable ? <p className="text-sm text-muted-foreground">You can read this task. Your role allows edits only to work you created or are assigned to.</p> : null}
      <section aria-label="Task comments" className="space-y-3">
        <h4 className="font-medium">Comments</h4>
        {task.comments.length === 0 ? <p className="text-sm text-muted-foreground">No comments yet.</p> : null}
        <ul className="space-y-3">{task.comments.map((comment) => <li key={comment.id} className="rounded-lg bg-muted/50 p-3">
          <p className="text-sm font-medium">{workspace.state.members.find((m) => m.id === comment.authorId)?.name ?? "Former member"} <time className="text-xs font-normal text-muted-foreground" dateTime={comment.at}>{new Date(comment.at).toLocaleString()}</time></p>
          <p className="mt-1 text-sm whitespace-pre-wrap break-words">{comment.text}</p>
          {canCommentDelete(actor.role, comment, actor.id).ok ? <Button className="mt-1 min-h-11" type="button" variant="ghost" disabled={disabled} onClick={() => void save({ type: "comment.delete", taskId: task.id, commentId: comment.id })}>Delete comment</Button> : null}
        </li>)}</ul>
        {can(actor.role, "comment.create") ? <form className="space-y-2" onSubmit={async (event) => {
          event.preventDefault();
          const form = event.currentTarget;
          if (await save({ type: "comment.add", taskId: task.id, text: text(new FormData(form), "comment") })) form.reset();
        }}><fieldset disabled={disabled} className="space-y-2"><Field label="Write a comment"><Textarea name="comment" required maxLength={500} /></Field><Button className="min-h-11" type="submit">Post comment</Button></fieldset></form> : null}
      </section>
      {can(actor.role, "task.deleteAny") ? <Button className="min-h-11" type="button" variant="destructive" disabled={disabled} onClick={async () => {
        if (window.confirm(`Delete shared task “${task.title}” and its comments?`) && await save({ type: "task.delete", taskId: task.id })) close();
      }}>Delete task</Button> : null}
    </section>
  );
}

function WorkspaceBody({ workspace, disabled, save, invite }: { workspace: TeamWorkspace; disabled: boolean; save: Save; invite: (input: { email: string; role: Exclude<Role, "owner"> }) => Promise<boolean> }) {
  const { state, actorId } = workspace;
  const actor = state.members.find((m) => m.id === actorId)!;
  const [taskId, setTaskId] = useState<string | null>(null);
  const task = state.tasks.find((t) => t.id === taskId);
  return (
    <div className="space-y-5">
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-card px-4 py-3 shadow-soft sm:px-5" aria-label="Workspace overview">
        <div className="flex min-w-0 items-center gap-3"><span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-text"><Building2 className="size-5" /></span><div className="min-w-0"><h2 className="text-lg font-semibold break-words">{state.workspace.name}</h2><p className="mt-0.5 text-xs text-muted-foreground">Your workspace · {state.members.length} {state.members.length === 1 ? "member" : "members"}</p></div><RoleBadge role={actor.role} /></div>
        {can(actor.role, "workspace.rename") ? <details className="group w-full border-t pt-3 sm:ml-auto sm:w-auto sm:border-0 sm:pt-0"><summary className="flex min-h-11 cursor-pointer list-none items-center rounded-lg px-3 text-sm font-medium text-muted-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring">Workspace details <span aria-hidden="true" className="ml-2 transition-transform group-open:rotate-180">⌄</span></summary><form onSubmit={async (event) => {
          event.preventDefault();
          await save({ type: "workspace.rename", name: text(new FormData(event.currentTarget), "name") });
        }} className="mt-3 flex flex-wrap items-end gap-3"><fieldset disabled={disabled} className="contents"><Field label="Workspace name"><Input className="h-11" name="name" defaultValue={state.workspace.name} key={state.workspace.name} required maxLength={40} /></Field><Button className="min-h-11" type="submit">Rename workspace</Button></fieldset></form></details> : null}
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
      <Tabs defaultValue="members" className="min-w-0 flex-col gap-5">
        <TabsList aria-label="Team sections" variant="line" className="grid h-auto! w-full grid-cols-3 justify-start gap-0 border-b p-0 pb-1 sm:flex sm:gap-2">
          <TabsTrigger value="members" className="min-h-11 min-w-0 flex-none px-1 text-xs sm:px-4 sm:text-sm"><Users aria-hidden="true" className="hidden sm:block" /><span>Members</span></TabsTrigger>
          <TabsTrigger value="projects" className="min-h-11 min-w-0 flex-none px-1 text-xs sm:px-4 sm:text-sm"><FolderKanban aria-hidden="true" className="hidden sm:block" /><span>Projects</span></TabsTrigger>
          <TabsTrigger value="tasks" className="min-h-11 min-w-0 flex-none px-1 text-xs sm:px-4 sm:text-sm"><ListTodo aria-hidden="true" className="hidden sm:block" /><span>Shared Tasks</span></TabsTrigger>
        </TabsList>
      <TabsContent value="projects" keepMounted>
      <section className={`${panel} shadow-soft`} aria-label="Shared projects">
        <div><h2 className="text-lg font-semibold">Projects</h2><p className="mt-1 text-sm text-muted-foreground">Organize shared work into clear, focused projects.</p></div>
        {state.projects.length === 0 ? <p className="text-sm text-muted-foreground">No shared projects yet.</p> : null}
        {can(actor.role, "project.manage") ? <><ProjectForm disabled={disabled} save={save} />{state.projects.map((p) => <ProjectForm key={`${p.id}-${p.name}-${p.hue}`} project={p} disabled={disabled} save={save} />)}</> : <ul className="space-y-2 text-sm">{state.projects.map((p) => <li key={p.id}>{p.name}</li>)}</ul>}
      </section>
      </TabsContent>

      <TabsContent value="tasks" keepMounted>
      <section className={`${panel} shadow-soft`} aria-label="Shared tasks">
        <div><h2 className="text-lg font-semibold">Shared tasks</h2><p className="mt-1 text-sm text-muted-foreground">Assign work, keep details together and discuss the next step.</p></div>
        {can(actor.role, "task.create") ? <form className="flex flex-wrap items-end gap-3" onSubmit={async (event) => {
          event.preventDefault();
          const form = event.currentTarget;
          if (await save({ type: "task.add", input: { title: text(new FormData(form), "title") } })) form.reset();
        }}><fieldset disabled={disabled} className="contents"><Field label="New task title"><Input className="h-11" name="title" required maxLength={120} /></Field><Button className="min-h-11" type="submit">Add shared task</Button></fieldset></form> : null}
        {state.tasks.length === 0 ? <p className="text-sm text-muted-foreground">No shared tasks yet.</p> : null}
        <ul className="space-y-2">{state.tasks.map((t) => <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
          <button type="button" className="min-h-11 min-w-0 text-left font-medium text-primary-text break-words hover:underline focus-visible:outline-2 focus-visible:outline-ring" aria-expanded={taskId === t.id} onClick={() => setTaskId(taskId === t.id ? null : t.id)}>{t.title}</button>
          <span className="text-sm text-muted-foreground">{STATUS_LABEL[t.status]} · {t.assigneeId ? state.members.find((m) => m.id === t.assigneeId)?.name ?? "Former member" : "Unassigned"}{t.projectId ? ` · ${state.projects.find((p) => p.id === t.projectId)?.name ?? "No project"}` : ""}</span>
        </li>)}</ul>
        {task ? <TaskDetails key={`${task.id}-${workspace.revision}`} task={task} workspace={workspace} actor={actor} disabled={disabled} save={save} close={() => setTaskId(null)} /> : null}
      </section>
      </TabsContent>

      <TabsContent value="members" keepMounted>
      <section className={`${panel} shadow-soft`} aria-label="Workspace members">
        <div className="flex items-start gap-3"><span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-text"><Users className="size-5" /></span><div><h2 className="text-lg font-semibold">Team members</h2><p className="mt-1 text-sm text-muted-foreground">The people who share your workspace, and what each can do.</p></div></div>
        <ul className="divide-y">{state.members.map((m) => <li key={m.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 py-4 first:pt-1 last:pb-1">
          <div className="flex min-w-0 flex-1 items-center gap-3"><IdentityInitials name={m.name} /><div className="min-w-0"><p className="flex flex-wrap items-center gap-2 font-medium"><span className="break-words">{m.name}</span>{m.id === actorId ? <span className="rounded-md bg-primary-soft px-1.5 py-0.5 text-[10px] font-medium text-primary-soft-text">You</span> : null}</p><p className="mt-0.5 text-sm text-muted-foreground break-all">{m.email}</p></div></div>
          <div className="flex flex-wrap items-center gap-2">
            <RoleBadge role={m.role} />
            {can(actor.role, "member.changeRole") && m.id !== actorId ? <label className="text-sm"><span className="sr-only">Role for {m.name}</span><select className={selectClass} aria-label={`Role for ${m.name}`} value={m.role} disabled={disabled || !ROLES.some((r) => r !== m.role && canChangeRole(actor, m, r, state.members).ok)} onChange={(event) => void save({ type: "member.role", memberId: m.id, role: event.target.value as Role })}>{ROLES.map((r) => <option key={r} value={r} disabled={r !== m.role && !canChangeRole(actor, m, r, state.members).ok}>{ROLE_LABEL[r]}</option>)}</select></label> : null}
            {canRemoveMember(actor, m, state.members).ok ? <Button className="min-h-11" type="button" variant="outline" disabled={disabled} onClick={() => { if (window.confirm(`Remove ${m.name} from this workspace? Their shared tasks will stay.`)) void save({ type: "member.remove", memberId: m.id }); }}>Remove {m.name}</Button> : null}
          </div>
        </li>)}</ul>
        {actor.role === "owner" ? <div className="space-y-2">
          {!workspace.emailVerified ? <p className="text-sm text-muted-foreground">Verify your email from your account settings before inviting people.</p> : null}
          <form onSubmit={async (event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const values = new FormData(form);
            if (await invite({ email: text(values, "email"), role: text(values, "role") as Exclude<Role, "owner"> })) form.reset();
          }} className="flex flex-wrap items-end gap-3"><fieldset className="contents" disabled={disabled || !workspace.emailVerified}>
            <Field label="Invite email"><Input className="h-11" name="email" type="email" required maxLength={320} /></Field>
            <Field label="Invitation role"><select className={selectClass} name="role" defaultValue="member"><option value="admin">Admin</option><option value="member">Member</option><option value="viewer">Viewer</option></select></Field>
            <Button className="min-h-11" type="submit">Send invitation</Button>
          </fieldset></form>
        </div> : <p className="text-sm text-muted-foreground">Owners can send email invitations. Admins can manage projects, tasks and non-owner roles.</p>}
        {workspace.pending.length > 0 ? <div className="space-y-2"><h3 className="font-medium">Pending invitations</h3><ul className="space-y-2">{workspace.pending.map((p) => <li key={p.id} className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm break-all">{p.email} · {ROLE_LABEL[p.role]}</span>{can(actor.role, "member.invite") && (p.role !== "owner" || actor.role === "owner") ? <Button className="min-h-11" type="button" variant="ghost" disabled={disabled} onClick={() => void save({ type: "invitation.cancel", membershipId: p.id })}>Cancel invitation</Button> : null}</li>)}</ul></div> : null}
      </section>
      </TabsContent>
      </Tabs>
      <TeamStats workspace={workspace} />
      </div>
    </div>
  );
}

/** Account-only team UI. It never imports the demo store or personal task data. */
export function AccountTeam() {
  const [teams, setTeams] = useState<WorkspaceLink[]>([]);
  const [selected, setSelected] = useState("");
  const [workspace, setWorkspace] = useState<TeamWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const generation = useRef(0);
  const mutation = useRef(false);

  const load = useCallback(async (id: string) => {
    const ticket = ++generation.current;
    setSelected(id); setWorkspace(null); setLoading(true); setError(""); setNotice(""); setStale(false);
    try {
      const next = await request<TeamWorkspace>(`/api/team/${encodeURIComponent(id)}`);
      if (generation.current === ticket) setWorkspace(next);
    } catch (failure) { if (generation.current === ticket) setError(messageOf(failure)); }
    finally { if (generation.current === ticket) setLoading(false); }
  }, []);

  useEffect(() => {
    let active = true;
    request<{ teams: WorkspaceLink[] }>("/api/team").then((data) => {
      if (!active) return;
      setTeams(data.teams);
      const requested = new URLSearchParams(window.location.search).get("team");
      const first = data.teams.find((t) => t.id === requested) ?? data.teams[0];
      if (first) void load(first.id); else setLoading(false);
    }).catch((failure) => { if (active) { setError(messageOf(failure)); setLoading(false); } });
    return () => {
      active = false;
      // Invalidate whichever request is current when unmounting; this is a
      // generation counter, not a DOM ref whose captured value needs cleanup.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      generation.current++;
    };
  }, [load]);

  async function mutate(body: unknown, path?: string): Promise<boolean> {
    if (!workspace || mutation.current || stale) return false;
    mutation.current = true; setBusy(true); setError(""); setNotice("");
    const ticket = generation.current;
    try {
      const next = await request<TeamWorkspace>(path ?? `/api/team/${encodeURIComponent(selected)}`, body);
      if (ticket === generation.current) {
        setWorkspace(next);
        setTeams((previous) => previous.map((t) => t.id === next.state.workspace.id ? { ...t, name: next.state.workspace.name, role: next.state.members.find((m) => m.id === next.actorId)!.role } : t));
        setNotice("Saved.");
      }
      return true;
    } catch (failure) {
      if (ticket === generation.current) {
        setError(messageOf(failure));
        if (failure instanceof TeamRequestError && failure.status === 409) setStale(true);
      }
      return false;
    } finally { mutation.current = false; setBusy(false); }
  }
  const save: Save = (command) => mutate({ revision: workspace!.revision, command });

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mutation.current) return;
    const form = event.currentTarget;
    const name = text(new FormData(form), "name");
    mutation.current = true; setBusy(true); setError("");
    try {
      const next = await request<TeamWorkspace>("/api/team", { name });
      generation.current++;
      setTeams((previous) => [...previous, { id: next.state.workspace.id, name: next.state.workspace.name, role: "owner" }]);
      setSelected(next.state.workspace.id); setWorkspace(next); setStale(false); setNotice("Workspace created."); form.reset();
    } catch (failure) { setError(messageOf(failure)); }
    finally { mutation.current = false; setBusy(false); }
  }

  return (
    <div className="space-y-5">
      <header><h1 className="text-2xl font-semibold">Team workspace</h1><p className="mt-1 text-sm text-muted-foreground">Shared projects, tasks and conversations for the people you invite.</p></header>
      {error ? <div role="alert" className="rounded-xl border border-danger-text p-3 text-sm">{error}{stale ? <p className="mt-1">Your edit has not been saved. Copy any draft you want to keep before refreshing.</p> : null}</div> : null}
      <p role="status" className="text-sm text-muted-foreground">{loading ? "Loading workspaces…" : busy ? "Saving…" : notice}</p>
      <section className={panel} aria-label="Choose a workspace">
        <div className="flex flex-wrap items-end gap-3">
          {teams.length > 0 ? <Field label="Workspace"><select className={selectClass} value={selected} disabled={busy} onChange={(event) => void load(event.target.value)}>{teams.map((t) => <option key={t.id} value={t.id}>{t.name} · {ROLE_LABEL[t.role]}</option>)}</select></Field> : null}
          <Button type="button" variant="outline" className="min-h-11" disabled={busy || loading} onClick={() => { if (selected) void load(selected); else window.location.reload(); }}>Refresh workspace</Button>
        </div>
        {!loading && teams.length === 0 ? <p className="text-sm text-muted-foreground">You have no team workspaces yet. Create one or accept an email invitation.</p> : null}
        <form onSubmit={create} className="flex flex-wrap items-end gap-3"><fieldset className="contents" disabled={busy || loading}><Field label="New workspace name"><Input className="h-11" name="name" required maxLength={40} /></Field><Button className="min-h-11" type="submit">Create workspace</Button></fieldset></form>
      </section>
      {workspace ? <WorkspaceBody key={workspace.state.workspace.id} workspace={workspace} disabled={busy || stale} save={save} invite={(input) => mutate({ revision: workspace.revision, ...input }, `/api/team/${encodeURIComponent(selected)}/invitations`)} /> : null}
    </div>
  );
}

/** Token use is an explicit same-origin POST, never a GET or a browser SDK session. */
export function AcceptTeamInvitation() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [joined, setJoined] = useState<string | null>(null);
  async function accept() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const params = new URLSearchParams(window.location.search);
      const result = await request<{ teamId: string }>("/api/team/accept-invitation", {
        teamId: params.get("teamId"), membershipId: params.get("membershipId"), userId: params.get("userId"), secret: params.get("secret"),
      });
      window.history.replaceState(null, "", "/accept-invitation");
      setJoined(result.teamId);
    } catch (failure) { setError(messageOf(failure)); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-lg space-y-4 px-4 py-16">
    <h1 className="text-2xl font-semibold">Join your team</h1>
    {joined ? <><p role="status">Invitation accepted.</p><a className="inline-flex min-h-11 items-center font-medium text-primary-text underline" href={`/app/team?team=${encodeURIComponent(joined)}`}>Open team workspace</a></> : <>
      <p className="text-sm text-muted-foreground">Sign in with the email that received this invitation, then accept it here. If this is a new account, use password recovery to set a password first.</p>
      <a className="inline-flex min-h-11 items-center font-medium text-primary-text underline" href="/sign-in" target="_blank" rel="noopener noreferrer">Sign in in a new tab</a>
      {error ? <p role="alert" className="text-sm text-danger-text">{error}</p> : null}
      <div><Button className="min-h-11" type="button" disabled={busy} onClick={() => void accept()}>{busy ? "Accepting…" : "Accept invitation"}</Button></div>
    </>}
  </main>;
}
