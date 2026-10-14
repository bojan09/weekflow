"use client";

import { Lock } from "lucide-react";
import { commonWindow, windowOf, workloadOf, type LoadStatus, type Window } from "@/domain/team/availability";
import type { Member, TeamState } from "@/domain/team/types";
import { formatDuration } from "@/domain/stats";
import { formatClock, orderedWeekdays, type TimeFormat } from "@/lib/time";
import { cn } from "@/lib/utils";
import { usePrefsStore } from "@/prefs/store";
import { MemberAvatar } from "./common";

const clock = (minutes: number, format: TimeFormat): string => formatClock(Math.floor(minutes / 60), minutes % 60, format);
const range = (w: Window, format: TimeFormat): string => `${clock(w.start, format)}–${clock(w.end, format)}`;

/** A thin bar placing a window inside 06:00 to 20:00. Decorative: the hours are written out beside it. */
function Bar({ window }: { window: Window | null }) {
  const from = 6 * 60;
  const span = 14 * 60;
  if (!window) return <span aria-hidden="true" className="block h-1.5 rounded-full bg-muted" />;
  const left = Math.max(0, ((window.start - from) / span) * 100);
  const width = Math.min(100 - left, ((window.end - window.start) / span) * 100);
  return (
    <span aria-hidden="true" className="relative block h-1.5 rounded-full bg-muted">
      <span className="absolute inset-y-0 rounded-full bg-primary" style={{ left: `${left}%`, width: `${width}%` }} />
    </span>
  );
}

const LOAD: Record<LoadStatus, { label: string; bar: string; text: string }> = {
  ok: { label: "Room to spare", bar: "bg-primary", text: "text-muted-foreground" },
  near: { label: "Nearly full", bar: "bg-warning", text: "text-warning-text" },
  over: { label: "Over capacity", bar: "bg-danger", text: "text-danger-text" },
};

export function TeamAvailability({ state }: { state: TeamState }) {
  const format = usePrefsStore((s) => s.prefs.calendar.timeFormat);
  const weekStart = usePrefsStore((s) => s.prefs.calendar.weekStart);
  const days = orderedWeekdays(weekStart);

  return (
    <div className="space-y-5">
      <p className="flex items-start gap-2 rounded-xl bg-info-soft px-3 py-3 text-sm text-info-text">
        <Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        Only the working hours each person chooses to share are shown. Personal tasks and calendars stay private, and team planning never
        books time in anyone&apos;s personal planner.
      </p>

      <section aria-labelledby="team-hours" className="space-y-2">
        <h2 id="team-hours" className="text-sm font-semibold">
          Shared working hours
        </h2>
        <div role="region" aria-label="Shared working hours table" tabIndex={0} className="overflow-x-auto rounded-2xl border bg-card outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <table className="w-full min-w-[40rem] border-collapse text-left text-xs">
            <caption className="sr-only">Working hours each person shares, by weekday, and the hours everyone overlaps</caption>
            <thead>
              <tr className="border-b">
                <th scope="col" className="p-3 text-sm font-medium">
                  Person
                </th>
                {days.map((d) => (
                  <th key={d.index} scope="col" className="p-3 text-sm font-medium">
                    {d.short}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {state.members.map((m: Member) => (
                <tr key={m.id} className="border-b">
                  <th scope="row" className="p-3 text-sm font-medium whitespace-nowrap">
                    <span className="flex items-center gap-2">
                      <MemberAvatar member={m} className="size-7 text-[10px]" />
                      {m.name}
                    </span>
                  </th>
                  {days.map((d) => {
                    const w = windowOf(m, d.index);
                    return (
                      <td key={d.index} className="p-3 align-top">
                        <span className={cn("mb-1 block tabular-nums", w ? "" : "text-muted-foreground")}>{w ? range(w, format) : "Off"}</span>
                        <Bar window={w} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-primary-soft/50">
                <th scope="row" className="p-3 text-sm font-semibold">
                  Everyone overlaps
                </th>
                {days.map((d) => {
                  const w = commonWindow(state.members, d.index);
                  return (
                    <td key={d.index} className="p-3 align-top">
                      <span className="mb-1 block font-medium tabular-nums">{w ? range(w, format) : "None"}</span>
                      <Bar window={w} />
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section aria-labelledby="team-load" className="space-y-2">
        <h2 id="team-load" className="text-sm font-semibold">
          Workload
        </h2>
        <p className="text-sm text-muted-foreground">Open assigned team tasks against one week of each person&apos;s shared hours.</p>
        <ul className="space-y-2">
          {state.members.map((m) => {
            const load = workloadOf(m, state.tasks);
            const look = LOAD[load.status];
            const pct = load.capacityMin === 0 ? 100 : Math.min(100, (load.assignedMin / load.capacityMin) * 100);
            return (
              <li key={m.id} className="rounded-2xl border bg-card p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2 font-medium">
                    <MemberAvatar member={m} className="size-7 text-[10px]" />
                    {m.name}
                  </span>
                  <span className={cn("text-xs tabular-nums", look.text)}>
                    {load.openCount} open · {formatDuration(load.assignedMin)} of {formatDuration(load.capacityMin)} ·{" "}
                    <span className={load.status === "ok" ? undefined : "font-medium"}>{look.label}</span>
                  </span>
                </div>
                <div aria-hidden="true" className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                  <div className={cn("h-full rounded-full", look.bar)} style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
