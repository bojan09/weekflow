"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { OfflineNotice } from "@/components/states/states";
import { ScreenHint } from "@/components/guide/screen-hint";
import { HelpPanel } from "@/components/guide/help-panel";
import { HistoryDialog } from "@/components/plan/history-dialog";
import { PlanDialog } from "@/components/plan/plan-dialog";
import { OrganizeDialog } from "@/components/tasks/organize-dialog";
import { TaskEditor } from "@/components/tasks/task-editor";
import { useConnectivity } from "@/data/use-online";
import { GuideTracker } from "@/guide/tracker";
import { useAutoReplan } from "@/hooks/use-auto-replan";
import { useReminders } from "@/hooks/use-reminders";
import { CommandMenu } from "./command-menu";
import { MobileNav } from "./mobile-nav";
import { ShortcutsDialog, useGlobalShortcuts } from "./shortcuts";
import { Sidebar } from "./sidebar";
import { StateSimulator } from "./state-simulator";

export function AppShell({ children }: { children: ReactNode }) {
  const account = usePathname().startsWith("/app/");
  useGlobalShortcuts();
  useAutoReplan();
  useReminders();
  const { online, simulated } = useConnectivity();

  return (
    <div className="flex min-h-dvh gap-2 p-2 sm:gap-4 sm:p-3 lg:p-4">
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {!account ? <div
          role="region"
          aria-label="Demo mode"
          className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 surface-panel rounded-2xl px-4 py-2 text-xs text-muted-foreground shadow-soft"
        >
          <p><span className="sm:hidden" title="Everything you change stays in this browser.">Demo · local data</span><span className="hidden sm:inline">Demo mode. Everything you change stays in this browser.</span></p>
          <div className="flex items-center gap-2 sm:gap-3">
            <StateSimulator />
            <Link href="/" className="inline-flex min-h-11 items-center font-medium text-primary-text underline-offset-4 hover:underline">
              Exit demo
            </Link>
          </div>
        </div> : null}
        {!online ? <OfflineNotice simulated={simulated} /> : null}
        <main
          id="main"
          tabIndex={-1}
          className="surface-panel flex-1 rounded-2xl p-3 pb-28 shadow-soft outline-none sm:rounded-3xl sm:p-5 sm:pb-28 md:p-8 md:pb-28 lg:pb-8"
        >
          <ScreenHint />
          {children}
        </main>
      </div>
      <MobileNav />
      <CommandMenu />
      <ShortcutsDialog />
      <TaskEditor />
      <PlanDialog />
      <GuideTracker />
      <HistoryDialog />
      <HelpPanel />
      <OrganizeDialog />
    </div>
  );
}
