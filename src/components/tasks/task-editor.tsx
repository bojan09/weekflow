"use client";

import { useState, type FormEvent } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { NativeSelect, SegmentedControl, ToggleRow } from "@/components/settings/controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { mutateTasks, newTaskId, tasksCollection } from "@/data/tasks";
import { useCollection } from "@/data/use-collection";
import { addTask, buildTask, wouldCreateCycle } from "@/domain/task-ops";
import {
  CATEGORIES,
  PRIORITIES,
  PRIORITY_LABEL,
  taskSchema,
  type CategoryId,
  type ChecklistItem,
  type Priority,
  type Task,
} from "@/domain/tasks";
import { useNow } from "@/hooks/use-now";
import { localISO } from "@/lib/dates";
import { timeToMinutes } from "@/lib/time";
import { usePlannerStore } from "@/stores/planner";
import { usePrefsStore } from "@/prefs/store";
import { useUiStore, type EditorTarget } from "@/stores/ui";
import { removeTask } from "./actions";

type Mode = "none" | "day" | "time";

interface Draft {
  title: string;
  notes: string;
  durationMin: number;
  priority: Priority;
  category: CategoryId;
  deadline: string;
  earliestStart: string;
  labels: string[];
  checklist: ChecklistItem[];
  dependsOn: string[];
  done: boolean;
  actualMin: string;
  mode: Mode;
  date: string;
  time: string;
  locked: boolean;
}

const DURATION_CHIPS = [15, 30, 45, 60, 90, 120] as const;

const pad = (n: number): string => String(n).padStart(2, "0");
const toTime = (min: number): string => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;

function draftFromTask(task: Task, today: string): Draft {
  const placement = task.placement;
  return {
    title: task.title,
    notes: task.notes,
    durationMin: task.durationMin,
    priority: task.priority,
    category: task.category,
    deadline: task.deadline ?? "",
    earliestStart: task.earliestStart ?? "",
    labels: task.labels,
    checklist: task.checklist,
    dependsOn: task.dependsOn,
    done: task.status === "done",
    actualMin: task.actualMin === null ? "" : String(task.actualMin),
    mode: !placement ? "none" : placement.startMin === null ? "day" : "time",
    date: placement?.date ?? today,
    time: placement?.startMin == null ? "09:00" : toTime(placement.startMin),
    locked: task.locked,
  };
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} role="alert" className="mt-1.5 text-xs text-danger-text">
      {message}
    </p>
  ) : null;
}

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}

