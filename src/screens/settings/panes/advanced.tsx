"use client";

import { toast } from "sonner";
import { usePathname } from "next/navigation";
import { ConfirmDialog } from "@/components/settings/confirm-dialog";
import { SettingRow, SettingsGroup, ToggleRow } from "@/components/settings/controls";
import { ScenarioPicker } from "@/components/settings/scenario-picker";
import { usePrefsStore } from "@/prefs/store";

export function AdvancedPane() {
  const account = usePathname().startsWith("/app/");
  const showSimulator = usePrefsStore((s) => s.prefs.advanced.showStateSimulator);
  const update = usePrefsStore((s) => s.update);
  const reset = usePrefsStore((s) => s.reset);

  return (
    <div className="space-y-5">
      {!account ? <><SettingsGroup title="Demo tools">
        <ToggleRow
          label="Show the demo states control"
          description="The floating button that previews loading, error, offline and permission-denied screens."
          checked={showSimulator}
          onChange={(showStateSimulator) => update("advanced", { showStateSimulator })}
        />
      </SettingsGroup>
      <section aria-labelledby="scenarios-title" className="space-y-3">
        <div>
          <h3 id="scenarios-title" className="text-sm font-semibold">
            Demo scenarios
          </h3>
          <p className="text-sm text-muted-foreground">
            Replace your demo tasks with a ready-made week to see Weekflow in that situation.
          </p>
        </div>
        <ScenarioPicker />
      </section></> : null}
      <SettingsGroup title="Reset">
        <SettingRow
          label="Reset all settings"
          description="Returns every setting, including appearance, to its default. Demo data is kept."
        >
          <ConfirmDialog
            destructive
            triggerLabel="Reset all settings"
            title="Reset all settings?"
            description="Appearance, planning, engine and every other preference return to their defaults."
            confirmLabel="Reset everything"
            onConfirm={() => {
              reset();
              toast.success("All settings reset");
            }}
          />
        </SettingRow>
      </SettingsGroup>
    </div>
  );
}
