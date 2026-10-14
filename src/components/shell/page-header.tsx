"use client";

import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { useUiStore } from "@/stores/ui";
import { AvatarMenu } from "./avatar-menu";

function SearchButton() {
  const setCommandOpen = useUiStore((s) => s.setCommandOpen);
  return (
    <button
      type="button"
      onClick={() => setCommandOpen(true)}
      aria-label="Search and commands"
      aria-keyshortcuts="Control+K Meta+K"
      className="flex size-10 items-center justify-center rounded-full border bg-card text-muted-foreground transition-colors hover:text-foreground"
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
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-x-6 gap-y-4 md:mb-8">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      <div className="flex items-center gap-2">
        {actions}
        <SearchButton />
        <AvatarMenu />
      </div>
    </header>
  );
}
