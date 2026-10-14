"use client";

import {
  NativeSelect,
  Notice,
  SettingRow,
  SettingsGroup,
  ToggleRow,
} from "@/components/settings/controls";
import { WEEKDAYS } from "@/lib/time";
import { usePrefsStore } from "@/prefs/store";

const LEAD_TIMES = [0, 5, 10, 15, 30, 60] as const;

export function NotificationsPane() {
  const notifications = usePrefsStore((s) => s.prefs.notifications);
  const update = usePrefsStore((s) => s.update);

  return (
    <div className="space-y-5">
      <Notice>
        Reminders appear inside Weekflow while it is open, shortly before a timed task starts. Browser
        and email notifications are not requested. The weekly review card shows on Home on the day you choose.
      </Notice>
      <SettingsGroup title="Task reminders">
        <ToggleRow
          label="Remind me before tasks start"
          checked={notifications.reminders}
          onChange={(reminders) => update("notifications", { reminders })}
        />
        {notifications.reminders ? (
          <SettingRow label="Reminder lead time">
            {(id) => (
              <NativeSelect
                id={id}
                value={notifications.reminderLeadMin}
                onChange={(e) => update("notifications", { reminderLeadMin: Number(e.target.value) })}
              >
                {LEAD_TIMES.map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {minutes === 0 ? "When it starts" : `${minutes} minutes before`}
                  </option>
                ))}
              </NativeSelect>
            )}
          </SettingRow>
        ) : null}
      </SettingsGroup>
      <SettingsGroup title="Weekly review" description="On the review day, a card on Home links to your weekly review.">
        <ToggleRow
          label="Offer a weekly planning review"
          checked={notifications.weeklyReview}
          onChange={(weeklyReview) => update("notifications", { weeklyReview })}
        />
        {notifications.weeklyReview ? (
          <SettingRow label="Review day">
            {(id) => (
              <NativeSelect
                id={id}
                value={notifications.weeklyReviewDay}
                onChange={(e) => update("notifications", { weeklyReviewDay: Number(e.target.value) })}
              >
                {WEEKDAYS.map((day) => (
                  <option key={day.index} value={day.index}>
                    {day.long}
                  </option>
                ))}
              </NativeSelect>
            )}
          </SettingRow>
        ) : null}
      </SettingsGroup>
    </div>
  );
}
