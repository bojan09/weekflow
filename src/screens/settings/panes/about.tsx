import Link from "next/link";
import { History } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { SettingRow, SettingsGroup } from "@/components/settings/controls";
import { buttonVariants } from "@/components/ui/button";
import { APP_VERSION, BUILD_DATE } from "@/generated/version";
import { appPath } from "@/lib/routes";
import { cn } from "@/lib/utils";

export function AboutPane() {
  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-soft sm:flex-row sm:items-center">
        <Logo markClassName="size-12" wordmarkClassName="text-2xl" />
        <div>
          <p className="font-medium">Plan smarter. Work better.</p>
          <p className="text-sm text-muted-foreground">Your time. Your rules.</p>
        </div>
      </section>
      <SettingsGroup>
        <SettingRow label="Version">
          <span className="text-sm tabular-nums">{APP_VERSION}</span>
        </SettingRow>
        <SettingRow label="Build date">
          <span className="text-sm tabular-nums">{BUILD_DATE}</span>
        </SettingRow>
        <SettingRow label="Pricing" description="No subscriptions, paid tiers, feature gates or limits. Team features are free too.">
          <span className="rounded-full bg-success-soft px-3 py-1 text-sm font-medium text-success-text">
            Free forever
          </span>
        </SettingRow>
        <SettingRow label="Changelog" description="Every released version and what changed.">
          <Link
            href={appPath("changelog")}
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "min-h-11")}
          >
            <History aria-hidden="true" /> Version history
          </Link>
        </SettingRow>
      </SettingsGroup>
    </div>
  );
}
