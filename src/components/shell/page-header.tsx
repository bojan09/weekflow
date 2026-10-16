"use client";

import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { HelpButton } from "@/components/guide/help-button";
import { useUiStore } from "@/stores/ui";
import { AvatarMenu } from "./avatar-menu";
import { cn } from "@/lib/utils";

function SearchButton() {
  const setCommandOpen = useUiStore((s) => s.setCommandOpen);
  return (
    <button
      type="button"
      onClick={() => setCommandOpen(true)}
      aria-label="Search and commands"
      aria-keyshortcuts="Control+K Meta+K"
      className="flex size-11 items-center justify-center rounded-full border bg-card text-muted-foreground transition-colors hover:text-foreground sm:size-10"
    >
      <Search className="size-[18px]" aria-hidden="true" />
    </button>
  );
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Page-specific controls, shown before the search and avatar buttons. */
  actions?: ReactNode;
  compact?: boolean;
  navigation?: ReactNode;
}

export function PageHeader({ title, subtitle, actions, compact = false, navigation }: PageHeaderProps) {
  return (
    <header className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-3 sm:flex sm:flex-wrap sm:justify-between sm:gap-x-4", compact ? "mb-3 md:mb-5" : "mb-4 md:mb-8")}>
      <div className="min-w-0">
        <h1 className={cn("font-semibold tracking-tight md:text-3xl", compact ? "text-xl sm:text-2xl" : "text-2xl")}>{title}</h1>
        {subtitle ? <p className="sr-only mt-1.5 text-sm text-muted-foreground sm:not-sr-only">{subtitle}</p> : null}
      </div>
        <div className="flex items-center gap-2 sm:order-3">
          <span className="hidden sm:inline-flex"><HelpButton /></span>
          <SearchButton />
          <AvatarMenu />
        </div>
      {actions ? <div className="col-span-2 flex max-w-full min-w-0 flex-wrap items-center gap-2 sm:order-2 sm:ml-auto">{actions}</div> : null}
      {navigation ? <div className="col-span-2 flex w-full flex-wrap items-center justify-between gap-2 sm:order-4">{navigation}</div> : null}
    </header>
  );
}
