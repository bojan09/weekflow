import {
  BookOpen,
  ChartColumn,
  CalendarDays,
  CalendarRange,
  History,
  House,
  ListChecks,
  Settings,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { AppRoute } from "./routes";

export interface NavItem {
  route: AppRoute;
  label: string;
  icon: LucideIcon;
  /** Second key of the "g then <key>" shortcut. */
  shortcut: string;
  /** False keeps the item out of the five-slot phone tab bar (it lives under More). */
  tab?: boolean;
}

export const PRIMARY_NAV: readonly NavItem[] = [
  { route: "home", label: "Home", icon: House, shortcut: "h" },
  { route: "week", label: "My Week", icon: CalendarRange, shortcut: "w" },
  { route: "tasks", label: "Tasks", icon: ListChecks, shortcut: "t" },
  { route: "calendar", label: "Calendar", icon: CalendarDays, shortcut: "c" },
  { route: "review", label: "Review", icon: ChartColumn, shortcut: "r", tab: false },
  { route: "team", label: "Team", icon: Users, shortcut: "m", tab: false },
];

export const SECONDARY_NAV: readonly NavItem[] = [
  { route: "profile", label: "Profile", icon: UserRound, shortcut: "p" },
  { route: "settings", label: "Settings", icon: Settings, shortcut: "s" },
  { route: "guide", label: "Guide", icon: BookOpen, shortcut: "u" },
];

/** Reachable from the avatar menu, the command palette and the More sheet. */
export const EXTRA_NAV: readonly NavItem[] = [
  { route: "changelog", label: "Version history", icon: History, shortcut: "v" },
];

export const ALL_NAV: readonly NavItem[] = [...PRIMARY_NAV, ...SECONDARY_NAV, ...EXTRA_NAV];
