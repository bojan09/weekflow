"use client";

import { SegmentedControl, SettingRow, SettingsGroup } from "@/components/settings/controls";
import { Button } from "@/components/ui/button";
import { usePrefsStore } from "@/prefs/store";
import { useUiStore } from "@/stores/ui";

export function AccessibilityPane() {
  const accessibility = usePrefsStore((s) => s.prefs.accessibility);
  const update = usePrefsStore((s) => s.update);
  const setShortcutsOpen = useUiStore((s) => s.setShortcutsOpen);

  return (
    <div className="space-y-5">
      <SettingsGroup>
        <SettingRow
          label="Motion"
          description="Follow your device setting, or force animations off or on."
          stacked
        >
          <SegmentedControl
            label="Motion"
            value={accessibility.motion}
            onChange={(motion) => update("accessibility", { motion })}
            options={[
              { value: "system", label: "Follow system" },
              { value: "reduce", label: "Reduce motion" },
              { value: "full", label: "Allow motion" },
            ]}
          />
        </SettingRow>
        <SettingRow label="Text size" description="Scales every piece of text in the app." stacked>
          <SegmentedControl
            label="Text size"
            value={String(accessibility.textScale)}
            onChange={(value) =>
              update("accessibility", { textScale: Number(value) as typeof accessibility.textScale })
            }
            options={[
              { value: "100", label: "Default" },
              { value: "110", label: "Large" },
              { value: "125", label: "Larger" },
            ]}
          />
        </SettingRow>
        <SettingRow label="Keyboard shortcuts" description="Everything in Weekflow works from the keyboard.">
          <Button variant="outline" size="lg" onClick={() => setShortcutsOpen(true)}>
            View shortcuts
          </Button>
        </SettingRow>
      </SettingsGroup>
    </div>
  );
}
