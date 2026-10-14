"use client";

import { useMemo, useState, type FormEvent } from "react";
import { CalendarClock, FolderKanban, MessageSquare, Plus, Trash2 } from "lucide-react";
import { NativeSelect } from "@/components/settings/controls";
import { TASK_STYLE } from "@/components/tasks/task-style";
import { PriorityBadge } from "@/components/tasks/task-meta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { applyTeam, newId } from "@/data/team-actions";
import { can } from "@/domain/team/permissions";
import * as ops from "@/domain/team/ops";
import { STATUS_LABEL, TASK_STATUSES, type Member, type TeamState, type TeamTask } from "@/domain/team/types";
import { TASK_HUES, type TaskHue } from "@/domain/tasks";
import { formatShort } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { MemberAvatar } from "./common";
import { TeamTaskDialog } from "./team-task-dialog";

function AddTask({ state, viewer }: { state: TeamState; viewer: Member }) {
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState("");
  const [project, setProject] = useState("");
  const allowed = can(viewer.role, "task.create");
  const anyone = can(viewer.role, "task.assignAny");

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    const ok = applyTeam((s, actor) =>
      ops.addTask(s, actor, { title, assigneeId: assignee || null, projectId: project || null }, newId(), new Date().toISOString()),
    );
    if (ok) {
      setTitle("");
      setAssignee("");
    }
  };

  if (!allowed) {
    return <p className="rounded-xl bg-muted/60 px-3 py-3 text-sm text-muted-foreground">Viewers can read tasks but not add or change them.</p>;
  }
  return (
    <form onSubmit={submit} noValidate className="flex flex-wrap gap-2">
      <Input
        aria-label="New team task title"
        placeholder="Add a task for the team…"
        value={title}
        maxLength={120}
        onChange={(e) => setTitle(e.target.value)}
        className="h-10 min-w-48 flex-1 rounded-xl border-input bg-card"
      />
      <NativeSelect aria-label="Assign to" value={assignee} onChange={(e) => setAssignee(e.target.value)} className="h-10 min-w-36">
        <option value="">Unassigned</option>
        {state.members
          .filter((m) => anyone || m.id === viewer.id)
          .map((m) => (
            <option key={m.id} value={m.id}>
              {m.id === viewer.id ? `${m.name} (you)` : m.name}
            </option>
          ))}
      </NativeSelect>
      <NativeSelect aria-label="Project" value={project} onChange={(e) => setProject(e.target.value)} className="h-10 min-w-36">
        <option value="">No project</option>
        {state.projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </NativeSelect>
      <Button type="submit" size="lg" className="h-10">
        <Plus aria-hidden="true" /> Add task
      </Button>
    </form>
  );
}

