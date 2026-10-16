"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { AccentPicker, BackgroundPicker } from "@/components/settings/appearance";
import { SegmentedControl, SettingsGroup, SettingRow } from "@/components/settings/controls";
import { Button } from "@/components/ui/button";
import { usePrefsStore } from "@/prefs/store";
import type { ThemePref } from "@/prefs/apply";

export function AppearancePane() {
  const appearance = usePrefsStore((s) => s.prefs.appearance);
  const update = usePrefsStore((s) => s.update);
  const reset = usePrefsStore((s) => s.reset);

  return (
    <div className="space-y-5">
      <SettingsGroup>
        <SettingRow label="Theme" description="Choose how Weekflow looks. System follows your device." stacked>
          <SegmentedControl<ThemePref>
            label="Theme"
            value={appearance.theme}
            onChange={(theme) => update("appearance", { theme })}
            options={[
              { value: "light", label: "Light", icon: <Sun className="size-4" aria-hidden="true" /> },
              { value: "dark", label: "Dark", icon: <Moon className="size-4" aria-hidden="true" /> },
              { value: "system", label: "System", icon: <Monitor className="size-4" aria-hidden="true" /> },
            ]}
          />
        </SettingRow>

        <SettingRow label="Background" description="The scenery around your workspace. Content always stays readable." stacked>
          <BackgroundPicker
            value={appearance.background}
            accent={appearance.accent}
            onChange={(background) => update("appearance", { background })}
          />
        </SettingRow>

        <SettingRow label="Color theme" description="Accent used for buttons, highlights and the active page." stacked>
          <div className="space-y-3">
            <AccentPicker value={appearance.accent} onChange={(accent) => update("appearance", { accent })} />
            <p className="text-xs text-muted-foreground">Choose from 15 colors (light to dark)</p>
          </div>
        </SettingRow>

        <SettingRow
          label="Surfaces"
          description="Let the background show through softly blurred panels. Weekflow keeps a minimum opacity so text always stays readable, so some combinations stay solid."
          stacked
        >
          <SegmentedControl
            label="Surfaces"
            value={appearance.glass}
            onChange={(glass) => update("appearance", { glass })}
            options={[
              { value: "off", label: "Solid" },
              { value: "subtle", label: "Soft glass" },
              { value: "frosted", label: "Frosted glass" },
            ]}
          />
        </SettingRow>

        <SettingRow label="Sidebar color" description="Choose the navigation color independently of your background. Accent follows your selected color; Match theme follows Light or Dark." stacked>
          <SegmentedControl
            label="Sidebar color"
            value={appearance.sidebar}
            onChange={(sidebar) => update("appearance", { sidebar })}
            options={[
              { value: "navy", label: "Navy" },
              { value: "light", label: "Light" },
              { value: "accent", label: "Accent" },
              { value: "theme", label: "Match theme" },
            ]}
          />
        </SettingRow>
        <SettingRow label="Density" description="Compact fits more on screen." stacked>
          <SegmentedControl
            label="Density"
            value={appearance.density}
            onChange={(density) => update("appearance", { density })}
            options={[
              { value: "comfortable", label: "Comfortable" },
              { value: "compact", label: "Compact" },
            ]}
          />
        </SettingRow>
      </SettingsGroup>

      <div className="flex justify-end">
        <Button
          variant="outline"
          size="lg"
          onClick={() => {
            reset("appearance");
            toast.success("Appearance reset to defaults");
          }}
        >
          Reset appearance
        </Button>
      </div>
    </div>
  );
}
