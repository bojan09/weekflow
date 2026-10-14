import { projectsSchema, type Project } from "@/domain/projects";
import { createLocalCollection } from "./collection";

/** Demo projects. The demo tasks refer to these ids. */
export const SEED_PROJECTS: Project[] = [
  { id: "p-launch", name: "Website launch", hue: "blue" },
  { id: "p-home", name: "Home", hue: "green" },
];

export const projectsCollection = createLocalCollection<Project[]>({
  key: "weekflow:demo:projects",
  schema: projectsSchema,
  seed: () => SEED_PROJECTS,
});

export function mutateProjects(operation: (projects: readonly Project[]) => Project[]): void {
  const previous = projectsCollection.getSnapshot();
  const next = operation(previous);
  if (next !== previous) projectsCollection.write(next);
}
