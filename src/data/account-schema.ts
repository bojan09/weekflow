import { z } from "zod";
import { tasksSchema } from "@/domain/tasks";
import { projectsSchema } from "@/domain/projects";
import { templatesSchema } from "@/domain/templates";
import { historySchema } from "@/domain/history";
import { profileSchema } from "@/domain/profile";
import { prefsSchema, DEFAULT_PREFS } from "@/prefs/schema";
import { guideSchema } from "@/guide/schema";

export const resourceSchemas = { tasks: tasksSchema, projects: projectsSchema, templates: templatesSchema, history: historySchema, profile: profileSchema, prefs: prefsSchema, guide: guideSchema };
export type Resource = keyof typeof resourceSchemas;
export const resourceSchema = z.enum(["tasks", "projects", "templates", "history", "profile", "prefs", "guide"]);
export interface SavedResource { revision: number; value: unknown }
export type AccountSnapshot = Record<Resource, SavedResource>;

export function emptyAccount(user: { name: string; email: string; $createdAt: string }): AccountSnapshot {
  return {
    tasks: { revision: 0, value: [] }, projects: { revision: 0, value: [] }, templates: { revision: 0, value: [] }, history: { revision: 0, value: [] },
    profile: { revision: 0, value: { fullName: user.name || user.email.split("@")[0], email: user.email, bio: "", timeZone: "UTC", locale: "en-US", joinedAt: user.$createdAt.slice(0, 10) } },
    prefs: { revision: 0, value: DEFAULT_PREFS }, guide: { revision: 0, value: guideSchema.parse({}) },
  };
}
