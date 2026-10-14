"use client";

import { useSyncExternalStore } from "react";
import { projectsCollection } from "@/data/projects";
import { templatesCollection } from "@/data/templates";
import type { Project } from "@/domain/projects";
import type { Template } from "@/domain/templates";

const NONE: never[] = [];

/** The user's projects. Empty on the server and during hydration. */
export function useProjects(): readonly Project[] {
  return useSyncExternalStore<readonly Project[]>(
    projectsCollection.subscribe,
    projectsCollection.getSnapshot,
    () => NONE,
  );
}

/** The user's task templates. Empty on the server and during hydration. */
export function useTemplates(): readonly Template[] {
  return useSyncExternalStore<readonly Template[]>(
    templatesCollection.subscribe,
    templatesCollection.getSnapshot,
    () => NONE,
  );
}
