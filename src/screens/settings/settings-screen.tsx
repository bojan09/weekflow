"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { LoadingBlocks } from "@/components/states/states";
import { appPath } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { usePrefsStore } from "@/prefs/store";
import { AboutPane } from "./panes/about";
import { AccessibilityPane } from "./panes/accessibility";
import { AdvancedPane } from "./panes/advanced";
import { AppearancePane } from "./panes/appearance";
import { CalendarPane } from "./panes/calendar";
import { EnginePane } from "./panes/engine";
import { NotificationsPane } from "./panes/notifications";
import { PlanningPane } from "./panes/planning";
import { PrivacyPane } from "./panes/privacy";
import { WorkspacePane } from "./panes/workspace";
import { SETTINGS_SECTIONS, type SettingsSectionId } from "./sections";

const PANES: Record<SettingsSectionId, () => ReactNode> = {
  appearance: () => <AppearancePane />,
  planning: () => <PlanningPane />,
  engine: () => <EnginePane />,
  calendar: () => <CalendarPane />,
  notifications: () => <NotificationsPane />,
  accessibility: () => <AccessibilityPane />,
  privacy: () => <PrivacyPane />,
  workspace: () => <WorkspacePane />,
  advanced: () => <AdvancedPane />,
  about: () => <AboutPane />,
};

/**
 * Two panes on desktop (category rail + content). On small screens the same
 * routes stack: /settings lists categories, a category shows its content.
 */
export function SettingsScreen({ section }: { section?: SettingsSectionId }) {
  const hydrated = usePrefsStore((s) => s.hydrated);
  const active: SettingsSectionId = section ?? "appearance";
  const current = SETTINGS_SECTIONS.find((s) => s.id === active) ?? SETTINGS_SECTIONS[0];

  return (
    <>
      <PageHeader title="Settings" subtitle="Customize Weekflow to fit the way you work" />
      <div className="grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <nav aria-label="Settings categories" className={cn(section ? "hidden lg:block" : "block")}>
          <ul className="flex flex-col gap-1 rounded-2xl border bg-card p-2 shadow-soft lg:sticky lg:top-6">
            {SETTINGS_SECTIONS.map((item) => {
              const Icon = item.icon;
              const isActive = section === item.id;
              const isDesktopDefault = !section && item.id === "appearance";
              return (
                <li key={item.id}>
                  <Link
                    href={appPath("settings", item.id)}
                    aria-current={isActive || isDesktopDefault ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-[calc(0.7rem*var(--density))] text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary-soft text-primary-soft-text"
                        : "text-foreground hover:bg-muted",
                      isDesktopDefault && "lg:bg-primary-soft lg:text-primary-soft-text",
                    )}
                  >
                    <Icon className="size-[18px] shrink-0" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block">{item.label}</span>
                      <span className="block text-xs font-normal text-muted-foreground lg:hidden">
                        {item.description}
                      </span>
                    </span>
                    <ChevronRight className="size-4 text-muted-foreground lg:hidden" aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className={cn("min-w-0", !section && "hidden lg:block")}>
          <Link
            href={appPath("settings")}
            className="mb-2 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary-text lg:hidden"
          >
            <ChevronLeft className="size-4" aria-hidden="true" /> All settings
          </Link>
          <h2 className="mb-1 text-xl font-semibold">{current.label}</h2>
          <p className="mb-5 text-sm text-muted-foreground">{current.description}</p>
          {hydrated ? PANES[active]() : <LoadingBlocks rows={3} />}
        </div>
      </div>
    </>
  );
}
