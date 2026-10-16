"use client";

import { Plus } from "lucide-react";
import { useLayoutEffect } from "react";
import { CategoryFilter, ViewSwitch, WeekNav } from "@/components/calendar/week-nav";
import { WeekPlanner } from "@/components/calendar/week-planner";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { usePlanner } from "@/hooks/use-planner";
import { usePlannerShortcuts } from "@/hooks/use-planner-shortcuts";
import { useUiStore } from "@/stores/ui";
import { usePlannerStore } from "@/stores/planner";

export function WeekScreen() {
  // Returning to My Week starts at today; in-page navigation remains unrestricted.
  useLayoutEffect(() => { usePlannerStore.getState().setAnchor(null); }, []);
  const planner = usePlanner();
  const openEditor = useUiStore((s) => s.openEditor);
  usePlannerShortcuts(planner);

  return (
    <>
      <PageHeader
        title="My Week"
        subtitle="Drag to move, pull the bottom edge to resize, and lock what must not move."
        actions={
          <Button size="lg" className="h-10" onClick={() => openEditor({ kind: "new" })}>
            <Plus aria-hidden="true" /> New task
          </Button>
        }
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <WeekNav planner={planner} />
        <div className="flex flex-wrap items-center gap-2">
          <CategoryFilter />
          <ViewSwitch planner={planner} />
        </div>
      </div>
      <WeekPlanner variant="full" />
    </>
  );
}
