import { z } from "zod";
import { PRIORITIES, type Task } from "./tasks";

export const MAX_TEMPLATES = 30;

export const templateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, "Give the template a name").max(40, "Keep the name under 40 characters"),
  title: z.string().trim().min(1).max(120),
  notes: z.string().max(2000),
  durationMin: z.number().int().min(5).max(720),
  priority: z.enum(PRIORITIES),
  category: z.string().min(1).max(40),
  labels: z.array(z.string().trim().min(1).max(24)).max(8),
  /** Checklist step texts. */
  steps: z.array(z.string().trim().min(1).max(120)).max(30),
  projectId: z.string().min(1).nullable(),
});

export type Template = z.infer<typeof templateSchema>;

export const templatesSchema = z.array(templateSchema).max(MAX_TEMPLATES);

/** Capture a task as a reusable blueprint. Scheduling, dates and progress are not kept. */
export function templateFromTask(task: Task, id: string, name: string): Template {
  return {
    id,
    name: name.trim().slice(0, 40),
    title: task.title,
    notes: task.notes,
    durationMin: task.durationMin,
    priority: task.priority,
    category: task.category,
    labels: [...task.labels],
    steps: task.checklist.map((item) => item.text),
    projectId: task.projectId,
  };
}

/** Add or replace by name (names are unique, ignoring case). Same list when full or empty-named. */
export function saveTemplate(templates: readonly Template[], template: Template): Template[] {
  if (template.name === "") return templates as Template[];
  const index = templates.findIndex((t) => t.name.toLowerCase() === template.name.toLowerCase());
  if (index >= 0) return templates.map((t, i) => (i === index ? { ...template, id: t.id } : t));
  if (templates.length >= MAX_TEMPLATES) return templates as Template[];
  return [...templates, template];
}

export function removeTemplate(templates: readonly Template[], id: string): Template[] {
  return templates.filter((t) => t.id !== id);
}