function EditorForm({ target }: { target: Exclude<EditorTarget, null> }) {
  const now = useNow();
  const closeEditor = useUiStore((s) => s.closeEditor);
  const workspace = usePrefsStore((s) => s.prefs.workspace);
  const anchor = usePlannerStore((s) => s.anchor);
  const all = tasksCollection.getSnapshot();
  const existing = target.kind === "edit" ? all.find((t) => t.id === target.id) : undefined;
  const today = now?.date ?? localISO(new Date());

  const [draft, setDraft] = useState<Draft>(() => {
    if (existing) return draftFromTask(existing, today);
    const d = target.kind === "new" ? target.defaults : undefined;
    const placement = d?.placement ?? null;
    return {
      title: d?.title ?? "",
      notes: "",
      durationMin: d?.durationMin ?? workspace.defaultDurationMin,
      priority: d?.priority ?? workspace.defaultPriority,
      category: d?.category ?? "work",
      deadline: d?.deadline ?? "",
      earliestStart: "",
      labels: [],
      checklist: [],
      dependsOn: [],
      done: false,
      actualMin: "",
      mode: !placement ? "none" : placement.startMin === null ? "day" : "time",
      date: placement?.date ?? anchor ?? today,
      time: placement?.startMin == null ? "09:00" : toTime(placement.startMin),
      locked: false,
    };
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [labelInput, setLabelInput] = useState("");
  const [checkInput, setCheckInput] = useState("");

  const set = <K extends keyof Draft>(key: K, value: Draft[K]): void => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => (key in e ? Object.fromEntries(Object.entries(e).filter(([k]) => k !== key)) : e));
  };

  const addLabel = (): void => {
    const label = labelInput.trim().replace(/,$/, "");
    if (label && !draft.labels.includes(label) && draft.labels.length < 8) set("labels", [...draft.labels, label]);
    setLabelInput("");
  };

  const addCheck = (): void => {
    const text = checkInput.trim();
    if (text && draft.checklist.length < 30) {
      set("checklist", [...draft.checklist, { id: crypto.randomUUID(), text, done: false }]);
    }
    setCheckInput("");
  };

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    const placement =
      draft.mode === "none"
        ? null
        : { date: draft.date, startMin: draft.mode === "day" ? null : timeToMinutes(draft.time) };
    const base: Task = existing ?? buildTask({ title: draft.title, durationMin: draft.durationMin, priority: draft.priority }, newTaskId(), new Date().toISOString());
    const candidate: Task = {
      ...base,
      title: draft.title,
      notes: draft.notes,
      durationMin: draft.durationMin,
      priority: draft.priority,
      category: draft.category,
      deadline: draft.deadline || null,
      earliestStart: draft.earliestStart || null,
      labels: draft.labels,
      checklist: draft.checklist,
      dependsOn: draft.dependsOn,
      status: draft.done ? "done" : "todo",
      completedOn: draft.done ? (existing?.completedOn ?? now?.date ?? null) : null,
      actualMin: draft.actualMin === "" ? null : Number(draft.actualMin),
      placement,
      locked: placement !== null && draft.locked,
    };
    const parsed = taskSchema.safeParse(candidate);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    mutateTasks((tasks) =>
      existing ? tasks.map((t) => (t.id === existing.id ? parsed.data : t)) : addTask(tasks, parsed.data),
    );
    toast.success(existing ? "Task saved" : "Task added");
    closeEditor();
  };

  const candidates = all.filter((t) => t.id !== existing?.id && t.status === "todo");

  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto px-4 pb-4">
        <Field label="Title" htmlFor="te-title">
          <Input
            id="te-title"
            autoFocus={!existing}
            value={draft.title}
            maxLength={120}
            onChange={(e) => set("title", e.target.value)}
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? "te-title-error" : undefined}
            className="h-10 rounded-xl border-input bg-card"
          />
          <FieldError id="te-title-error" message={errors.title} />
        </Field>

        <Field label="Notes" htmlFor="te-notes">
          <Textarea
            id="te-notes"
            value={draft.notes}
            rows={3}
            onChange={(e) => set("notes", e.target.value)}
            className="rounded-xl border-input bg-card"
          />
        </Field>

        <Field label="Estimated length" htmlFor="te-duration">
          <div className="flex flex-wrap items-center gap-2">
            {DURATION_CHIPS.map((minutes) => (
              <button
                key={minutes}
                type="button"
                aria-pressed={draft.durationMin === minutes}
                onClick={() => set("durationMin", minutes)}
                className={
                  draft.durationMin === minutes
                    ? "h-9 rounded-xl border border-primary-border bg-primary-soft px-3 text-sm font-medium text-primary-soft-text ring-1 ring-primary-text/40"
                    : "h-9 rounded-xl border bg-card px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                }
              >
                {minutes < 60 ? `${minutes}m` : `${minutes / 60}h`}
              </button>
            ))}
            <span className="flex items-center gap-1.5">
              <Input
                id="te-duration"
                type="number"
                min={5}
                max={720}
                step={5}
                value={draft.durationMin}
                onChange={(e) => set("durationMin", Number(e.target.value))}
                aria-invalid={Boolean(errors.durationMin)}
                className="h-9 w-20 rounded-xl border-input bg-card"
              />
              <span className="text-sm text-muted-foreground">min</span>
            </span>
          </div>
          <FieldError id="te-duration-error" message={errors.durationMin} />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Priority">
            <SegmentedControl
              label="Priority"
              value={draft.priority}
              onChange={(priority) => set("priority", priority)}
              options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABEL[p] }))}
              className="flex-nowrap [&>button]:min-w-0 [&>button]:px-2"
            />
          </Field>
          <Field label="Category" htmlFor="te-category">
            <NativeSelect
              id="te-category"
              value={draft.category}
              onChange={(e) => set("category", e.target.value as CategoryId)}
              className="min-w-0"
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Deadline" htmlFor="te-deadline">
            <Input
              id="te-deadline"
              type="date"
              value={draft.deadline}
              onChange={(e) => set("deadline", e.target.value)}
              className="h-10 rounded-xl border-input bg-card"
            />
          </Field>
          <Field label="Earliest start" htmlFor="te-earliest">
            <Input
              id="te-earliest"
              type="date"
              value={draft.earliestStart}
              onChange={(e) => set("earliestStart", e.target.value)}
              className="h-10 rounded-xl border-input bg-card"
            />
          </Field>
        </div>

        <fieldset className="space-y-3 rounded-2xl border p-4">
          <legend className="px-1 text-sm font-medium">Where it goes</legend>
          <SegmentedControl<Mode>
            label="Placement"
            value={draft.mode}
            onChange={(mode) => set("mode", mode)}
            options={[
              { value: "none", label: "Inbox" },
              { value: "day", label: "Any time on a day" },
              { value: "time", label: "At a time" },
            ]}
            className="flex-nowrap [&>button]:min-w-0 [&>button]:px-2 [&>button]:text-xs"
          />
          {draft.mode !== "none" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Day" htmlFor="te-date">
                <Input
                  id="te-date"
                  type="date"
                  value={draft.date}
                  onChange={(e) => set("date", e.target.value)}
                  className="h-10 rounded-xl border-input bg-card"
                />
              </Field>
              {draft.mode === "time" ? (
                <Field label="Start time" htmlFor="te-time">
                  <Input
                    id="te-time"
                    type="time"
                    step={300}
                    value={draft.time}
                    onChange={(e) => set("time", e.target.value)}
                    className="h-10 rounded-xl border-input bg-card"
                  />
                </Field>
              ) : null}
            </div>
          ) : null}
          <FieldError id="te-place-error" message={errors.placement ?? errors.locked} />
          {draft.mode !== "none" ? (
            <ToggleRow
              label={draft.mode === "day" ? "Pin to this day" : "Lock in place"}
              description="Locked tasks never move, whether you drag or the planner reshuffles."
              checked={draft.locked}
              onChange={(locked) => set("locked", locked)}
            />
          ) : null}
        </fieldset>

        <Field label="Labels" htmlFor="te-label">
          <div className="flex flex-wrap items-center gap-1.5">
            {draft.labels.map((label) => (
              <span key={label} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs">
                {label}
                <button
                  type="button"
                  aria-label={`Remove label ${label}`}
                  onClick={() => set("labels", draft.labels.filter((l) => l !== label))}
                  className="rounded-full text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3" aria-hidden="true" />
                </button>
              </span>
            ))}
            <Input
              id="te-label"
              value={labelInput}
              placeholder="Add a label, press Enter"
              maxLength={24}
              onChange={(e) => setLabelInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addLabel();
                }
              }}
              onBlur={addLabel}
              className="h-9 min-w-40 flex-1 rounded-xl border-input bg-card"
            />
          </div>
        </Field>

        <Field label="Checklist" htmlFor="te-check">
          <ul className="space-y-1.5">
            {draft.checklist.map((item) => (
              <li key={item.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={item.done}
                  aria-label={`Done: ${item.text}`}
                  onChange={(e) =>
                    set("checklist", draft.checklist.map((c) => (c.id === item.id ? { ...c, done: e.target.checked } : c)))
                  }
                  className="size-4 accent-primary"
                />
                <span className={item.done ? "flex-1 text-sm text-muted-foreground line-through" : "flex-1 text-sm"}>
                  {item.text}
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${item.text}`}
                  onClick={() => set("checklist", draft.checklist.filter((c) => c.id !== item.id))}
                  className="rounded p-1 text-muted-foreground hover:text-foreground"
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Input
              id="te-check"
              value={checkInput}
              placeholder="Add a step"
              maxLength={120}
              onChange={(e) => setCheckInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCheck();
                }
              }}
              className="h-9 flex-1 rounded-xl border-input bg-card"
            />
            <Button type="button" variant="outline" size="lg" onClick={addCheck} className="h-9">
              <Plus aria-hidden="true" /> Add
            </Button>
          </div>
        </Field>

        {candidates.length > 0 ? (
          <details className="rounded-2xl border px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium">
              Depends on {draft.dependsOn.length > 0 ? `(${draft.dependsOn.length})` : ""}
            </summary>
            <p className="mt-1 text-xs text-muted-foreground">This task waits until the ones you tick are finished.</p>
            <ul className="mt-2 max-h-44 space-y-1.5 overflow-y-auto">
              {candidates.map((candidate) => {
                const checked = draft.dependsOn.includes(candidate.id);
                const blocked =
                  !checked && wouldCreateCycle(all, existing?.id ?? "new", [...draft.dependsOn, candidate.id]);
                return (
                  <li key={candidate.id}>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={blocked}
                        onChange={(e) =>
                          set(
                            "dependsOn",
                            e.target.checked
                              ? [...draft.dependsOn, candidate.id]
                              : draft.dependsOn.filter((id) => id !== candidate.id),
                          )
                        }
                        className="size-4 accent-primary"
                      />
                      <span className="truncate">{candidate.title}</span>
                      {blocked ? <span className="text-xs text-muted-foreground">(would loop)</span> : null}
                    </label>
                  </li>
                );
              })}
            </ul>
          </details>
        ) : null}

        {existing ? (
          <div className="space-y-3 rounded-2xl border p-4">
            <ToggleRow
              label="Completed"
              checked={draft.done}
              onChange={(done) => set("done", done)}
            />
            <Field label="Time actually spent" htmlFor="te-actual">
              <span className="flex items-center gap-2">
                <Input
                  id="te-actual"
                  type="number"
                  min={0}
                  max={1440}
                  step={5}
                  value={draft.actualMin}
                  placeholder="Optional"
                  onChange={(e) => set("actualMin", e.target.value)}
                  className="h-9 w-28 rounded-xl border-input bg-card"
                />
                <span className="text-sm text-muted-foreground">min (estimate: {existing.durationMin})</span>
              </span>
              <FieldError id="te-actual-error" message={errors.actualMin} />
            </Field>
          </div>
        ) : null}
      </div>

      <SheetFooter className="flex-row items-center justify-between gap-2 border-t">
        {existing ? (
          <Button
            type="button"
            variant="destructive"
            size="lg"
            onClick={() => {
              removeTask(existing);
              closeEditor();
            }}
          >
            <Trash2 aria-hidden="true" /> Delete
          </Button>
        ) : (
          <span />
        )}
        <span className="flex gap-2">
          <Button type="button" variant="outline" size="lg" onClick={closeEditor}>
            Cancel
          </Button>
          <Button type="submit" size="lg">
            {existing ? "Save" : "Add task"}
          </Button>
        </span>
      </SheetFooter>
    </form>
  );
}

/** Global task editor. Opened from anywhere through the UI store. */
export function TaskEditor() {
  const editor = useUiStore((s) => s.editor);
  const closeEditor = useUiStore((s) => s.closeEditor);
  const tasks = useCollection(tasksCollection);
  const key = editor ? (editor.kind === "edit" ? editor.id : `new-${JSON.stringify(editor.defaults ?? {})}`) : "closed";
  const ready = tasks.status === "ready";

  return (
    <Sheet open={editor !== null && ready} onOpenChange={(open) => !open && closeEditor()}>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{editor?.kind === "edit" ? "Edit task" : "New task"}</SheetTitle>
          <SheetDescription>
            {editor?.kind === "edit" ? "Change anything, then save." : "Capture it now, schedule it later."}
          </SheetDescription>
        </SheetHeader>
        {editor ? <EditorForm key={key} target={editor} /> : null}
      </SheetContent>
    </Sheet>
  );
}
