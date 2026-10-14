"use client";

import { FlaskConical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SIMULATED_STATES, useSimulator, type SimulatedState } from "@/data/simulator";
import { usePrefsStore } from "@/prefs/store";
import { cn } from "@/lib/utils";

/** Demo-only control (lives in the demo bar) that forces loading/error/offline/denied. */
export function StateSimulator() {
  const enabled = usePrefsStore((s) => s.prefs.advanced.showStateSimulator);
  const mode = useSimulator((s) => s.mode);
  const setMode = useSimulator((s) => s.setMode);
  if (!enabled) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex h-8 items-center gap-1.5 rounded-full border bg-card px-3 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring",
          mode !== "none" && "border-warning-border bg-warning-soft text-warning-text",
        )}
      >
        <FlaskConical className="size-4" aria-hidden="true" />
        {mode === "none" ? "Demo states" : `State: ${SIMULATED_STATES.find((s) => s.id === mode)?.label}`}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="bottom" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Preview a screen state</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={mode} onValueChange={(v) => setMode(v as SimulatedState)}>
            {SIMULATED_STATES.map((state) => (
              <DropdownMenuRadioItem key={state.id} value={state.id}>
                <span className="flex flex-col">
                  <span>{state.label}</span>
                  <span className="text-xs text-muted-foreground">{state.description}</span>
                </span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
