"use client";

import { useMemo, useState } from "react";
import { FolderKanban, ListChecks, Plus, Search, SlidersHorizontal } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { LoadingBlocks } from "@/components/states/states";
import { EmptyState } from "@/components/states/states";
import { ResourceView } from "@/components/states/resource-view";
import { NativeSelect, SegmentedControl } from "@/components/settings/controls";
import { QuickAdd } from "@/components/tasks/quick-add";
import { TaskRow } from "@/components/tasks/task-row";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { tasksCollection } from "@/data/tasks";
import { useCollection } from "@/data/use-collection";
import { DEFAULT_FILTER, filterTasks, tabCounts, type TaskFilter, type TaskTab } from "@/domain/task-filters";
import { allCategories, PRIORITIES, PRIORITY_LABEL, type CategoryId, type Priority, type Task } from "@/domain/tasks";
import { useProjects } from "@/hooks/use-lists";
import { useNow } from "@/hooks/use-now";
import { cn } from "@/lib/utils";
import { usePrefsStore } from "@/prefs/store";
import { useUiStore } from "@/stores/ui";

const TAB_LABEL: Record<TaskTab, string> = { open: "Open", inbox: "Inbox", done: "Done", all: "All" };
const TABS: TaskTab[] = ["open", "inbox", "done", "all"];

function TasksBody({ tasks }: { tasks: Task[] }) {
  const [filter, setFilter] = useState<TaskFilter>(DEFAULT_FILTER);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const advancedCount = Number(filter.priority !== "all") + Number(filter.category !== "all") + Number(filter.project !== "all") + Number(filter.overdueOnly);
  const now = useNow();
  const format = usePrefsStore((s) => s.prefs.calendar.timeFormat);
  const openEditor = useUiStore((s) => s.openEditor);
  const projects = useProjects();
  const counts = useMemo(() => tabCounts(tasks), [tasks]);
  const today = now?.date ?? null;
  const visible = useMemo(
    () => (today ? filterTasks(tasks, filter, today) : []),
    [tasks, filter, today],
  );
  const set = <K extends keyof TaskFilter>(key: K, value: TaskFilter[K]): void =>
    setFilter((f) => ({ ...f, [key]: value }));
  const filtered =
    filter.query !== "" || filter.priority !== "all" || filter.category !== "all" || filter.project !== "all" || filter.overdueOnly;

  return (
    <div className="space-y-3 sm:space-y-5">
      <QuickAdd className="max-w-2xl" placeholder="Add a task to your inbox…" />

      <SegmentedControl<TaskTab>
        label="Show"
        value={filter.tab}
        onChange={(tab) => set("tab", tab)}
        options={TABS.map((tab) => ({ value: tab, label: `${TAB_LABEL[tab]} ${counts[tab]}` }))}
        className="max-w-xl flex-nowrap [&>button]:min-h-9 [&>button]:min-w-0 [&>button]:px-2 [&>button]:text-xs sm:[&>button]:text-sm"
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            value={filter.query}
            onChange={(e) => set("query", e.target.value)}
            placeholder="Search tasks, notes, labels"
            aria-label="Search tasks"
            className="h-9 rounded-xl border-input bg-card pl-9"
          />
        </div>
        <Button type="button" variant="outline" size="lg" className="min-h-11 sm:hidden" aria-expanded={filtersOpen} aria-controls="task-filters" onClick={() => setFiltersOpen(!filtersOpen)}>
          <SlidersHorizontal aria-hidden="true" /> Filters{advancedCount > 0 ? ` (${advancedCount})` : ""}
        </Button>
      </div>
      <div id="task-filters" className={cn("grid grid-cols-2 items-center gap-2 sm:flex sm:flex-wrap", !filtersOpen && "hidden sm:flex")}>
        <NativeSelect
          aria-label="Filter by priority"
          value={filter.priority}
          onChange={(e) => set("priority", e.target.value as Priority | "all")}
          className="h-11 min-w-0 sm:h-9 sm:min-w-32"
        >
          <option value="all">Any priority</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABEL[p]}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          aria-label="Filter by category"
          value={filter.category}
          onChange={(e) => set("category", e.target.value as CategoryId | "all")}
          className="h-11 min-w-0 sm:h-9 sm:min-w-36"
        >
          <option value="all">All categories</option>
          {allCategories().map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          aria-label="Filter by project"
          value={filter.project}
          onChange={(e) => set("project", e.target.value)}
          className="h-11 min-w-0 sm:h-9 sm:min-w-36"
        >
          <option value="all">All projects</option>
          <option value="none">No project</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </NativeSelect>
        <button
          type="button"
          aria-pressed={filter.overdueOnly}
          onClick={() => set("overdueOnly", !filter.overdueOnly)}
          className={cn(
            "h-9 rounded-xl border px-3 text-sm font-medium transition-colors max-sm:min-h-11",
            filter.overdueOnly
              ? "border-danger-border bg-danger-soft text-danger-text"
              : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          Overdue only
        </button>
      </div>

      <div className="flex items-center justify-between gap-2"><p role="status" className="text-sm text-muted-foreground">
        {visible.length} {visible.length === 1 ? "task" : "tasks"}
      </p>{filtered && <Button variant="ghost" size="lg" onClick={() => setFilter({ ...DEFAULT_FILTER, tab: filter.tab })}>Clear filters</Button>}</div>

      {visible.length === 0 ? (
        filtered ? (
          <EmptyState icon={Search} title="No tasks match" description="Try a different search or clear the filters." />
        ) : (
          <EmptyState
            icon={ListChecks}
            title={filter.tab === "done" ? "Nothing completed yet" : filter.tab === "inbox" ? "Inbox is clear" : "No tasks yet"}
            description={
              filter.tab === "done"
                ? "Tasks you finish will show up here."
                : "Capture a task above, or press C to add one with all the details."
            }
          />
        )
      ) : (
        <ul className="space-y-2">
          {visible.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              today={today}
              format={format}
              onOpen={(id) => openEditor({ kind: "edit", id })}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

export function TasksScreen() {
  const state = useCollection(tasksCollection);
  const openEditor = useUiStore((s) => s.openEditor);
  const setOrganizeOpen = useUiStore((s) => s.setOrganizeOpen);
  return (
    <>
      <PageHeader
        title="Tasks"
        subtitle="Capture everything, then give it a place."
        actions={
          <>
            <Button variant="outline" size="lg" className="h-10" onClick={() => setOrganizeOpen(true)}>
              <FolderKanban aria-hidden="true" /><span className="sm:hidden">Projects</span><span className="hidden sm:inline">Projects and templates</span>
            </Button>
            <Button size="lg" className="h-10" onClick={() => openEditor({ kind: "new" })}>
              <Plus aria-hidden="true" /> New task
            </Button>
          </>
        }
      />
      <ResourceView state={state} loading={<LoadingBlocks rows={5} />}>
        {(tasks) => <TasksBody tasks={tasks} />}
      </ResourceView>
    </>
  );
}