function Projects({ state, viewer }: { state: TeamState; viewer: Member }) {
  const [name, setName] = useState("");
  const [hue, setHue] = useState<TaskHue>("teal");
  const manage = can(viewer.role, "project.manage");
  return (
    <details className="rounded-2xl border bg-card px-4 py-3">
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium">
        <FolderKanban className="size-4" aria-hidden="true" /> Shared projects ({state.projects.length})
      </summary>
      <ul className="mt-2 space-y-1.5">
        {state.projects.map((p) => (
          <li key={p.id} className="flex items-center gap-2 text-sm">
            <span className={cn("size-3 rounded-sm", TASK_STYLE[p.hue].dot)} aria-hidden="true" />
            <span className="flex-1">{p.name}</span>
            {manage ? (
              <Button variant="ghost" size="icon-lg" aria-label={`Delete project ${p.name}`} onClick={() => applyTeam((s, a) => ops.deleteProject(s, a, p.id))}>
                <Trash2 aria-hidden="true" />
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
      {manage ? (
        <form
          noValidate
          className="mt-2 flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (applyTeam((s, a) => ops.addProject(s, a, newId(), name, hue))) setName("");
          }}
        >
          <Input aria-label="New project name" placeholder="New project" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} className="h-9 min-w-40 flex-1 rounded-xl border-input bg-card" />
          <NativeSelect aria-label="New project colour" value={hue} onChange={(e) => setHue(e.target.value as TaskHue)} className="h-9 min-w-28">
            {TASK_HUES.map((h) => (
              <option key={h} value={h}>
                {h[0]?.toUpperCase()}
                {h.slice(1)}
              </option>
            ))}
          </NativeSelect>
          <Button type="submit" size="lg" className="h-9">
            Add
          </Button>
        </form>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">Only owners and admins manage projects.</p>
      )}
    </details>
  );
}

function TaskCard({ task, state, onOpen }: { task: TeamTask; state: TeamState; onOpen: () => void }) {
  const assignee = state.members.find((m) => m.id === task.assigneeId);
  const project = state.projects.find((p) => p.id === task.projectId);
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-2xl border bg-card p-3">
      <button type="button" onClick={onOpen} className="min-h-11 min-w-0 flex-1 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span className="block truncate text-sm font-medium">{task.title}</span>
        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {project ? (
            <span className="inline-flex items-center gap-1.5">
              <span className={cn("size-2 rounded-sm", TASK_STYLE[project.hue].dot)} aria-hidden="true" />
              {project.name}
            </span>
          ) : null}
          <PriorityBadge priority={task.priority} />
          {task.deadline ? (
            <span className="inline-flex items-center gap-1 tabular-nums">
              <CalendarClock className="size-3.5" aria-hidden="true" /> Due {formatShort(task.deadline)}
            </span>
          ) : null}
          {task.comments.length > 0 ? (
            <span className="inline-flex items-center gap-1 tabular-nums">
              <MessageSquare className="size-3.5" aria-hidden="true" />
              {task.comments.length}
              <span className="sr-only">{task.comments.length === 1 ? " comment" : " comments"}</span>
            </span>
          ) : null}
        </span>
      </button>
      <span className="flex items-center gap-2 text-xs">
        {assignee ? (
          <>
            <MemberAvatar member={assignee} className="size-7 text-[10px]" />
            <span className="hidden sm:inline">{assignee.name}</span>
            <span className="sr-only sm:hidden">{assignee.name}</span>
          </>
        ) : (
          <span className="text-muted-foreground">Unassigned</span>
        )}
      </span>
    </li>
  );
}

export function TeamTasks({ state, viewer }: { state: TeamState; viewer: Member }) {
  const [project, setProject] = useState("all");
  const [assignee, setAssignee] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const visible = useMemo(
    () =>
      state.tasks.filter(
        (t) =>
          (project === "all" || (project === "none" ? t.projectId === null : t.projectId === project)) &&
          (assignee === "all" || (assignee === "none" ? t.assigneeId === null : t.assigneeId === assignee)),
      ),
    [state.tasks, project, assignee],
  );
  const open = state.tasks.find((t) => t.id === openId) ?? null;

  return (
    <div className="space-y-4">
      <AddTask state={state} viewer={viewer} />
      <Projects state={state} viewer={viewer} />

      <div className="flex flex-wrap items-center gap-2">
        <NativeSelect aria-label="Filter by project" value={project} onChange={(e) => setProject(e.target.value)} className="h-9 min-w-36">
          <option value="all">All projects</option>
          <option value="none">No project</option>
          {state.projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="Filter by person" value={assignee} onChange={(e) => setAssignee(e.target.value)} className="h-9 min-w-36">
          <option value="all">Everyone</option>
          <option value="none">Unassigned</option>
          {state.members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </NativeSelect>
        <p role="status" className="text-sm text-muted-foreground">
          {visible.length} {visible.length === 1 ? "task" : "tasks"}
        </p>
      </div>

      {TASK_STATUSES.map((status) => {
        const tasks = visible.filter((t) => t.status === status);
        return (
          <section key={status} aria-labelledby={`team-status-${status}`}>
            <h2 id={`team-status-${status}`} className="mb-2 text-sm font-semibold">
              {STATUS_LABEL[status]} <span className="font-normal text-muted-foreground tabular-nums">({tasks.length})</span>
            </h2>
            {tasks.length === 0 ? (
              <p className="rounded-xl bg-muted/50 px-3 py-3 text-sm text-muted-foreground">Nothing here.</p>
            ) : (
              <ul className="space-y-2">
                {tasks.map((task) => (
                  <TaskCard key={task.id} task={task} state={state} onOpen={() => setOpenId(task.id)} />
                ))}
              </ul>
            )}
          </section>
        );
      })}

      <TeamTaskDialog task={open} state={state} viewer={viewer} onClose={() => setOpenId(null)} />
    </div>
  );
}
