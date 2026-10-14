import { describe, expect, it } from "vitest";
import { DEFAULT_FILTER, filterTasks, tabCounts } from "./task-filters";
import { buildTask } from "./task-ops";
import type { Task } from "./tasks";

const TODAY = "2026-10-14";
const make = (id: string, extra: Partial<Task> = {}): Task => ({
  ...buildTask({ title: `Task ${id}`, durationMin: 30, priority: "medium" }, id, `2026-10-12T00:00:0${id.length}.000Z`),
  ...extra,
});

const tasks: Task[] = [
  make("a", { title: "Write report", priority: "high", placement: { date: "2026-10-15", startMin: 600 }, labels: ["q4"] }),
  make("b", { title: "Call dentist", category: "health", priority: "low" }),
  make("c", { title: "Send invoice", category: "admin", deadline: "2026-10-10" }),
  make("d", { title: "Old thing", status: "done", completedOn: "2026-10-12" }),
  make("e", { title: "Newer thing", status: "done", completedOn: "2026-10-13" }),
];

describe("task filters", () => {
  it("counts each tab", () => {
    expect(tabCounts(tasks)).toEqual({ inbox: 2, open: 3, done: 2, all: 5 });
  });

  it("filters by tab", () => {
    expect(filterTasks(tasks, { ...DEFAULT_FILTER, tab: "inbox" }, TODAY).map((t) => t.id)).toEqual(["c", "b"]);
    expect(filterTasks(tasks, { ...DEFAULT_FILTER, tab: "done" }, TODAY).map((t) => t.id)).toEqual(["e", "d"]);
  });

  it("searches title, labels and category, all words required", () => {
    expect(filterTasks(tasks, { ...DEFAULT_FILTER, tab: "all", query: "report" }, TODAY).map((t) => t.id)).toEqual(["a"]);
    expect(filterTasks(tasks, { ...DEFAULT_FILTER, tab: "all", query: "q4" }, TODAY).map((t) => t.id)).toEqual(["a"]);
    expect(filterTasks(tasks, { ...DEFAULT_FILTER, tab: "all", query: "health dentist" }, TODAY).map((t) => t.id)).toEqual(["b"]);
    expect(filterTasks(tasks, { ...DEFAULT_FILTER, tab: "all", query: "report dentist" }, TODAY)).toEqual([]);
  });

  it("filters by priority, category and overdue", () => {
    expect(filterTasks(tasks, { ...DEFAULT_FILTER, priority: "high" }, TODAY).map((t) => t.id)).toEqual(["a"]);
    expect(filterTasks(tasks, { ...DEFAULT_FILTER, category: "admin" }, TODAY).map((t) => t.id)).toEqual(["c"]);
    expect(filterTasks(tasks, { ...DEFAULT_FILTER, overdueOnly: true }, TODAY).map((t) => t.id)).toEqual(["c"]);
  });

  it("lists open tasks by day then priority, with the inbox last", () => {
    expect(filterTasks(tasks, DEFAULT_FILTER, TODAY).map((t) => t.id)).toEqual(["a", "c", "b"]);
  });

  it("orders deterministically regardless of input order", () => {
    const a = filterTasks(tasks, { ...DEFAULT_FILTER, tab: "all" }, TODAY).map((t) => t.id);
    const b = filterTasks([...tasks].reverse(), { ...DEFAULT_FILTER, tab: "all" }, TODAY).map((t) => t.id);
    expect(a).toEqual(b);
  });
});
