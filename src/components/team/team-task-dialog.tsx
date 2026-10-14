"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { NativeSelect } from "@/components/settings/controls";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { applyTeam, newId } from "@/data/team-actions";
import { PRIORITIES, PRIORITY_LABEL, type Priority } from "@/domain/tasks";
import * as ops from "@/domain/team/ops";
import { canAssign, canCommentDelete, canDeleteTask, canEditTask, can } from "@/domain/team/permissions";
import { STATUS_LABEL, TASK_STATUSES, type Member, type TeamState, type TeamTask, type TeamTaskStatus } from "@/domain/team/types";
import { MemberAvatar } from "./common";

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function Body({ task, state, viewer, onClose }: { task: TeamTask; state: TeamState; viewer: Member; onClose: () => void }) {
  const [comment, setComment] = useState("");
  const edit = canEditTask(viewer.role, task, viewer.id);
  const readOnly = !edit.ok;
  const anyone = can(viewer.role, "task.assignAny");
  const update = (patch: ops.TaskPatch): void => {
    applyTeam((s, a) => ops.updateTask(s, a, task.id, patch));
  };

  return (
    <div className="space-y-4">
      {readOnly ? (
        <p className="rounded-xl bg-muted/60 px-3 py-2 text-sm text-muted-foreground">{edit.ok ? "" : edit.reason}</p>
      ) : null}

      <label className="block space-y-1.5 text-sm font-medium">
        Title
        <Input
          defaultValue={task.title}
          readOnly={readOnly}
          maxLength={120}
          onBlur={(e) => {
            if (!readOnly && e.target.value.trim() !== task.title) {
              if (!applyTeam((s, a) => ops.updateTask(s, a, task.id, { title: e.target.value }))) e.target.value = task.title;
            }
          }}
          className="h-10 rounded-xl border-input bg-card"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1.5 text-sm font-medium">
          Status
          <NativeSelect value={task.status} disabled={readOnly} onChange={(e) => update({ status: e.target.value as TeamTaskStatus })} className="min-w-0">
            {TASK_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </NativeSelect>
        </label>
        <label className="block space-y-1.5 text-sm font-medium">
          Assigned to
          <NativeSelect value={task.assigneeId ?? ""} disabled={readOnly} onChange={(e) => update({ assigneeId: e.target.value || null })} className="min-w-0">
            <option value="">Unassigned</option>
            {state.members.map((m) => (
              <option key={m.id} value={m.id} disabled={!canAssign(viewer.role, viewer.id, m.id).ok && m.id !== task.assigneeId}>
                {m.name}
                {m.id === viewer.id ? " (you)" : ""}
              </option>
            ))}
          </NativeSelect>
        </label>
        <label className="block space-y-1.5 text-sm font-medium">
          Priority
          <NativeSelect value={task.priority} disabled={readOnly} onChange={(e) => update({ priority: e.target.value as Priority })} className="min-w-0">
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABEL[p]}
              </option>
            ))}
          </NativeSelect>
        </label>
        <label className="block space-y-1.5 text-sm font-medium">
          Project
          <NativeSelect value={task.projectId ?? ""} disabled={readOnly} onChange={(e) => update({ projectId: e.target.value || null })} className="min-w-0">
            <option value="">No project</option>
            {state.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </NativeSelect>
        </label>
        <label className="block space-y-1.5 text-sm font-medium">
          Deadline
          <Input type="date" defaultValue={task.deadline ?? ""} readOnly={readOnly} disabled={readOnly} onChange={(e) => update({ deadline: e.target.value || null })} className="h-10 rounded-xl border-input bg-card" />
        </label>
        <label className="block space-y-1.5 text-sm font-medium">
          Length (minutes)
          <Input
            type="number"
            min={5}
            max={720}
            step={5}
            defaultValue={task.durationMin}
            disabled={readOnly}
            onBlur={(e) => {
              const value = Number(e.target.value);
              if (value >= 5 && value <= 720 && value !== task.durationMin) update({ durationMin: value });
            }}
            className="h-10 rounded-xl border-input bg-card"
          />
        </label>
      </div>

      {!anyone && !readOnly ? <p className="text-xs text-muted-foreground">Members can only assign tasks to themselves.</p> : null}

      <label className="block space-y-1.5 text-sm font-medium">
        Notes
        <Textarea
          defaultValue={task.notes}
          readOnly={readOnly}
          rows={3}
          maxLength={1000}
          onBlur={(e) => !readOnly && e.target.value !== task.notes && update({ notes: e.target.value })}
          className="rounded-xl border-input bg-card"
        />
      </label>

      <section aria-labelledby="team-comments">
        <h3 id="team-comments" className="text-sm font-semibold">
          Comments ({task.comments.length})
        </h3>
        {task.comments.length === 0 ? <p className="mt-1 text-sm text-muted-foreground">No comments yet.</p> : null}
        <ul className="mt-2 max-h-52 space-y-2 overflow-y-auto pr-1">
          {task.comments.map((c) => {
            const author = state.members.find((m) => m.id === c.authorId);
            const mayDelete = canCommentDelete(viewer.role, c, viewer.id).ok;
            return (
              <li key={c.id} className="flex gap-2 rounded-xl border p-2.5">
                {author ? <MemberAvatar member={author} className="size-7 text-[10px]" /> : null}
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{author?.name ?? "Former member"}</span> · {formatWhen(c.at)}
                  </p>
                  <p className="mt-0.5 text-sm break-words whitespace-pre-wrap">{c.text}</p>
                </div>
                {mayDelete ? (
                  <Button variant="ghost" size="icon-lg" aria-label="Delete comment" onClick={() => applyTeam((s, a) => ops.deleteComment(s, a, task.id, c.id))}>
                    <Trash2 aria-hidden="true" />
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
        {can(viewer.role, "comment.create") ? (
          <form
            noValidate
            className="mt-2 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (applyTeam((s, a) => ops.addComment(s, a, task.id, comment, newId(), new Date().toISOString()))) setComment("");
            }}
          >
            <Input aria-label="Write a comment" placeholder="Write a comment…" value={comment} maxLength={500} onChange={(e) => setComment(e.target.value)} className="h-10 flex-1 rounded-xl border-input bg-card" />
            <Button type="submit" size="lg" className="h-10">
              Comment
            </Button>
          </form>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">Viewers can read comments but not write them.</p>
        )}
      </section>

      {canDeleteTask(viewer.role).ok ? (
        <Button
          variant="destructive"
          size="lg"
          onClick={() => {
            if (applyTeam((s, a) => ops.deleteTask(s, a, task.id))) {
              toast(`Deleted “${task.title}”.`);
              onClose();
            }
          }}
        >
          <Trash2 aria-hidden="true" /> Delete task
        </Button>
      ) : null}
    </div>
  );
}

/** A team task's details and comments. Changes save as you make them, if your role allows. */
export function TeamTaskDialog({ task, state, viewer, onClose }: { task: TeamTask | null; state: TeamState; viewer: Member; onClose: () => void }) {
  return (
    <Dialog open={task !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Team task</DialogTitle>
          <DialogDescription>Shared with the team. Changes save as you make them.</DialogDescription>
        </DialogHeader>
        {task ? <Body key={task.id} task={task} state={state} viewer={viewer} onClose={onClose} /> : null}
      </DialogContent>
    </Dialog>
  );
}
