"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ALL_NAV } from "@/lib/nav";
import { appPath } from "@/lib/routes";
import { useUiStore } from "@/stores/ui";

const SEQUENCE_WINDOW_MS = 1200;

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
  );
}

/** Global keyboard shortcuts. Ignored while typing in a field. */
export function useGlobalShortcuts(): void {
  const router = useRouter();

  useEffect(() => {
    let pendingG = 0;

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.defaultPrevented || event.altKey) return;
      const ui = useUiStore.getState();

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        ui.setCommandOpen(!ui.commandOpen);
        return;
      }
      if (event.metaKey || event.ctrlKey || isTyping(event.target)) return;

      if (event.key === "?") {
        ui.setShortcutsOpen(true);
        return;
      }
      if (event.key === "/") {
        event.preventDefault();
        ui.setCommandOpen(true);
        return;
      }

      const key = event.key.toLowerCase();
      if (pendingG && Date.now() - pendingG < SEQUENCE_WINDOW_MS) {
        pendingG = 0;
        const target = ALL_NAV.find((item) => item.shortcut === key);
        if (target) router.push(appPath(target.route));
        return;
      }
      if (key === "g") pendingG = Date.now();
      else if (key === "c") {
        event.preventDefault();
        ui.openEditor({ kind: "new" });
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);
}

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="rounded-md border bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
      {children}
    </kbd>
  );
}

export function ShortcutsDialog() {
  const open = useUiStore((s) => s.shortcutsOpen);
  const setOpen = useUiStore((s) => s.setShortcutsOpen);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>Shortcuts are off while you are typing in a field.</DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-2.5 text-sm">
          <dt>Search and commands</dt>
          <dd className="flex gap-1">
            <Kbd>Ctrl</Kbd>
            <Kbd>K</Kbd>
            <span className="px-1 text-muted-foreground">or</span>
            <Kbd>/</Kbd>
          </dd>
          <dt>Show this help</dt>
          <dd>
            <Kbd>?</Kbd>
          </dd>
          <dt>New task</dt>
          <dd>
            <Kbd>C</Kbd>
          </dd>
          <dt>Previous / next week (calendar pages)</dt>
          <dd className="flex gap-1">
            <Kbd>[</Kbd>
            <Kbd>]</Kbd>
          </dd>
          <dt>Jump to today (calendar pages)</dt>
          <dd>
            <Kbd>.</Kbd>
          </dd>
          {ALL_NAV.map((item) => (
            <div key={item.route} className="contents">
              <dt>Go to {item.label}</dt>
              <dd className="flex gap-1">
                <Kbd>G</Kbd>
                <span className="text-muted-foreground">then</span>
                <Kbd>{item.shortcut.toUpperCase()}</Kbd>
              </dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  );
}
