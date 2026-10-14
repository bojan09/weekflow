"use client";

import { useMemo, useRef } from "react";
import { TimeGrid } from "@/components/calendar/time-grid";
import { buildScenario } from "@/domain/scenarios";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useNow } from "@/hooks/use-now";
import { addDays, startOfWeek, weekDates } from "@/lib/dates";
import { usePrefsStore } from "@/prefs/store";

const noop = (): void => undefined;
const HEIGHT = "h-[24rem] md:h-[30rem]";

/**
 * The real week calendar, read-only, on sample data. It is the same component
 * as the app, so what visitors see is what they get. Not interactive here.
 */
export function ProductWindow() {
  const now = useNow();
  const planning = usePrefsStore((s) => s.prefs.planning);
  const format = usePrefsStore((s) => s.prefs.calendar.timeFormat);
  const density = usePrefsStore((s) => s.prefs.appearance.density);
  const wide = useMediaQuery("(min-width: 768px)");
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  const tasks = useMemo(() => {
    if (!now) return [];
    // Treat the sample week as not yet started so every task shows as upcoming.
    const monday = startOfWeek(now.date, "monday");
    return buildScenario("standard", monday, monday);
  }, [now]);

  const days = useMemo(() => {
    if (!now) return [];
    return wide ? weekDates(now.date, "monday") : [0, 1, 2].map((i) => addDays(now.date, i));
  }, [now, wide]);

  return (
    <div className="relative">
      <div className="mb-3 flex items-center gap-2 px-1">
        <span aria-hidden="true" className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-danger/70" />
          <span className="size-2.5 rounded-full bg-warning/70" />
          <span className="size-2.5 rounded-full bg-success/70" />
        </span>
        <p className="text-xs font-medium text-muted-foreground">Your week in Weekflow</p>
      </div>
      <p className="sr-only">
        A preview of the Weekflow week calendar showing meetings, focus blocks and tasks arranged across the working
        days, with locked tasks marked by a padlock.
      </p>
      {now ? (
        <div aria-hidden="true" inert className="pointer-events-none select-none">
          <TimeGrid
            days={days}
            tasks={tasks}
            allTasks={tasks}
            planning={planning}
            format={format}
            density={density}
            now={now}
            conflictedIds={new Set<string>()}
            scrollerRef={scrollerRef}
            bodyRef={bodyRef}
            drag={null}
            heightClass={HEIGHT}
            onBlockPointerDown={noop}
            onResizePointerDown={noop}
            onOpenTask={noop}
            onMoveTask={noop}
            onResizeTask={noop}
            onToggleLock={noop}
            onCreateAt={noop}
            announce={noop}
          />
        </div>
      ) : (
        <div aria-hidden="true" className={`${HEIGHT} animate-pulse rounded-2xl border bg-card`} />
      )}
    </div>
  );
}
