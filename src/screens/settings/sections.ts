import {
  Bell,
  Briefcase,
  CalendarClock,
  CalendarDays,
  Accessibility,
  Info,
  Palette,
  ShieldCheck,
  SlidersHorizontal,
  Workflow,
  type LucideIcon,
} from "lucide-react";

export const SETTINGS_SECTIONS = [
  { id: "appearance", label: "Appearance", description: "Theme, background and color", icon: Palette },
  { id: "planning", label: "Planning preferences", description: "Working days, hours and breaks", icon: CalendarClock },
  { id: "engine", label: "Scheduling engine", description: "Rules the planner follows", icon: Workflow },
  { id: "calendar", label: "Calendar", description: "Default view, week start, time format", icon: CalendarDays },
  { id: "notifications", label: "Notifications", description: "Reminders and weekly review", icon: Bell },
  { id: "accessibility", label: "Accessibility", description: "Motion and text size", icon: Accessibility },
  { id: "privacy", label: "Privacy and security", description: "Your data and account", icon: ShieldCheck },
  { id: "workspace", label: "Workspace preferences", description: "Defaults for new tasks", icon: Briefcase },
  { id: "advanced", label: "Advanced", description: "Demo tools and resets", icon: SlidersHorizontal },
  { id: "about", label: "About", description: "Version and changelog", icon: Info },
] as const satisfies ReadonlyArray<{
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
}>;

export type SettingsSectionId = (typeof SETTINGS_SECTIONS)[number]["id"];

export const SETTINGS_SECTION_IDS = SETTINGS_SECTIONS.map((s) => s.id);

export function isSettingsSection(value: string): value is SettingsSectionId {
  return (SETTINGS_SECTION_IDS as string[]).includes(value);
}
