"use client";

import { Download } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/settings/confirm-dialog";
import { Notice, SettingRow, SettingsGroup } from "@/components/settings/controls";
import { Button } from "@/components/ui/button";
import { exportDemoData, resetDemoData } from "@/data/demo";
import { APP_VERSION } from "@/generated/version";
import { usePrefsStore } from "@/prefs/store";

function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function PrivacyPane() {
  const prefs = usePrefsStore((s) => s.prefs);

  return (
    <div className="space-y-5">
      <Notice>
        In the demo, everything you enter is stored only in this browser. Nothing is sent to a
        server and there is no tracking.
      </Notice>
      <SettingsGroup title="Your data">
        <SettingRow label="Export my data" description="Download your settings and demo data as a JSON file.">
          <Button
            variant="outline"
            size="lg"
            onClick={() => {
              downloadJson("weekflow-export.json", {
                app: "weekflow",
                version: APP_VERSION,
                exportedAt: new Date().toISOString(),
                prefs,
                ...exportDemoData(),
              });
              toast.success("Export downloaded");
            }}
          >
            <Download aria-hidden="true" /> Export
          </Button>
        </SettingRow>
        <SettingRow label="Reset demo data" description="Restores the demo profile. Your settings are kept.">
          <ConfirmDialog
            destructive
            triggerLabel="Reset demo data"
            title="Reset demo data?"
            description="The demo profile returns to its starting values. This cannot be undone."
            confirmLabel="Reset"
            onConfirm={() => {
              resetDemoData();
              toast.success("Demo data reset");
            }}
          />
        </SettingRow>
      </SettingsGroup>
      <SettingsGroup title="Account security">
        <p className="py-[var(--row-y)] text-sm text-muted-foreground">
          Sign-in, password changes, sign-out and account deletion arrive with accounts in version
          0.1.0. Until then there is no account to secure.
        </p>
      </SettingsGroup>
    </div>
  );
}
