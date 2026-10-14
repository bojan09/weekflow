import type { ISODate } from "@/lib/dates";
import { PRIORITY_RANK, categoryOf, isInbox, isOverdue, type CategoryId, type Priority, type Task } from "./tasks";

export type TaskTab = "inbox" | "open" | "done" | "all";

export interface TaskFilter {
  tab: TaskTab;
  query: string;
  priority: Priority | "all";
  category: CategoryId | "all";
  overdueOnly: boolean;
}

export const DEFAULT_FILTER: TaskFilter = {
  tab: "open",
  query: "",
  priority: "all",
  category: "all",
  overdueOnly: false,
};

const cmp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

function haystack(task: Task): string {
  return [task.title, task.notes, categoryOf(task.category).label, ...task.labels, ...task.checklist.map((i) => i.text)]
    .join(" ")
    .toLowerCase();
}

function inTab(task: Task, tab: TaskTab): boolean {
  switch (tab) {
    case "inbox":
      return isInbox(task);
    case "open":
      return task.status === "todo";
    case "done":
      return task.status === "done";
    case "all":
      return true;
  }
}

/** How many tasks each tab holds (ignoring the other filters), for tab badges. */
export function tabCounts(tasks: readonly Task[]): Record<TaskTab, number> {
  return {
    inbox: tasks.filter(isInbox).length,
    open: tasks.filter((t) => t.status === "todo").length,
    done: tasks.filter((t) => t.status === "done").length,
    all: tasks.length,
  };
}

/**
 * Filter and order tasks. Ordering is total (id breaks every tie), so the same
 * tasks always list in the same order.
 */
export function filterTasks(tasks: readonly Task[], filter: TaskFilter, today: ISODate): Task[] {
  const words = filter.query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const matched = tasks.filter((task) => {
    if (!inTab(task, filter.tab)) return false;
    if (filter.priority !== "all" && task.priority !== filter.priority) return false;
    if (filter.category !== "all" && task.category !== filter.category) return false;
    if (filter.overdueOnly && !isOverdue(task, today)) return false;
    if (words.length > 0) {
      const text = haystack(task);
      return words.every((w) => text.includes(w));
    }
    return true;
  });

  return matched.sort((a, b) => {
    if (a.status !== b.status) return a.status === "todo" ? -1 : 1;
    if (a.status === "done") {
      return cmp(b.completedOn ?? "", a.completedOn ?? "") || cmp(a.id, b.id);
    }
    const aPlaced = a.placement?.date ?? "9999-99-99";
    const bPlaced = b.placement?.date ?? "9999-99-99";
    if (filter.tab === "inbox") {
      return (
        PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority] ||
        cmp(a.deadline ?? "9999-99-99", b.deadline ?? "9999-99-99") ||
        cmp(a.createdAt, b.createdAt) ||
        cmp(a.id, b.id)
      );
    }
    return (
      cmp(aPlaced, bPlaced) ||
      (a.placement?.startMin ?? -1) - (b.placement?.startMin ?? -1) ||
      PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority] ||
      cmp(a.id, b.id)
    );
  });
}
