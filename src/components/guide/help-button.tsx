"use client";

import { CircleHelp } from "lucide-react";
import { useUiStore } from "@/stores/ui";

export function HelpButton() {
  const setOpen = useUiStore((s) => s.setHelpOpen);
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="Help for this page"
      aria-keyshortcuts="H"
      className="flex size-10 items-center justify-center rounded-full border bg-card text-muted-foreground transition-colors hover:text-foreground"
    >
      <CircleHelp className="size-[18px]" aria-hidden="true" />
    </button>
  );
}
