"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { AccentPicker, BackgroundPicker } from "@/components/settings/appearance";
import { SegmentedControl } from "@/components/settings/controls";
import type { ThemePref } from "@/prefs/apply";
import { usePrefsStore } from "@/prefs/store";

/** The real appearance controls, live on the page. Choices are saved like in Settings. */
export function Customize() {
  const appearance = usePrefsStore((s) => s.prefs.appearance);
  const update = usePrefsStore((s) => s.update);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <div className="space-y-6">
        <div>
          <h3 className="mb-2 text-sm font-semibold">Theme</h3>
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
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold">Color</h3>
          <AccentPicker value={appearance.accent} onChange={(accent) => update("appearance", { accent })} />
          <p className="mt-2 text-xs text-muted-foreground">15 colors, light to dark</p>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold">Surfaces</h3>
          <SegmentedControl
            label="Surfaces"
            value={appearance.glass}
            onChange={(glass) => update("appearance", { glass })}
            options={[
              { value: "off", label: "Solid" },
              { value: "subtle", label: "Soft glass" },
              { value: "frosted", label: "Frosted" },
            ]}
          />
        </div>
      </div>
      <div>
        <h3 className="mb-2 text-sm font-semibold">Background</h3>
        <BackgroundPicker
          value={appearance.background}
          accent={appearance.accent}
          onChange={(background) => update("appearance", { background })}
        />
      </div>
    </div>
  );
}
