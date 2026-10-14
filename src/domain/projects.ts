import { z } from "zod";
import { TASK_HUES, type Task, type TaskHue } from "./tasks";

export const MAX_PROJECTS = 30;

export const projectSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, "Give the project a name").max(40, "Keep the name under 40 characters"),
  hue: z.enum(TASK_HUES),
});

export type Project = z.infer<typeof projectSchema>;

export const projectsSchema = z.array(projectSchema).max(MAX_PROJECTS);

export function projectById(projects: readonly Project[], id: string | null): Project | undefined {
  return id === null ? undefined : projects.find((p) => p.id === id);
}

/** Add a project. Returns the same list for an empty or duplicate name, or when full. */
export function addProject(projects: readonly Project[], id: string, name: string, hue: TaskHue): Project[] {
  const trimmed = name.trim();
  const clash = projects.some((p) => p.name.toLowerCase() === trimmed.toLowerCase());
  if (trimmed === "" || clash || projects.length >= MAX_PROJECTS) return projects as Project[];
  return [...projects, { id, name: trimmed.slice(0, 40), hue }];
}

export function updateProject(projects: readonly Project[], id: string, patch: Partial<Omit<Project, "id">>): Project[] {
  const name = patch.name?.trim();
  if (patch.name !== undefined && (!name || projects.some((p) => p.id !== id && p.name.toLowerCase() === name.toLowerCase()))) {
    return projects as Project[];
  }
  return projects.map((p) => (p.id === id ? { ...p, ...patch, ...(name ? { name: name.slice(0, 40) } : {}) } : p));
}

export function removeProject(projects: readonly Project[], id: string): Project[] {
  return projects.filter((p) => p.id !== id);
}

/** Take every task out of a project (used when the project is deleted). Same array when nothing changes. */
export function clearProject(tasks: readonly Task[], projectId: string): Task[] {
  if (!tasks.some((t) => t.projectId === projectId)) return tasks as Task[];
  return tasks.map((t) => (t.projectId === projectId ? { ...t, projectId: null } : t));
}
