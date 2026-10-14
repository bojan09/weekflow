import { teamStateSchema, type Member, type TeamState, type TeamTask } from "@/domain/team/types";
import { createLocalCollection } from "./collection";

const H = (hours: number, minutes = 0): number => hours * 60 + minutes;

/** Monday to Friday at the given hours, weekend off. Sunday-first, like weekdays everywhere else. */
function workweek(start: number, end: number, days: readonly number[] = [1, 2, 3, 4, 5]): Member["week"] {
  return Array.from({ length: 7 }, (_, d) => (days.includes(d) ? { start, end } : null));
}

const NOW = "2026-10-12T09:00:00.000Z";

const task = (
  id: string,
  title: string,
  extra: Partial<TeamTask> & Pick<TeamTask, "createdBy">,
): TeamTask => ({
  id,
  title,
  notes: "",
  projectId: null,
  assigneeId: null,
  status: "todo",
  priority: "medium",
  deadline: null,
  durationMin: 60,
  comments: [],
  createdAt: NOW,
  ...extra,
});

/** A small made-up team for the demo. Nothing here is real. */
export function seedTeam(): TeamState {
  return {
    workspace: { id: "ws-demo", name: "Northwind Studio" },
    viewerId: "m-sam",
    members: [
      { id: "m-sam", name: "Sam Rivera", email: "sam.rivera@example.com", role: "owner", hue: "blue", week: workweek(H(9), H(17)) },
      { id: "m-priya", name: "Priya Nair", email: "priya.nair@example.com", role: "admin", hue: "pink", week: workweek(H(8, 30), H(16, 30)) },
      { id: "m-marco", name: "Marco Díaz", email: "marco.diaz@example.com", role: "member", hue: "green", week: workweek(H(10), H(18), [1, 2, 3, 4]) },
      { id: "m-lena", name: "Lena Fischer", email: "lena.fischer@example.com", role: "member", hue: "amber", week: workweek(H(9), H(15), [1, 2, 3, 4, 5]) },
      { id: "m-tom", name: "Tom Becker", email: "tom.becker@example.com", role: "viewer", hue: "slate", week: workweek(H(9), H(17)) },
    ],
    invitations: [
      { id: "inv-1", email: "alex.novak@example.com", role: "member", invitedBy: "m-priya", invitedAt: "2026-10-12T08:00:00.000Z" },
    ],
    projects: [
      { id: "tp-launch", name: "Website launch", hue: "blue" },
      { id: "tp-q4", name: "Q4 planning", hue: "lavender" },
    ],
    tasks: [
      task("tt-1", "Write the launch announcement", {
        createdBy: "m-priya",
        projectId: "tp-launch",
        assigneeId: "m-marco",
        status: "doing",
        priority: "high",
        deadline: "2026-10-16",
        durationMin: 120,
        comments: [
          { id: "c-1", authorId: "m-priya", text: "Keep it under 300 words, please.", at: "2026-10-12T10:00:00.000Z" },
          { id: "c-2", authorId: "m-marco", text: "First draft is in the doc, looking for feedback.", at: "2026-10-13T09:30:00.000Z" },
        ],
      }),
      task("tt-2", "Review the new homepage design", { createdBy: "m-sam", projectId: "tp-launch", assigneeId: "m-sam", priority: "high", deadline: "2026-10-15", durationMin: 90 }),
      task("tt-3", "Set up analytics and consent banner", { createdBy: "m-sam", projectId: "tp-launch", assigneeId: "m-lena", durationMin: 180 }),
      task("tt-4", "Test the sign-up flow on phones", { createdBy: "m-priya", projectId: "tp-launch", assigneeId: "m-lena", status: "todo", priority: "medium", durationMin: 120 }),
      task("tt-5", "Draft the Q4 goals", { createdBy: "m-sam", projectId: "tp-q4", assigneeId: "m-priya", priority: "high", deadline: "2026-10-23", durationMin: 150 }),
      task("tt-6", "Collect budget requests", { createdBy: "m-priya", projectId: "tp-q4", assigneeId: null, durationMin: 60 }),
      task("tt-7", "Book the offsite venue", { createdBy: "m-sam", projectId: "tp-q4", assigneeId: "m-marco", status: "done", durationMin: 45 }),
      task("tt-8", "Update the team handbook", { createdBy: "m-priya", assigneeId: "m-sam", priority: "low", durationMin: 60 }),
    ],
  };
}

export const teamCollection = createLocalCollection<TeamState>({
  key: "weekflow:demo:team",
  schema: teamStateSchema,
  seed: seedTeam,
});
