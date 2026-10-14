import { describe, expect, it } from "vitest";
import { addProject, clearProject, projectsSchema, removeProject, updateProject } from "./projects";
import { removeTemplate, saveTemplate, taskFromTemplate, templateFromTask, templatesSchema } from "./templates";
import { buildTask, completeTask } from "./task-ops";
import { allCategories, categoryOf, setCustomCategories, taskSchema, tasksSchema, type Task } from "./tasks";

const task = (id: string, extra: Partial<Task> = {}): Task => ({
  ...buildTask({ title: `Task ${id}`, durationMin: 30, priority: "medium" }, id, "2026-10-12T00:00:00.000Z"),
  ...extra,
});

describe("projects", () => {
  it("adds, renames and removes, rejecting empty and duplicate names", () => {
    let list = addProject([], "p1", "  Website  ", "blue");
    expect(list).toEqual([{ id: "p1", name: "Website", hue: "blue" }]);
    expect(addProject(list, "p2", "website", "green")).toBe(list);
    expect(addProject(list, "p2", "   ", "green")).toBe(list);
    list = addProject(list, "p2", "Home", "green");
    expect(updateProject(list, "p2", { name: "Website" })).toBe(list);
    expect(updateProject(list, "p2", { name: " Garden " })[1]).toEqual({ id: "p2", name: "Garden", hue: "green" });
    expect(removeProject(list, "p1").map((p) => p.id)).toEqual(["p2"]);
    expect(projectsSchema.safeParse(list).success).toBe(true);
  });

  it("clearing a project keeps its tasks and detaches them", () => {
    const tasks = [task("a", { projectId: "p1" }), task("b", { projectId: "p2" }), task("c")];
    const out = clearProject(tasks, "p1");
    expect(out.map((t) => t.projectId)).toEqual([null, "p2", null]);
    expect(clearProject(tasks, "zzz")).toBe(tasks);
  });
});

describe("templates", () => {
  const source = task("a", {
    title: "Weekly report",
    notes: "Send to the team",
    durationMin: 90,
    priority: "high",
    category: "admin",
    labels: ["report"],
    checklist: [
      { id: "c1", text: "Gather numbers", done: true },
      { id: "c2", text: "Write summary", done: false },
    ],
    projectId: "p1",
    placement: { date: "2026-10-14", startMin: 600 },
    locked: true,
    deadline: "2026-10-16",
  });

  it("captures the blueprint without scheduling or progress", () => {
    const template = templateFromTask(source, "tpl1", "  Weekly report  ");
    expect(template).toMatchObject({ name: "Weekly report", durationMin: 90, steps: ["Gather numbers", "Write summary"], projectId: "p1" });
    expect(JSON.stringify(template)).not.toContain("2026-10");
    expect(templatesSchema.safeParse([template]).success).toBe(true);
  });

  it("builds a fresh unscheduled task with new step ids", () => {
    let n = 0;
    const made = taskFromTemplate(templateFromTask(source, "tpl1", "x"), "new1", "now", () => `s${++n}`);
    expect(made).toMatchObject({ id: "new1", status: "todo", placement: null, locked: false, deadline: null, projectId: "p1", priority: "high" });
    expect(made.checklist).toEqual([
      { id: "s1", text: "Gather numbers", done: false },
      { id: "s2", text: "Write summary", done: false },
    ]);
    expect(taskSchema.safeParse(made).success).toBe(true);
  });

  it("saves by name, replacing a same-named template, and removes", () => {
    const a = templateFromTask(source, "t1", "Report");
    const b = { ...templateFromTask(source, "t2", "report"), durationMin: 45 };
    const list = saveTemplate([a], b);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: "t1", durationMin: 45 });
    expect(removeTemplate(list, "t1")).toEqual([]);
  });
});

describe("completeTask", () => {
  it("creates the next occurrence only when a repeating task is completed", () => {
    const repeating = task("r", {
      recurrence: { freq: "daily", interval: 1, weekdays: [], until: null },
      placement: { date: "2026-10-14", startMin: 540 },
    });
    const done = completeTask([repeating], "r", true, "2026-10-14", () => "next1", "now");
    expect(done).toHaveLength(2);
    expect(done[0]).toMatchObject({ status: "done", completedOn: "2026-10-14" });
    expect(done[1]).toMatchObject({ id: "next1", status: "todo", placement: { date: "2026-10-15", startMin: 540 } });

    const plain = task("p");
    expect(completeTask([plain], "p", true, "2026-10-14", () => "x", "now")).toHaveLength(1);
    expect(completeTask(done, "r", false, "2026-10-14", () => "y", "now")).toHaveLength(2);
  });
});

describe("custom categories", () => {
  it("resolves custom ids, and falls back to Work for unknown ones", () => {
    setCustomCategories([{ id: "c-garden", label: "Garden", hue: "green" }]);
    expect(allCategories().map((c) => c.id)).toContain("c-garden");
    expect(categoryOf("c-garden")).toMatchObject({ label: "Garden", hue: "green" });
    expect(categoryOf("gone").id).toBe("work");
    setCustomCategories([]);
    expect(categoryOf("c-garden").id).toBe("work");
  });

  it("loads tasks saved before recurrence and projects existed", () => {
    const old = { ...task("a") } as Record<string, unknown>;
    delete old.recurrence;
    delete old.projectId;
    const parsed = tasksSchema.parse([old]);
    expect(parsed[0]).toMatchObject({ recurrence: null, projectId: null });
  });
});
