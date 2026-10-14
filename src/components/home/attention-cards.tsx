"use client";

import Link from "next/link";
import { ChartColumn, Clock } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import type { Now } from "@/hooks/use-now";
import { weekdayOf } from "@/lib/dates";
import { appPath } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { usePrefsStore } from "@/prefs/store";
import { useUiStore } from "@/stores/ui";

/**
 * Offered when "Suggest a plan and ask me first" is chosen and some tasks ran
 * past their time. Nothing moves until the user opens the preview and applies it.
 */
export function MissedBanner({ count }: { count: number }) {
  const behavior = usePrefsStore((s) => s.prefs.engine.autoReschedule);
  const openPlan = useUiStore((s) => s.openPlan);
  if (behavior !== "ask" || count === 0) return null;
  return (
    <section aria-label="Missed tasks" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warning-border bg-warning-soft px-4 py-3">
      <p className="flex items-center gap-2 text-sm font-medium text-warning-text">
        <Clock className="size-4 shrink-0" aria-hidden="true" />
        {count} {count === 1 ? "task" : "tasks"} ran past {count === 1 ? "its" : "their"} time without being done.
      </p>
      <Button size="sm" onClick={() => openPlan({ missed: true })}>
        Preview a new plan
      </Button>
    </section>
  );
}

/** On the chosen weekday, when the weekly review reminder is on, point at the review. */
export function ReviewPrompt({ now }: { now: Now }) {
  const { weeklyReview, weeklyReviewDay } = usePrefsStore((s) => s.prefs.notifications);
  if (!weeklyReview || weekdayOf(now.date) !== weeklyReviewDay) return null;
  return (
    <section aria-label="Weekly review" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-info-border bg-info-soft px-4 py-3">
      <p className="flex items-center gap-2 text-sm font-medium text-info-text">
        <ChartColumn className="size-4 shrink-0" aria-hidden="true" />
        Your weekly review is ready.
      </p>
      <Link href={appPath("review")} className={cn(buttonVariants({ size: "sm" }))}>
        Open the review
      </Link>
    </section>
  );
}
