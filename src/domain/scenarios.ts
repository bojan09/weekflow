import { addDays, diffDays, type ISODate } from "@/lib/dates";
import { clampDuration } from "./task-ops";
import type { CategoryId, Priority, Recurrence, Task } from "./tasks";

export type ScenarioId = "standard" | "empty" | "overloaded" | "conflicts";

export const SCENARIOS: ReadonlyArray<{ id: ScenarioId; label: string; description: string }> = [
  { id: "standard", label: "A normal week", description: "A realistic week with locked meetings, an inbox and one overdue task." },
  { id: "empty", label: "Empty", description: "A blank slate to see the empty states." },
  { id: "overloaded", label: "Overloaded week", description: "Too much planned on Wednesday, to see workload warnings." },
  { id: "conflicts", label: "Conflicts and risks", description: "Overlaps, a broken dependency and missed deadlines, with suggested fixes." },
];

interface Draft {
  title: string;
  category: CategoryId;
  priority: Priority;
  durationMin: number;
  /** Day offset from the week start and start minute; null start = pinned day only. */
  at?: { day: number; startMin: number | null };
  locked?: boolean;
  /** Deadline as a day offset from the week start (may be negative). */
  deadlineDay?: number;
  notes?: string;
  /** Indexes (within STANDARD) of tasks this one depends on. */
  dependsOnIndex?: number[];
  /** Keep open even if it sits in the past (a missed task). */
  missed?: boolean;
  /** Project id (see the demo project seeds). */
  project?: string;
  /** Repeat rule. */
  repeat?: Recurrence;
  /** Day offsets count from today (clamped to the week) instead of the week start. */
  rel?: boolean;
}

const H = (hours: number, minutes = 0): number => hours * 60 + minutes;

const STANDARD: Draft[] = [
  { title: "Deep work: product spec", category: "focus", priority: "high", durationMin: 90, at: { day: 0, startMin: H(9) }, locked: true },
  { title: "Team standup", category: "meetings", priority: "medium", durationMin: 30, at: { day: 0, startMin: H(10, 30) }, repeat: { freq: "weekly", interval: 1, weekdays: [1, 2, 3, 4, 5], until: null } },
  { title: "Plan the sprint", category: "work", priority: "medium", durationMin: 60, at: { day: 0, startMin: H(14) }, project: "p-launch" },
  { title: "Client call", category: "meetings", priority: "high", durationMin: 60, at: { day: 1, startMin: H(10) }, locked: true },
  { title: "Write the proposal", category: "work", priority: "high", durationMin: 120, at: { day: 1, startMin: H(13, 30) }, deadlineDay: 3, project: "p-launch" },
  { title: "Design review", category: "work", priority: "medium", durationMin: 90, at: { day: 2, startMin: H(9, 30) }, project: "p-launch" },
  { title: "TypeScript course", category: "learning", priority: "low", durationMin: 60, at: { day: 2, startMin: H(14) } },
  { title: "Review pull requests", category: "work", priority: "medium", durationMin: 45, at: { day: 3, startMin: H(9) } },
  { title: "Quarterly report", category: "admin", priority: "high", durationMin: 120, at: { day: 3, startMin: H(10) }, deadlineDay: 4, dependsOnIndex: [4] },
  { title: "Inbox zero", category: "admin", priority: "low", durationMin: 30, at: { day: 4, startMin: H(9) } },
  { title: "Team retro", category: "meetings", priority: "medium", durationMin: 60, at: { day: 4, startMin: H(15) }, locked: true },
  { title: "Groceries", category: "personal", priority: "low", durationMin: 60, at: { day: 5, startMin: null }, project: "p-home", repeat: { freq: "weekly", interval: 1, weekdays: [], until: null } },
  { title: "Prepare demo slides", category: "work", priority: "high", durationMin: 90, deadlineDay: 4, project: "p-launch" },
  { title: "Book a dentist appointment", category: "health", priority: "low", durationMin: 15, project: "p-home" },
  { title: "Read the research paper", category: "learning", priority: "low", durationMin: 60 },
  { title: "Reply to open emails", category: "admin", priority: "medium", durationMin: 30 },
  { title: "Send the invoice", category: "admin", priority: "high", durationMin: 15, deadlineDay: -1, missed: true },
];

