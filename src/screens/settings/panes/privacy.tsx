"use client";

import { Download } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConfirmDialog } from "@/components/settings/confirm-dialog";
import { Notice, SettingRow, SettingsGroup } from "@/components/settings/controls";
import { Button } from "@/components/ui/button";
import { exportDemoData, resetDemoData } from "@/data/demo";
import { accountSync } from "@/data/account-client";
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
  const account = usePathname().startsWith("/app/");
  const prefs = usePrefsStore((s) => s.prefs);

  return (
    <div className="space-y-5">
      <Notice>
        {account ? "Your personal planner is saved privately to your account. Team members cannot read your personal tasks, settings or schedule history." : "In the demo, everything you enter is stored only in this browser. Nothing is sent to a server and there is no tracking."}
      </Notice>
      <SettingsGroup title="Your data">
        <SettingRow label="Export my data" description={account ? "Download your personal planner, preferences and schedule history as a JSON file." : "Download your settings and demo data as a JSON file."}>
          <Button
            variant="outline"
            size="lg"
            onClick={() => {
              downloadJson("weekflow-export.json", {
                app: "weekflow",
                version: APP_VERSION,
                exportedAt: new Date().toISOString(),
                prefs,
                ...(account ? { resources: accountSync.getSnapshot().snapshot } : exportDemoData()),
              });
              toast.success("Export downloaded");
            }}
          >
            <Download aria-hidden="true" /> Export
          </Button>
        </SettingRow>
        {!account ? <SettingRow label="Reset demo data" description="Restores the demo profile. Your settings are kept.">
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
        </SettingRow> : null}
      </SettingsGroup>
      <SettingsGroup title="Account security">
        <p className="py-[var(--row-y)] text-sm text-muted-foreground">
          {account ? <Link href="/app/profile#account-security-title" className="text-primary-text underline">Manage verification, password, sessions and account deletion in Profile.</Link> : "The demo has no account to secure. Sign in to manage your password, sessions and account deletion."}
        </p>
      </SettingsGroup>
    </div>
  );
}
