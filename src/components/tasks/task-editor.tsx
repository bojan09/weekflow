"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Clock3, Minus, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { NativeSelect, SegmentedControl, ToggleRow } from "@/components/settings/controls";
import { Term } from "@/components/guide/term";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { mutateTemplates, templatesCollection } from "@/data/templates";
import { mutateTasks, newTaskId, tasksCollection } from "@/data/tasks";
import { useCollection } from "@/data/use-collection";
import { nextOccurrence } from "@/domain/recurrence";
import { addTask, buildTask, wouldCreateCycle } from "@/domain/task-ops";
import { saveTemplate, templateFromTask, type Template } from "@/domain/templates";
import {
  allCategories,
  PRIORITIES,
  PRIORITY_LABEL,
  taskSchema,
  type CategoryId,
  type ChecklistItem,
  type Priority,
  type RecurrenceFreq,
  type Task,
} from "@/domain/tasks";
import { useProjects, useTemplates } from "@/hooks/use-lists";
import { useNow } from "@/hooks/use-now";
import { formatDuration } from "@/domain/stats";
import { localISO } from "@/lib/dates";
import { timeToMinutes, orderedWeekdays } from "@/lib/time";
import { usePlannerStore } from "@/stores/planner";
import { usePrefsStore } from "@/prefs/store";
import { useUiStore, type EditorTarget } from "@/stores/ui";
import { removeTask } from "./actions";

type Mode = "none" | "day" | "time";

interface RepeatDraft {
  freq: "none" | RecurrenceFreq;
  interval: number;
  weekdays: number[];
  until: string;
}

const NO_REPEAT: RepeatDraft = { freq: "none", interval: 1, weekdays: [], until: "" };

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
  /** Project id, or "" for none. */
  projectId: string;
  repeat: RepeatDraft;
}

const DURATION_CHIPS = [15, 30, 60, 120] as const;

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
    projectId: task.projectId ?? "",
    repeat: task.recurrence
      ? { freq: task.recurrence.freq, interval: task.recurrence.interval, weekdays: task.recurrence.weekdays, until: task.recurrence.until ?? "" }
      : NO_REPEAT,
  };
}

