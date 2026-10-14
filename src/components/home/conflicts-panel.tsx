"use client";

import { useState } from "react";
import { CircleCheck, TriangleAlert } from "lucide-react";
import { runConflictAction } from "@/components/tasks/actions";
import { Button } from "@/components/ui/button";
import type { Conflict, Severity } from "@/domain/conflicts";
import { useUiStore } from "@/stores/ui";
import { cn } from "@/lib/utils";

const SEVERITY: Record<Severity, { label: string; tone: string }> = {
  high: { label: "Needs attention", tone: "bg-danger-soft text-danger-text" },
  medium: { label: "Worth a look", tone: "bg-warning-soft text-warning-text" },
  low: { label: "Heads up", tone: "bg-info-soft text-info-text" },
};

const COLLAPSED_COUNT = 3;

/**
 * Problems in the current schedule, each with fixes you can apply by hand.
 * Nothing changes until you press a button.
 */
export function ConflictsPanel({ conflicts }: { conflicts: Conflict[] }) {
  const [expanded, setExpanded] = useState(false);
  const openEditor = useUiStore((s) => s.openEditor);
  const shown = expanded ? conflicts : conflicts.slice(0, COLLAPSED_COUNT);

  return (
    <section aria-labelledby="conflicts-title" className="rounded-2xl border bg-card p-4 shadow-soft">
      <div className="flex items-center justify-between gap-2">
        <h2 id="conflicts-title" className="flex items-center gap-2 text-sm font-semibold">
          <TriangleAlert className="size-4 text-warning-text" aria-hidden="true" />
          Scheduling conflicts
        </h2>
        {conflicts.length > 0 ? (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums">{conflicts.length}</span>
        ) : null}
      </div>

      {conflicts.length === 0 ? (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-success-soft px-3 py-3 text-sm text-success-text">
          <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          No conflicts. Your plan fits your rules.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {shown.map((conflict) => (
            <li key={conflict.id} className="rounded-xl border p-3">
              <span className={cn("inline-block rounded-full px-2 py-0.5 text-[11px] font-medium", SEVERITY[conflict.severity].tone)}>
                {SEVERITY[conflict.severity].label}
              </span>
              <p className="mt-1.5 text-sm font-medium">{conflict.title}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{conflict.detail}</p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {conflict.actions.map((action) => (
                  <Button
                    key={`${action.type}:${action.label}`}
                    variant="outline"
                    size="sm"
                    onClick={() => runConflictAction(action, (id) => openEditor({ kind: "edit", id }))}
                    className="h-8 max-w-full whitespace-normal py-1 text-left"
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}

      {conflicts.length > COLLAPSED_COUNT ? (
        <Button variant="ghost" size="sm" onClick={() => setExpanded((v) => !v)} className="mt-2 w-full">
          {expanded ? "Show fewer" : `Show all ${conflicts.length}`}
        </Button>
      ) : null}
    </section>
  );
}
