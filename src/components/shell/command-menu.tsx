"use client";

import { useRouter } from "next/navigation";
import { Keyboard, Monitor, Moon, Plus, Sun, Wand2, History } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandDialog,
} from "@/components/ui/command";
import { ALL_NAV } from "@/lib/nav";
import { appPath } from "@/lib/routes";
import { usePrefsStore } from "@/prefs/store";
import { PALETTES } from "@/theme/generated/palettes";
import { useUiStore } from "@/stores/ui";

export function CommandMenu() {
  const router = useRouter();
  const open = useUiStore((s) => s.commandOpen);
  const setOpen = useUiStore((s) => s.setCommandOpen);
  const setShortcutsOpen = useUiStore((s) => s.setShortcutsOpen);
  const openEditor = useUiStore((s) => s.openEditor);
  const openPlan = useUiStore((s) => s.openPlan);
  const setHistoryOpen = useUiStore((s) => s.setHistoryOpen);
  const update = usePrefsStore((s) => s.update);

  const run = (action: () => void): void => {
    setOpen(false);
    action();
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Search and commands"
      description="Jump to a page or change your appearance"
    >
      <Command>
        <CommandInput placeholder="Search pages and settings…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Actions">
            <CommandItem value="new task add" onSelect={() => run(() => openEditor({ kind: "new" }))}>
              <Plus aria-hidden="true" /> New task
            </CommandItem>
            <CommandItem value="plan my week schedule" onSelect={() => run(() => openPlan())}>
              <Wand2 aria-hidden="true" /> Plan my week
            </CommandItem>
            <CommandItem value="schedule history restore undo" onSelect={() => run(() => setHistoryOpen(true))}>
              <History aria-hidden="true" /> Schedule history
            </CommandItem>
          </CommandGroup>
          <CommandGroup heading="Go to">
            {ALL_NAV.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={item.route}
                  value={`go ${item.label}`}
                  onSelect={() => run(() => router.push(appPath(item.route)))}
                >
                  <Icon aria-hidden="true" />
                  {item.label}
                </CommandItem>
              );
            })}
          </CommandGroup>
          <CommandGroup heading="Theme">
            <CommandItem value="theme light" onSelect={() => run(() => update("appearance", { theme: "light" }))}>
              <Sun aria-hidden="true" /> Light theme
            </CommandItem>
            <CommandItem value="theme dark" onSelect={() => run(() => update("appearance", { theme: "dark" }))}>
              <Moon aria-hidden="true" /> Dark theme
            </CommandItem>
            <CommandItem value="theme system" onSelect={() => run(() => update("appearance", { theme: "system" }))}>
              <Monitor aria-hidden="true" /> System theme
            </CommandItem>
          </CommandGroup>
          <CommandGroup heading="Accent color">
            {PALETTES.map((palette) => (
              <CommandItem
                key={palette.id}
                value={`accent ${palette.name}`}
                onSelect={() => run(() => update("appearance", { accent: palette.id }))}
              >
                <span
                  className="size-3.5 rounded-full border border-foreground/20"
                  style={{ backgroundColor: palette.swatch }}
                  aria-hidden="true"
                />
                {palette.name}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Help">
            <CommandItem value="keyboard shortcuts" onSelect={() => run(() => setShortcutsOpen(true))}>
              <Keyboard aria-hidden="true" /> Keyboard shortcuts
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
