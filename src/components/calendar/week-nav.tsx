"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { SegmentedControl, NativeSelect } from "@/components/settings/controls";
import { Button } from "@/components/ui/button";
import { allCategories, type CategoryId } from "@/domain/tasks";
import type { Planner } from "@/hooks/use-planner";
import { formatLong } from "@/lib/dates";
import { usePlannerStore, type PlannerView } from "@/stores/planner";
import { usePrefsStore } from "@/prefs/store";

export function TimeScaleControl() {
  const step = usePrefsStore((state) => state.prefs.calendar.timeStepMin);
  const update = usePrefsStore((state) => state.update);
  return <label className="flex items-center gap-2 text-xs text-muted-foreground">
    <span>Time spacing</span>
    <NativeSelect aria-label="Calendar time spacing" value={step} className="h-9 min-w-0" onChange={(event) => update("calendar", { timeStepMin: Number(event.target.value) as 5 | 10 | 15 | 30 })}>
      {[5, 10, 15, 30].map((minutes) => <option key={minutes} value={minutes}>{minutes} min</option>)}
    </NativeSelect>
  </label>;
}

/** Previous / next arrows, the visible range, and a Today button. */
export function WeekNav({ planner, compact = false }: { planner: Planner; compact?: boolean }) {
  const day = planner.view === "day";
  const label = day && planner.anchor ? formatLong(planner.anchor) : planner.rangeLabel;
  const unit = day ? "day" : "week";
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Button variant="outline" size="icon-lg" aria-label={`Previous ${unit}`} onClick={() => planner.step(-1)}>
        <ChevronLeft aria-hidden="true" />
      </Button>
      <p aria-live="polite" className={compact ? "px-0.5 text-center text-xs font-medium tabular-nums sm:text-sm" : "min-w-36 px-1 text-center text-sm font-medium tabular-nums"}>
        {compact ? <><span className="sm:hidden">{label?.replace(/, \d{4}$/, "") || " "}</span><span className="hidden sm:inline">{label || " "}</span></> : label || " "}
      </p>
      <Button variant="outline" size="icon-lg" aria-label={`Next ${unit}`} onClick={() => planner.step(1)}>
        <ChevronRight aria-hidden="true" />
      </Button>
      <Button variant="outline" size="lg" className="h-9" onClick={planner.goToday} disabled={planner.isCurrentWeek && planner.anchor === planner.now?.date}>
        Today
      </Button>
    </div>
  );
}

export function ViewSwitch({ planner }: { planner: Planner }) {
  return (
    <SegmentedControl<PlannerView>
      label="Calendar view"
      value={planner.view}
      onChange={planner.setView}
      options={[
        { value: "day", label: "Day" },
        { value: "week", label: "Week" },
        { value: "agenda", label: "Agenda" },
      ]}
      className="flex-nowrap [&>button]:min-h-9 [&>button]:min-w-16 [&>button]:px-3"
    />
  );
}

export function CategoryFilter() {
  const category = usePlannerStore((s) => s.category);
  const setCategory = usePlannerStore((s) => s.setCategory);
  return (
    <NativeSelect
      aria-label="Filter by category"
      value={category}
      onChange={(e) => setCategory(e.target.value as CategoryId | "all")}
      className="h-9 min-w-36"
    >
      <option value="all">All categories</option>
      {allCategories().map((c) => (
        <option key={c.id} value={c.id}>
          {c.label}
        </option>
      ))}
    </NativeSelect>
  );
}
