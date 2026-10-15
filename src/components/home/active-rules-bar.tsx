"use client";

import Link from "next/link";
import {
  CalendarCheck,
  Clock,
  Flag,
  Gauge,
  Hourglass,
  Lock,
  Settings2,
  Target,
  type LucideIcon,
} from "lucide-react";
import { Term } from "@/components/guide/term";
import { buttonVariants } from "@/components/ui/button";
import { activeRules, type RuleIcon } from "@/domain/rules";
import { useAppPath } from "@/hooks/use-app-path";
import { cn } from "@/lib/utils";
import { usePrefsStore } from "@/prefs/store";

const ICONS: Record<RuleIcon, LucideIcon> = {
  priority: Flag,
  deadline: CalendarCheck,
  hours: Clock,
  workload: Gauge,
  focus: Target,
  buffer: Hourglass,
  locked: Lock,
};

/** The rules you actually have on, with a shortcut to change them. */
export function ActiveRulesBar() {
  const appPath = useAppPath();
  const prefs = usePrefsStore((s) => s.prefs);
  const rules = activeRules(prefs);
  return (
    <section
      aria-labelledby="rules-title"
      className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border bg-card px-4 py-3 shadow-soft"
    >
      <h2 id="rules-title" className="flex items-center gap-1 text-sm font-semibold">
        Active Rules <Term id="engine" />
      </h2>
      <ul className="flex flex-1 flex-wrap items-center gap-2">
        {rules.map((rule) => {
          const Icon = ICONS[rule.icon];
          return (
            <li
              key={rule.id}
              className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1 text-xs text-foreground"
            >
              <Icon className="size-3.5 text-primary-text" aria-hidden="true" />
              {rule.label}
            </li>
          );
        })}
      </ul>
      <Link
        href={appPath("settings", "engine")}
        className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-9 ml-auto")}
      >
        <Settings2 aria-hidden="true" /> Manage Rules
      </Link>
    </section>
  );
}
