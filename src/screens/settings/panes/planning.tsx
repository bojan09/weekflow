"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  NativeSelect,
  NumberField,
  Notice,
  SettingRow,
  SettingsGroup,
  ToggleRow,
} from "@/components/settings/controls";
import { Term } from "@/components/guide/term";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { orderedWeekdays, timeToMinutes } from "@/lib/time";
import { cn } from "@/lib/utils";
import { usePrefsStore } from "@/prefs/store";

/** Start/end time pair that only commits a valid (start < end) range. */
function TimeRange({
  start,
  end,
  idPrefix,
  onCommit,
}: {
  start: string;
  end: string;
  idPrefix: string;
  onCommit: (start: string, end: string) => void;
}) {
  const [draft, setDraft] = useState({ start, end });
  const invalid = timeToMinutes(draft.start) >= timeToMinutes(draft.end);

  const change = (next: { start: string; end: string }): void => {
    setDraft(next);
    if (timeToMinutes(next.start) < timeToMinutes(next.end)) onCommit(next.start, next.end);
  };

  return (
    <div>
      <div className="flex items-center gap-2">
        <Input
          id={`${idPrefix}-start`}
          type="time"
          aria-label="Start time"
          value={draft.start}
          onChange={(e) => change({ ...draft, start: e.target.value })}
          className="h-10 w-32 rounded-xl border-input bg-card"
          aria-invalid={invalid}
        />
        <span className="text-muted-foreground" aria-hidden="true">
          to
        </span>
        <Input
          id={`${idPrefix}-end`}
          type="time"
          aria-label="End time"
          value={draft.end}
          onChange={(e) => change({ ...draft, end: e.target.value })}
          className="h-10 w-32 rounded-xl border-input bg-card"
          aria-invalid={invalid}
        />
      </div>
      {invalid ? (
        <p role="alert" className="mt-1.5 text-xs text-danger-text">
          End time must be after start time.
        </p>
      ) : null}
    </div>
  );
}

export function PlanningPane() {
  const planning = usePrefsStore((s) => s.prefs.planning);
  const weekStart = usePrefsStore((s) => s.prefs.calendar.weekStart);
  const update = usePrefsStore((s) => s.update);

  const toggleDay = (index: number): void => {
    const has = planning.workDays.includes(index);
    if (has && planning.workDays.length === 1) return;
    const next = has ? planning.workDays.filter((d) => d !== index) : [...planning.workDays, index];
    update("planning", { workDays: next.sort((a, b) => a - b) });
  };

  return (
    <div className="space-y-5">
      <Notice>
        These rules are saved now. The scheduling engine starts using them in version 0.0.3, and the
        Active Rules bar on Home reflects what you turn on here.
      </Notice>

      <SettingsGroup title="Working time">
        <SettingRow label="Working days" description="Days the planner may schedule work." stacked>
          <div role="group" aria-label="Working days" className="flex flex-wrap gap-2">
            {orderedWeekdays(weekStart).map((day) => {
              const on = planning.workDays.includes(day.index);
              return (
                <button
                  key={day.index}
                  type="button"
                  aria-pressed={on}
                  aria-label={day.long}
                  onClick={() => toggleDay(day.index)}
                  className={cn(
                    "h-10 min-w-12 rounded-xl border px-3 text-sm font-medium transition-colors",
                    on
                      ? "border-primary-border bg-primary-soft text-primary-soft-text ring-1 ring-primary-text/40"
                      : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {day.short}
                </button>
              );
            })}
          </div>
        </SettingRow>
        <SettingRow label="Working hours" description="The default visible range on your calendar.">
          <TimeRange
            idPrefix="work"
            start={planning.workStart}
            end={planning.workEnd}
            onCommit={(workStart, workEnd) => update("planning", { workStart, workEnd })}
          />
        </SettingRow>
        <SettingRow label="Maximum daily workload" hint={<Term id="daily-limit" />} description="The planner stops filling a day past this.">
          {(id) => (
            <NumberField
              id={id}
              value={planning.maxDailyHours}
              min={1}
              max={16}
              unit="hours"
              onChange={(maxDailyHours) => update("planning", { maxDailyHours })}
            />
          )}
        </SettingRow>
        <SettingRow label="Buffer between tasks" hint={<Term id="buffer" />} description="Minimum gap kept between two tasks.">
          {(id) => (
            <NumberField
              id={id}
              value={planning.bufferMin}
              min={0}
              max={60}
              step={5}
              unit="minutes"
              onChange={(bufferMin) => update("planning", { bufferMin })}
            />
          )}
        </SettingRow>
        <SettingRow label="Preferred time of day" description="Where the planner tries to place work first.">
          {(id) => (
            <NativeSelect
              id={id}
              value={planning.preferredTime}
              onChange={(e) =>
                update("planning", { preferredTime: e.target.value as typeof planning.preferredTime })
              }
            >
              <option value="any">No preference</option>
              <option value="morning">Mornings</option>
              <option value="afternoon">Afternoons</option>
            </NativeSelect>
          )}
        </SettingRow>
      </SettingsGroup>

      <SettingsGroup title="Breaks" description="Time the planner never schedules into.">
        {planning.breaks.length === 0 ? (
          <p className="py-[var(--row-y)] text-sm text-muted-foreground">No breaks yet.</p>
        ) : null}
        {planning.breaks.map((brk) => (
          <div key={brk.id} className="flex flex-wrap items-start gap-3 py-[var(--row-y)]">
            <Input
              aria-label="Break name"
              defaultValue={brk.label}
              maxLength={40}
              onBlur={(e) =>
                update("planning", {
                  breaks: planning.breaks.map((b) =>
                    b.id === brk.id ? { ...b, label: e.target.value.trim() } : b,
                  ),
                })
              }
              className="h-10 w-44 rounded-xl border-input bg-card"
            />
            <TimeRange
              idPrefix={`break-${brk.id}`}
              start={brk.start}
              end={brk.end}
              onCommit={(start, end) =>
                update("planning", {
                  breaks: planning.breaks.map((b) => (b.id === brk.id ? { ...b, start, end } : b)),
                })
              }
            />
            <Button
              variant="ghost"
              size="icon-lg"
              aria-label={`Remove ${brk.label || "break"}`}
              onClick={() =>
                update("planning", { breaks: planning.breaks.filter((b) => b.id !== brk.id) })
              }
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </div>
        ))}
        <div className="py-[var(--row-y)]">
          <Button
            variant="outline"
            size="lg"
            disabled={planning.breaks.length >= 8}
            onClick={() =>
              update("planning", {
                breaks: [
                  ...planning.breaks,
                  { id: crypto.randomUUID(), label: "Break", start: "15:00", end: "15:15" },
                ],
              })
            }
          >
            <Plus aria-hidden="true" /> Add break
          </Button>
        </div>
      </SettingsGroup>

      <SettingsGroup title="Focus time">
        <ToggleRow
          label="Keep focus time"
          description="Reserve an uninterrupted block each working day."
          checked={planning.focusTime.enabled}
          onChange={(enabled) => update("planning", { focusTime: { ...planning.focusTime, enabled } })}
        />
        {planning.focusTime.enabled ? (
          <SettingRow label="Focus block length" hint={<Term id="focus-time" />}>
            {(id) => (
              <NumberField
                id={id}
                value={planning.focusTime.minutes}
                min={30}
                max={240}
                step={15}
                unit="minutes"
                onChange={(minutes) =>
                  update("planning", { focusTime: { ...planning.focusTime, minutes } })
                }
              />
            )}
          </SettingRow>
        ) : null}
      </SettingsGroup>
    </div>
  );
}
