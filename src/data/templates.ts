import { templatesSchema, type Template } from "@/domain/templates";
import { createLocalCollection } from "./collection";

/** Two starter templates so the feature is visible in the demo. */
export const SEED_TEMPLATES: Template[] = [
  {
    id: "tpl-report",
    name: "Weekly report",
    title: "Weekly report",
    notes: "Send to the team by end of day.",
    durationMin: 60,
    priority: "medium",
    category: "admin",
    labels: ["report"],
    steps: ["Gather the numbers", "Write the summary", "Send it"],
    projectId: null,
  },
  {
    id: "tpl-focus",
    name: "Deep work block",
    title: "Deep work",
    notes: "Phone away, notifications off.",
    durationMin: 120,
    priority: "high",
    category: "focus",
    labels: [],
    steps: ["Pick one outcome", "Work without switching tasks"],
    projectId: null,
  },
];

export const templatesCollection = createLocalCollection<Template[]>({
  key: "weekflow:demo:templates",
  schema: templatesSchema,
  seed: () => SEED_TEMPLATES,
});

export function mutateTemplates(operation: (templates: readonly Template[]) => Template[]): void {
  const previous = templatesCollection.getSnapshot();
  const next = operation(previous);
  if (next !== previous) templatesCollection.write(next);
}