/** Fill a new-task draft from a saved template. */
function applyTemplate(draft: Draft, template: Template): Draft {
  return {
    ...draft,
    title: template.title,
    notes: template.notes,
    durationMin: template.durationMin,
    priority: template.priority,
    category: template.category,
    labels: [...template.labels],
    checklist: template.steps.map((text) => ({ id: crypto.randomUUID(), text, done: false })),
    projectId: template.projectId ?? "",
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
    <div className="min-w-0 space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium">
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
  const stepMin = usePrefsStore((s) => s.prefs.calendar.timeStepMin);
  const updatePrefs = usePrefsStore((s) => s.update);
  const setEditorTiming = useUiStore((s) => s.setEditorTiming);
  const anchor = usePlannerStore((s) => s.anchor);
  const all = tasksCollection.getSnapshot();
  const existing = target.kind === "edit" ? all.find((t) => t.id === target.id) : undefined;
  const today = now?.date ?? localISO(new Date());

  const [draft, setDraft] = useState<Draft>(() => {
    if (existing) return draftFromTask(existing, today);
    const d = target.kind === "new" ? target.defaults : undefined;
    const placement = d?.placement ?? null;
    const base: Draft = {
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
      projectId: "",
      repeat: NO_REPEAT,
    };
    const template = d?.templateId ? templatesCollection.getSnapshot().find((t) => t.id === d.templateId) : undefined;
    return template ? applyTemplate(base, template) : base;
  });
  const projects = useProjects();
  const templates = useTemplates();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [labelInput, setLabelInput] = useState("");
  const [checkInput, setCheckInput] = useState("");
  const startMin = timeToMinutes(draft.time);
  const finishMin = startMin + draft.durationMin;

  useEffect(() => {
    if (!existing) return;
    const placement = draft.mode === "none" ? null : { date: draft.date, startMin: draft.mode === "day" ? null : timeToMinutes(draft.time) };
    const valid = taskSchema.safeParse({ ...existing, durationMin: draft.durationMin, placement });
    setEditorTiming(valid.success ? { id: existing.id, durationMin: valid.data.durationMin, placement: valid.data.placement } : null);
  }, [existing, draft.durationMin, draft.mode, draft.date, draft.time, setEditorTiming]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]): void => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((errors) => Object.fromEntries(Object.entries(errors).filter(([field]) => field !== key && !(field === "end" && (key === "time" || key === "durationMin" || key === "mode")))));
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
    if (errors.end) return;
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
      projectId: draft.projectId || null,
      recurrence:
        draft.repeat.freq === "none"
          ? null
          : {
              freq: draft.repeat.freq,
              interval: draft.repeat.interval,
              weekdays: draft.repeat.freq === "weekly" ? draft.repeat.weekdays : [],
              until: draft.repeat.until || null,
            },
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
    const finishing = existing?.status === "todo" && parsed.data.status === "done";
    const copy = finishing ? nextOccurrence(parsed.data, now?.date ?? today, newTaskId(), new Date().toISOString()) : null;
    mutateTasks((tasks) => {
      const next = existing ? tasks.map((t) => (t.id === existing.id ? parsed.data : t)) : addTask(tasks, parsed.data);
      return copy ? [...next, copy] : next;
    });
    toast.success(copy ? "Task saved. The next one is added." : existing ? "Task saved" : "Task added");
    closeEditor();
  };

  const candidates = all.filter((t) => t.id !== existing?.id && t.status === "todo");

  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="task-editor-fields flex-1 space-y-5 overflow-y-auto px-5 pb-6">
        {Object.entries(errors).filter(([, message]) => Boolean(message)).length > 0 && <div role="alert" className="rounded-xl border border-danger-border bg-danger-soft p-3 text-sm text-danger-text">Please check the highlighted fields. {Object.values(errors).filter(Boolean).join(" ")}</div>}
        {!existing && templates.length > 0 ? (
          <Field label="Start from a template" htmlFor="te-template">
            <NativeSelect
              id="te-template"
              value=""
              onChange={(e) => {
                const template = templates.find((t) => t.id === e.target.value);
                if (template) setDraft((d) => applyTemplate(d, template));
              }}
              className="min-w-0"
            >
              <option value="">Choose a template…</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
        ) : null}

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

        <fieldset className="space-y-3 rounded-2xl border p-4">
          <legend className="flex items-center gap-2 px-1 text-sm font-semibold"><Clock3 className="size-4" aria-hidden="true" /> Schedule and duration</legend>
          <SegmentedControl<Mode>
            label="Placement"
            value={draft.mode}
            onChange={(mode) => set("mode", mode)}
            options={[
              { value: "none", label: "Inbox" },
              { value: "day", label: "Any time" },
              { value: "time", label: "Set time" },
            ]}
            className="grid grid-cols-3 [&>button]:min-w-0 [&>button]:px-2 [&>button]:text-xs"
          />
          {draft.mode !== "none" ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Field label="Day" htmlFor="te-date">
                <Input
                  id="te-date"
                  type="date"
                  value={draft.date}
                  onChange={(e) => set("date", e.target.value)}
                  className="h-10 rounded-xl border-input bg-card"
                />
              </Field></div>
              {draft.mode === "time" ? (
                <Field label="Start time" htmlFor="te-time">
                  <Input
                    id="te-time"
                    type="time"
                    step={stepMin * 60}
                    value={draft.time}
                    onChange={(e) => set("time", e.target.value)}
                    className="h-10 rounded-xl border-input bg-card"
                  />
                </Field>
              ) : null}
              {draft.mode === "time" ? <Field label="End time" htmlFor="te-end">
                <Input id="te-end" type="time" step={stepMin * 60} value={finishMin < 1440 ? toTime(finishMin) : "00:00"} onChange={(e) => {
                  const end = e.target.value === "00:00" ? 1440 : timeToMinutes(e.target.value);
                  const duration = end - startMin;
                  if (duration >= 5 && duration <= 720) { set("durationMin", duration); }
                  else setErrors((errors) => ({ ...errors, end: "Choose an end at least 5 minutes after the start, up to 12 hours later." }));
                }} className="h-10 rounded-xl border-input bg-card" />
                <FieldError id="te-end-error" message={errors.end} />
              </Field> : null}
            </div>
          ) : null}
          <FieldError id="te-place-error" message={errors.placement ?? errors.locked} />

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
                    ? "h-9 rounded-xl max-sm:min-h-11 border border-primary-border bg-primary-soft px-3 text-sm font-medium text-primary-soft-text ring-1 ring-primary-text/40"
                    : "h-9 rounded-xl max-sm:min-h-11 border bg-card px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
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
                step={stepMin}
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

          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="icon" aria-label={`Shorten by ${stepMin} minutes`} disabled={draft.durationMin <= 5} onClick={() => set("durationMin", Math.max(5, draft.durationMin - stepMin))}><Minus aria-hidden="true" /></Button>
              <span className="min-w-16 text-center text-sm font-semibold tabular-nums">{formatDuration(draft.durationMin)}</span>
              <Button type="button" variant="outline" size="icon" aria-label={`Extend by ${stepMin} minutes`} disabled={draft.durationMin + stepMin > Math.min(720, draft.mode === "time" ? 1440 - startMin : 720)} onClick={() => set("durationMin", draft.durationMin + stepMin)}><Plus aria-hidden="true" /></Button>
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">Adjust by
              <NativeSelect aria-label="Time increments" value={stepMin} onChange={(e) => updatePrefs("calendar", { timeStepMin: Number(e.target.value) as 5 | 10 | 15 | 30 })} className="min-w-0">
                {[5, 10, 15, 30].map((value) => <option key={value} value={value}>{value} min</option>)}
              </NativeSelect>
            </label>
          </div>
          {draft.mode !== "none" ? (
            <ToggleRow
              label={draft.mode === "day" ? "Pin to this day" : "Lock in place"}
              description="Protect this placement from dragging and replanning."
              checked={draft.locked}
              onChange={(locked) => set("locked", locked)}
            />
          ) : null}
          {existing && <p className="text-xs text-muted-foreground">Calendar preview updates as you edit. Save applies it; Cancel restores the original.</p>}
        </fieldset>

        <Field label="Notes" htmlFor="te-notes">
          <Textarea
            id="te-notes"
            value={draft.notes}
            rows={3}
            onChange={(e) => set("notes", e.target.value)}
            className="rounded-xl border-input bg-card"
          />
        </Field>


        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Priority">
            <SegmentedControl
              label="Priority"
              value={draft.priority}
              onChange={(priority) => set("priority", priority)}
              options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABEL[p] }))}
              className="grid grid-cols-3 [&>button]:min-w-0 [&>button]:px-2"
            />
          </Field>
          <Field label="Category" htmlFor="te-category">
            <NativeSelect
              id="te-category"
              value={draft.category}
              onChange={(e) => set("category", e.target.value as CategoryId)}
              className="min-w-0"
            >
              {allCategories().map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>

        <Field label="Project" htmlFor="te-project">
          <NativeSelect id="te-project" value={draft.projectId} onChange={(e) => set("projectId", e.target.value)} className="min-w-0">
            <option value="">No project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </NativeSelect>
        </Field>

        <details className="rounded-2xl border p-4">
          <summary className="text-sm font-semibold">More options · deadlines, repeat, checklist</summary>
          <div className="mt-4 space-y-5">
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
          <legend className="flex items-center gap-1 px-1 text-sm font-medium">
            Repeat <Term id="repeat" />
          </legend>
          <NativeSelect
            aria-label="Repeat"
            value={draft.repeat.freq}
            onChange={(e) => set("repeat", { ...draft.repeat, freq: e.target.value as RepeatDraft["freq"] })}
            className="min-w-0"
          >
            <option value="none">Does not repeat</option>
            <option value="daily">Every day</option>
            <option value="weekly">Every week</option>
            <option value="monthly">Every month</option>
          </NativeSelect>
          {draft.repeat.freq !== "none" ? (
            <div className="space-y-3">
              <span className="flex items-center gap-2 text-sm">
                Every
                <Input
                  aria-label="Repeat every"
                  type="number"
                  min={1}
                  max={30}
                  value={draft.repeat.interval}
                  onChange={(e) => set("repeat", { ...draft.repeat, interval: Math.min(30, Math.max(1, Number(e.target.value) || 1)) })}
                  className="h-9 w-20 rounded-xl border-input bg-card"
                />
                {draft.repeat.freq === "daily" ? "day(s)" : draft.repeat.freq === "weekly" ? "week(s)" : "month(s)"}
              </span>
              {draft.repeat.freq === "weekly" ? (
                <div role="group" aria-label="Repeat on" className="flex flex-wrap gap-2">
                  {orderedWeekdays("monday").map((day) => {
                    const on = draft.repeat.weekdays.includes(day.index);
                    return (
                      <button
                        key={day.index}
                        type="button"
                        aria-pressed={on}
                        aria-label={day.long}
                        onClick={() =>
                          set("repeat", {
                            ...draft.repeat,
                            weekdays: on ? draft.repeat.weekdays.filter((d) => d !== day.index) : [...draft.repeat.weekdays, day.index],
                          })
                        }
                        className={
                          on
                            ? "h-9 min-w-11 rounded-xl max-sm:min-h-11 border border-primary-border bg-primary-soft px-2 text-sm font-medium text-primary-soft-text"
                            : "h-9 min-w-11 rounded-xl max-sm:min-h-11 border bg-card px-2 text-sm text-muted-foreground hover:bg-muted"
                        }
                      >
                        {day.short}
                      </button>
                    );
                  })}
                </div>
              ) : null}
              <Field label="Stop repeating after (optional)" htmlFor="te-until">
                <Input
                  id="te-until"
                  type="date"
                  value={draft.repeat.until}
                  onChange={(e) => set("repeat", { ...draft.repeat, until: e.target.value })}
                  className="h-10 rounded-xl border-input bg-card"
                />
              </Field>
              <p className="text-xs text-muted-foreground">When you finish this task, the next one is added for you.</p>
            </div>
          ) : null}
          <FieldError id="te-repeat-error" message={errors.recurrence} />
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
                <label className="-my-2 -ml-2 flex size-11 shrink-0 items-center justify-center">
                  <input
                    type="checkbox"
                    checked={item.done}
                    aria-label={`Done: ${item.text}`}
                    onChange={(e) =>
                      set("checklist", draft.checklist.map((c) => (c.id === item.id ? { ...c, done: e.target.checked } : c)))
                    }
                    className="size-4 accent-primary"
                  />
                </label>
                <span className={item.done ? "flex-1 text-sm text-muted-foreground line-through" : "flex-1 text-sm"}>
                  {item.text}
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${item.text}`}
                  onClick={() => set("checklist", draft.checklist.filter((c) => c.id !== item.id))}
                  className="-my-2 -mr-2 flex size-11 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground"
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
                  step={stepMin}
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
        </details>
      </div>

      <SheetFooter className="grid grid-cols-2 items-center gap-2 border-t bg-popover px-5">
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
        {existing ? (
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => {
              const template = templateFromTask(existing, crypto.randomUUID(), existing.title);
              mutateTemplates((list) => saveTemplate(list, template));
              toast.success(`Saved template “${template.name}”`);
            }}
          >
            Save as template
          </Button>
        ) : null}
        <span className="col-span-2 grid grid-cols-2 gap-2">
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
      <SheetContent side="right" overlayClassName="bg-black/5 supports-backdrop-filter:backdrop-blur-none" className="gap-0 data-[side=right]:w-full sm:max-w-[34rem]">
        <SheetHeader className="shrink-0 border-b px-5 pt-5 pb-4">
          <SheetTitle>{editor?.kind === "edit" ? "Edit task" : "New task"}</SheetTitle>
          <SheetDescription>
            {editor?.kind === "edit" ? "Adjust the details and preview your schedule before saving." : "Capture it now, schedule it later."}
          </SheetDescription>
        </SheetHeader>
        {editor ? <EditorForm key={key} target={editor} /> : null}
      </SheetContent>
    </Sheet>
  );
}
