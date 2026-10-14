"use client";

import {
  NativeSelect,
  SegmentedControl,
  SettingRow,
  SettingsGroup,
} from "@/components/settings/controls";
import { formatClock, orderedWeekdays } from "@/lib/time";
import { usePrefsStore } from "@/prefs/store";

export function CalendarPane() {
  const calendar = usePrefsStore((s) => s.prefs.calendar);
  const update = usePrefsStore((s) => s.update);

  return (
    <div className="space-y-5">
      <SettingsGroup>
        <SettingRow label="Default view" description="What My Week opens to." stacked>
          <SegmentedControl
            label="Default view"
            value={calendar.defaultView}
            onChange={(defaultView) => update("calendar", { defaultView })}
            options={[
              { value: "day", label: "Day" },
              { value: "week", label: "Week" },
              { value: "agenda", label: "Agenda" },
            ]}
          />
        </SettingRow>
        <SettingRow label="Week starts on" description="Preview:">
          {(id) => (
            <div className="space-y-2">
              <NativeSelect
                id={id}
                value={calendar.weekStart}
                onChange={(e) =>
                  update("calendar", { weekStart: e.target.value as typeof calendar.weekStart })
                }
              >
                <option value="monday">Monday</option>
                <option value="sunday">Sunday</option>
                <option value="saturday">Saturday</option>
              </NativeSelect>
              <p className="text-xs text-muted-foreground">
                {orderedWeekdays(calendar.weekStart)
                  .map((d) => d.short)
                  .join(" · ")}
              </p>
            </div>
          )}
        </SettingRow>
        <SettingRow label="Time format" stacked>
          <div className="space-y-2">
            <SegmentedControl
              label="Time format"
              value={calendar.timeFormat}
              onChange={(timeFormat) => update("calendar", { timeFormat })}
              options={[
                { value: "24h", label: "24-hour" },
                { value: "12h", label: "12-hour" },
              ]}
            />
            <p className="text-xs text-muted-foreground">
              Example: {formatClock(9, 0, calendar.timeFormat)} to {formatClock(17, 30, calendar.timeFormat)}
            </p>
          </div>
        </SettingRow>
      </SettingsGroup>
    </div>
  );
}
