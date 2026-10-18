import { z } from "zod";
import { PRIORITIES, TASK_HUES } from "../tasks";

import { PROJECT_HUES } from "../project-colors";

export const ROLES = ["owner", "admin", "member", "viewer"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
};

export const ROLE_SUMMARY: Record<Role, string> = {
  owner: "Everything, including deleting the workspace.",
  admin: "Manages people, projects and every task. Cannot touch owners.",
  member: "Creates tasks and comments, and edits tasks they created or own.",
  viewer: "Can read everything, and cannot change anything.",
};

export const TASK_STATUSES = ["todo", "doing", "done"] as const;
export type TeamTaskStatus = (typeof TASK_STATUSES)[number];

export const STATUS_LABEL: Record<TeamTaskStatus, string> = {
  todo: "To do",
  doing: "In progress",
  done: "Done",
};

const minutes = z.number().int().min(0).max(1440);

/** One working window in minutes since midnight, or null for a day off. */
export const dayHoursSchema = z
  .object({ start: minutes, end: minutes })
  .refine((h) => h.end > h.start, "End must be after start")
  .nullable();

export const memberSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(80),
  email: z.email(),
  role: z.enum(ROLES),
  hue: z.enum(TASK_HUES),
  /** Hours this member shares with the team, Sunday first. Personal calendars are never shared. */
  week: z.array(dayHoursSchema).length(7),
});

export const invitationSchema = z.object({
  id: z.string().min(1),
  email: z.email(),
  role: z.enum(["admin", "member", "viewer"]),
  invitedBy: z.string().min(1),
  invitedAt: z.string().min(1),
});

export const teamProjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, "Give the project a name").max(40),
  hue: z.enum(PROJECT_HUES),
});

export const commentSchema = z.object({
  id: z.string().min(1),
  authorId: z.string().min(1),
  text: z.string().trim().min(1, "Write something first").max(500),
  at: z.string().min(1),
});

export const teamTaskSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1, "Give the task a title").max(120),
  notes: z.string().max(1000),
  projectId: z.string().min(1).nullable(),
  assigneeId: z.string().min(1).nullable(),
  createdBy: z.string().min(1),
  status: z.enum(TASK_STATUSES),
  priority: z.enum(PRIORITIES),
  deadline: z.string().nullable(),
  durationMin: z.number().int().min(5).max(720),
  comments: z.array(commentSchema),
  createdAt: z.string().min(1),
});

export const teamStateSchema = z.object({
  workspace: z.object({ id: z.string().min(1), name: z.string().trim().min(1).max(40) }),
  members: z.array(memberSchema).min(1),
  invitations: z.array(invitationSchema),
  projects: z.array(teamProjectSchema),
  tasks: z.array(teamTaskSchema),
  /** Demo only: which member you are acting as. */
  viewerId: z.string().min(1),
});

export type Member = z.infer<typeof memberSchema>;
export type Invitation = z.infer<typeof invitationSchema>;
export type TeamProject = z.infer<typeof teamProjectSchema>;
export type Comment = z.infer<typeof commentSchema>;
export type TeamTask = z.infer<typeof teamTaskSchema>;
export type TeamState = z.infer<typeof teamStateSchema>;
