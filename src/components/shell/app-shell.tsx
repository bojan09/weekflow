"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { OfflineNotice } from "@/components/states/states";
import { useConnectivity } from "@/data/use-online";
import { CommandMenu } from "./command-menu";
import { MobileNav } from "./mobile-nav";
import { ShortcutsDialog, useGlobalShortcuts } from "./shortcuts";
import { Sidebar } from "./sidebar";
import { StateSimulator } from "./state-simulator";

export function AppShell({ children }: { children: ReactNode }) {
  useGlobalShortcuts();
  const { online, simulated } = useConnectivity();

  return (
    <div className="flex min-h-dvh gap-4 p-3 lg:p-4">
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div
          role="region"
          aria-label="Demo mode"
          className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-2xl bg-background px-4 py-2 text-xs text-muted-foreground shadow-soft"
        >
          <p>Demo mode. Everything you change stays in this browser.</p>
          <div className="flex items-center gap-3">
            <StateSimulator />
            <Link href="/" className="font-medium text-primary-text underline-offset-4 hover:underline">
              Exit demo
            </Link>
          </div>
        </div>
        {!online ? <OfflineNotice simulated={simulated} /> : null}
        <main
          id="main"
          tabIndex={-1}
          className="flex-1 rounded-3xl bg-background p-5 pb-28 shadow-soft outline-none md:p-8 md:pb-28 lg:pb-8"
        >
          {children}
        </main>
      </div>
      <MobileNav />
      <CommandMenu />
      <ShortcutsDialog />
    </div>
  );
}
