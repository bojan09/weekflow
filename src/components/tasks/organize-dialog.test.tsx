import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { projectsCollection } from "@/data/projects";
import { tasksCollection } from "@/data/tasks";
import { templatesCollection } from "@/data/templates";
import { buildTask } from "@/domain/task-ops";
import { filterTasks, DEFAULT_FILTER } from "@/domain/task-filters";
import { useUiStore } from "@/stores/ui";
import { OrganizeDialog } from "./organize-dialog";

const mk = (id: string, projectId: string | null) => ({
  ...buildTask({ title: id, durationMin: 30, priority: "low" }, id, "2026-10-12T00:00:00.000Z"),
  projectId,
});

beforeEach(() => {
  act(() => {
    projectsCollection.write([{ id: "p1", name: "Website", hue: "blue" }]);
    templatesCollection.write([
      { id: "t1", name: "Report", title: "Report", notes: "", durationMin: 60, priority: "medium", category: "admin", labels: [], steps: ["a", "b"], projectId: null },
    ]);
    tasksCollection.write([mk("a", "p1"), mk("b", null)]);
    useUiStore.setState({ organizeOpen: false, editor: null });
  });
});

const open = (): void => {
  render(<OrganizeDialog />);
  act(() => useUiStore.getState().setOrganizeOpen(true));
};

describe("OrganizeDialog projects", () => {
  it("adds a project and rejects empty and duplicate names", () => {
    open();
    const input = screen.getByLabelText("New project name");
    fireEvent.click(screen.getByRole("button", { name: /Add project/ }));
    expect(screen.getByRole("alert").textContent).toMatch(/Give the project a name/);

    fireEvent.change(input, { target: { value: "website" } });
    fireEvent.click(screen.getByRole("button", { name: /Add project/ }));
    expect(screen.getByRole("alert").textContent).toMatch(/already exists/);

    fireEvent.change(input, { target: { value: "Home" } });
    fireEvent.click(screen.getByRole("button", { name: /Add project/ }));
    expect(projectsCollection.getSnapshot().map((p) => p.name)).toEqual(["Website", "Home"]);
  });

  it("deleting a project keeps its tasks and detaches them", () => {
    open();
    fireEvent.click(screen.getByRole("button", { name: "Delete Website" }));
    expect(projectsCollection.getSnapshot()).toEqual([]);
    expect(tasksCollection.getSnapshot().map((t) => t.projectId)).toEqual([null, null]);
  });
});

describe("OrganizeDialog templates", () => {
  it("lists templates, opens one in the editor, and deletes one", () => {
    open();
    fireEvent.click(screen.getByRole("radio", { name: "Templates" }));
    expect(screen.getByText("Report")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Use" }));
    expect(useUiStore.getState().editor).toEqual({ kind: "new", defaults: { templateId: "t1" } });

    act(() => useUiStore.setState({ organizeOpen: true }));
    fireEvent.click(screen.getByRole("radio", { name: "Templates" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete template Report" }));
    expect(templatesCollection.getSnapshot()).toEqual([]);
  });
});

describe("project filter", () => {
  it("filters by project, none, or all", () => {
    const tasks = [mk("a", "p1"), mk("b", null), mk("c", "p2")];
    const ids = (project: string) => filterTasks(tasks, { ...DEFAULT_FILTER, project }, "2026-10-14").map((t) => t.id).sort();
    expect(ids("all")).toEqual(["a", "b", "c"]);
    expect(ids("p1")).toEqual(["a"]);
    expect(ids("none")).toEqual(["b"]);
  });
});
