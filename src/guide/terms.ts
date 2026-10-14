import type { GuideTerm } from "./types";

/**
 * Plain-language meanings of the words Weekflow uses. Each id is used by the
 * (i) tips, the help panel and the glossary. Write for someone who has never
 * used a planner: short, concrete, no jargon inside the explanation.
 */
export const TERMS = [
  {
    id: "inbox",
    word: "Inbox",
    plain: "Open tasks that have no time on your calendar yet.",
    whyItMatters: "Capture first, place later. Plan my week can fill the inbox for you.",
    section: "tasks",
  },
  {
    id: "lock",
    word: "Lock",
    plain: "A locked task is pinned to its day and time. You cannot drag it, and the planner never moves it.",
    whyItMatters: "Use it for meetings and anything fixed. Everything else flows around it.",
    section: "week",
  },
  {
    id: "buffer",
    word: "Buffer",
    plain: "The gap Weekflow keeps between two tasks.",
    whyItMatters: "It stops your day from becoming back-to-back. The planner leaves this much room.",
    section: "planning",
    setting: { route: "settings", sub: "planning", label: "Planning preferences" },
  },
  {
    id: "daily-limit",
    word: "Daily limit",
    plain: "The most hours of work you want planned on a single day.",
    whyItMatters: "A day over the limit is flagged as overloaded, and the planner stops filling it.",
    section: "planning",
    setting: { route: "settings", sub: "planning", label: "Planning preferences" },
  },
  {
    id: "strict-deadline",
    word: "Strict deadline",
    plain: "The planner never places a task after its deadline. If a task cannot fit, it tells you.",
    whyItMatters: "Best for hard due dates, because you hear about a problem early.",
    section: "planning",
    setting: { route: "settings", sub: "engine", label: "Scheduling engine" },
  },
  {
    id: "soft-deadline",
    word: "Soft deadline",
    plain: "The planner may place a task after its deadline, and flags it when it does.",
    whyItMatters: "Useful when dates are flexible and you would rather have a plan than a refusal.",
    section: "planning",
    setting: { route: "settings", sub: "engine", label: "Scheduling engine" },
  },
  {
    id: "stability",
    word: "Stability",
    plain: "How much the planner prefers to leave tasks where they already are.",
    whyItMatters:
      "At 5 or more, Plan my week only moves tasks that break a rule. Lower lets it rearrange more of your week.",
    section: "planning",
    setting: { route: "settings", sub: "engine", label: "Scheduling engine" },
  },
  {
    id: "focus-time",
    word: "Focus time",
    plain: "Uninterrupted time for deep work.",
    whyItMatters: "With it on, tasks in the Focus category are planned early, when your day is clearest.",
    section: "planning",
    setting: { route: "settings", sub: "planning", label: "Planning preferences" },
  },
  {
    id: "conflict",
    word: "Conflict",
    plain: "A problem in your schedule, such as two tasks at the same time or a day over its limit.",
    whyItMatters: "Home lists conflicts with fixes you can apply by hand. Plan my week can fix them too.",
    section: "home",
  },
  {
    id: "missed",
    word: "Missed task",
    plain: "An open task whose time has passed without it being done.",
    whyItMatters: "You can replan missed tasks yourself, after being asked, or automatically.",
    section: "replan",
    setting: { route: "settings", sub: "engine", label: "Scheduling engine" },
  },
  {
    id: "schedule-history",
    word: "Schedule history",
    plain: "Saved copies of your calendar, taken just before a bulk change.",
    whyItMatters: "Lets you go back to how your week looked before a plan or replan.",
    section: "replan",
  },
  {
    id: "engine",
    word: "Scheduling engine",
    plain: "The part of Weekflow that proposes a plan. The same tasks and rules always give the same plan.",
    whyItMatters: "It explains every choice, and it changes nothing until you press Apply.",
    section: "planning",
    setting: { route: "settings", sub: "engine", label: "Scheduling engine" },
  },
] as const satisfies readonly GuideTerm[];

export type TermId = (typeof TERMS)[number]["id"];

const BY_ID = new Map<string, GuideTerm>(TERMS.map((t) => [t.id, t]));

export function termById(id: TermId): GuideTerm {
  const term = BY_ID.get(id);
  if (!term) throw new Error(`Unknown guide term: ${id}`);
  return term;
}