const OVERLOAD: Draft[] = [
  { title: "Workshop prep", category: "work", priority: "high", durationMin: 120, at: { day: 0, startMin: H(9) }, rel: true },
  { title: "Stakeholder update", category: "meetings", priority: "high", durationMin: 90, at: { day: 0, startMin: H(11) }, rel: true },
  { title: "Budget model", category: "admin", priority: "medium", durationMin: 120, at: { day: 0, startMin: H(13) }, rel: true },
  { title: "Hiring interviews", category: "meetings", priority: "medium", durationMin: 120, at: { day: 0, startMin: H(15) }, rel: true },
  { title: "Release checklist", category: "work", priority: "high", durationMin: 60, at: { day: 0, startMin: H(17) }, rel: true },
];

const CONFLICTS: Draft[] = [
  { title: "Vendor call", category: "meetings", priority: "high", durationMin: 60, at: { day: 0, startMin: H(10) }, locked: true, rel: true },
  { title: "Budget review", category: "admin", priority: "medium", durationMin: 60, at: { day: 0, startMin: H(10, 30) }, rel: true },
  { title: "Draft the report", category: "work", priority: "high", durationMin: 90, at: { day: 1, startMin: H(15) }, rel: true },
  { title: "Publish the report", category: "work", priority: "high", durationMin: 60, at: { day: 1, startMin: H(9) }, rel: true },
  { title: "Submit tax forms", category: "admin", priority: "high", durationMin: 45, at: { day: 1, startMin: H(11) }, deadlineDay: 0, rel: true },
  { title: "Evening workout", category: "health", priority: "low", durationMin: 60, at: { day: 0, startMin: H(19) }, rel: true },
];

function create(drafts: Draft[], weekStart: ISODate, today: ISODate, idPrefix: string, offset: number): Task[] {
  const todayOffset = Math.min(6, Math.max(0, diffDays(weekStart, today)));
  const dayOf = (draft: Draft, day: number): number => (draft.rel ? Math.min(6, todayOffset + day) : day);
  return drafts.map((draft, i) => {
    const index = offset + i;
    const date = draft.at ? addDays(weekStart, dayOf(draft, draft.at.day)) : null;
    const past = date !== null && date < today && !draft.missed;
    const deps = draft.dependsOnIndex ?? [];
    return {
      id: `${idPrefix}${index + 1}`,
      title: draft.title,
      notes: draft.notes ?? "",
      durationMin: clampDuration(draft.durationMin),
      priority: draft.priority,
      category: draft.category,
      labels: [],
      deadline: draft.deadlineDay === undefined ? null : addDays(weekStart, dayOf(draft, draft.deadlineDay)),
      earliestStart: null,
      checklist: [],
      dependsOn: deps.map((n) => `${idPrefix}${n + 1}`),
      status: past ? "done" : "todo",
      completedOn: past ? date : null,
      actualMin: past ? clampDuration(draft.durationMin) : null,
      placement: draft.at && date ? { date, startMin: draft.at.startMin } : null,
      locked: Boolean(draft.locked && draft.at),
      recurrence: draft.repeat ?? null,
      projectId: draft.project ?? null,
      createdAt: `${weekStart}T00:${String(Math.floor(index / 60)).padStart(2, "0")}:${String(index % 60).padStart(2, "0")}.000Z`,
    };
  });
}

/**
 * Deterministic sample data positioned relative to a week, so the demo always
 * looks "current". Same arguments, same tasks.
 */
export function buildScenario(id: ScenarioId, weekStart: ISODate, today: ISODate): Task[] {
  if (id === "empty") return [];
  const base = create(STANDARD, weekStart, today, "t", 0);
  if (id === "standard") return base;
  if (id === "overloaded") {
    return [...base, ...create(OVERLOAD, weekStart, today, "t", base.length)];
  }
  // conflicts: wire the "Publish" task to depend on "Draft" (the next one).
  const extra = create(CONFLICTS, weekStart, today, "t", base.length);
  const publish = extra.find((t) => t.title === "Publish the report");
  const draft = extra.find((t) => t.title === "Draft the report");
  const fixed = extra.map((t) => (t === publish && draft ? { ...t, dependsOn: [draft.id] } : t));
  return [...base, ...fixed];
}
