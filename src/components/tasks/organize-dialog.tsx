"use client";

import { useState, type FormEvent } from "react";
import { FolderKanban, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { NativeSelect, SegmentedControl } from "@/components/settings/controls";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { mutateProjects } from "@/data/projects";
import { mutateTemplates } from "@/data/templates";
import { mutateTasks } from "@/data/tasks";
import { addProject, clearProject, updateProject, removeProject } from "@/domain/projects";
import { removeTemplate } from "@/domain/templates";
import { categoryOf, TASK_HUES, type TaskHue } from "@/domain/tasks";
import { useProjects, useTemplates } from "@/hooks/use-lists";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui";
import { TASK_STYLE } from "./task-style";

type Tab = "projects" | "templates";

const HUE_LABEL: Record<TaskHue, string> = {
  lavender: "Lavender",
  blue: "Blue",
  teal: "Teal",
  green: "Green",
  amber: "Amber",
  orange: "Orange",
  pink: "Pink",
  slate: "Slate",
};

function ProjectsTab() {
  const projects = useProjects();
  const [name, setName] = useState("");
  const [hue, setHue] = useState<TaskHue>("blue");
  const [error, setError] = useState("");

  const add = (event: FormEvent): void => {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed === "") {
      setError("Give the project a name.");
      return;
    }
    if (projects.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
      setError("A project with that name already exists.");
      return;
    }
    mutateProjects((list) => addProject(list, crypto.randomUUID(), trimmed, hue));
    setName("");
    setError("");
  };

  return (
    <div className="space-y-4">
      {projects.length === 0 ? (
        <p className="rounded-xl bg-muted/60 px-3 py-4 text-center text-sm text-muted-foreground">
          No projects yet. A project groups related tasks so you can filter them on the Tasks page.
        </p>
      ) : (
        <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
          {projects.map((project) => (
            <li key={project.id} className="flex items-center gap-2 rounded-xl border p-2">
              <span className={cn("ml-1 size-3 shrink-0 rounded-sm", TASK_STYLE[project.hue].dot)} aria-hidden="true" />
              <Input
                aria-label={`Name of ${project.name}`}
                defaultValue={project.name}
                maxLength={40}
                onBlur={(e) => {
                  const value = e.target.value;
                  if (value.trim() === project.name) return;
                  const before = project.name;
                  mutateProjects((list) => updateProject(list, project.id, { name: value }));
                  if (!value.trim() || projects.some((p) => p.id !== project.id && p.name.toLowerCase() === value.trim().toLowerCase())) {
                    e.target.value = before;
                    toast.error("That name is empty or already used.");
                  }
                }}
                className="h-9 min-w-0 flex-1 rounded-lg border-input bg-card"
              />
              <NativeSelect
                aria-label={`Colour of ${project.name}`}
                value={project.hue}
                onChange={(e) => mutateProjects((list) => updateProject(list, project.id, { hue: e.target.value as TaskHue }))}
                className="h-9 min-w-28"
              >
                {TASK_HUES.map((h) => (
                  <option key={h} value={h}>
                    {HUE_LABEL[h]}
                  </option>
                ))}
              </NativeSelect>
              <Button
                variant="ghost"
                size="icon-lg"
                aria-label={`Delete ${project.name}`}
                onClick={() => {
                  mutateTasks((tasks) => clearProject(tasks, project.id));
                  mutateProjects((list) => removeProject(list, project.id));
                  toast(`Deleted project “${project.name}”. Its tasks are kept.`);
                }}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={add} className="space-y-2" noValidate>
        <div className="flex flex-wrap gap-2">
          <Input
            aria-label="New project name"
            aria-invalid={error !== ""}
            placeholder="New project name"
            value={name}
            maxLength={40}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
            className="h-10 min-w-40 flex-1 rounded-xl border-input bg-card"
          />
          <NativeSelect aria-label="New project colour" value={hue} onChange={(e) => setHue(e.target.value as TaskHue)} className="h-10 min-w-28">
            {TASK_HUES.map((h) => (
              <option key={h} value={h}>
                {HUE_LABEL[h]}
              </option>
            ))}
          </NativeSelect>
          <Button type="submit" size="lg" className="h-10">
            <Plus aria-hidden="true" /> Add project
          </Button>
        </div>
        {error ? (
          <p role="alert" className="text-xs text-danger-text">
            {error}
          </p>
        ) : null}
      </form>
    </div>
  );
}

function TemplatesTab({ onUse }: { onUse: (id: string) => void }) {
  const templates = useTemplates();
  return (
    <div className="space-y-4">
      {templates.length === 0 ? (
        <p className="rounded-xl bg-muted/60 px-3 py-4 text-center text-sm text-muted-foreground">
          No templates yet. Open any task and choose Save as template.
        </p>
      ) : (
        <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
          {templates.map((template) => (
            <li key={template.id} className="flex items-center justify-between gap-2 rounded-xl border p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{template.name}</p>
                <p className="text-xs text-muted-foreground">
                  {template.durationMin} min · {categoryOf(template.category).label}
                  {template.steps.length > 0 ? ` · ${template.steps.length} steps` : ""}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button variant="outline" size="sm" onClick={() => onUse(template.id)}>
                  Use
                </Button>
                <Button
                  variant="ghost"
                  size="icon-lg"
                  aria-label={`Delete template ${template.name}`}
                  onClick={() => {
                    mutateTemplates((list) => removeTemplate(list, template.id));
                    toast(`Deleted template “${template.name}”.`);
                  }}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">
        A template is a saved starting point: title, length, priority, category, labels, notes and checklist steps. Save one from any
        task, then use it when you add a task.
      </p>
    </div>
  );
}

/** Manage projects and templates in one place. */
export function OrganizeDialog() {
  const open = useUiStore((s) => s.organizeOpen);
  const setOpen = useUiStore((s) => s.setOrganizeOpen);
  const openEditor = useUiStore((s) => s.openEditor);
  const [tab, setTab] = useState<Tab>("projects");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderKanban className="size-4" aria-hidden="true" /> Projects and templates
          </DialogTitle>
          <DialogDescription>Group related tasks, and save tasks you create again and again.</DialogDescription>
        </DialogHeader>
        <SegmentedControl<Tab>
          label="Show"
          value={tab}
          onChange={setTab}
          options={[
            { value: "projects", label: "Projects" },
            { value: "templates", label: "Templates" },
          ]}
          className="flex-nowrap [&>button]:min-h-9 [&>button]:px-4"
        />
        {tab === "projects" ? (
          <ProjectsTab />
        ) : (
          <TemplatesTab
            onUse={(id) => {
              setOpen(false);
              openEditor({ kind: "new", defaults: { templateId: id } });
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
