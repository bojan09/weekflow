import Link from "next/link";
import { Lock, Ruler, Sparkles, Users, Workflow, type LucideIcon } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { LandingPreview } from "@/components/landing/landing-preview";
import { buttonVariants } from "@/components/ui/button";
import { APP_VERSION } from "@/generated/version";
import { DEMO_BASE, appPath } from "@/lib/routes";
import { cn } from "@/lib/utils";

const FEATURES: Array<{ icon: LucideIcon; title: string; detail?: string; tone: string }> = [
  { icon: Workflow, title: "Deterministic scheduling engine", detail: "Not just a task list", tone: "bg-primary-soft text-primary-soft-text" },
  { icon: Ruler, title: "Set your own rules", tone: "bg-success-soft text-success-text" },
  { icon: Lock, title: "Lock tasks in place", tone: "bg-warning-soft text-warning-text" },
  { icon: Sparkles, title: "Smart planning tools", tone: "bg-info-soft text-info-text" },
  { icon: Users, title: "Team workspace", tone: "bg-danger-soft text-danger-text" },
];

export default function LandingPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl flex-col p-3 sm:p-5">
      <div className="flex flex-1 flex-col rounded-3xl bg-background p-6 shadow-soft sm:p-10">
        <header className="flex items-center justify-between">
          <Logo markClassName="size-9" wordmarkClassName="text-xl" />
          <Link href={DEMO_BASE} className={cn(buttonVariants({ size: "lg" }))}>
            Open the demo
          </Link>
        </header>

        <main className="mt-10 grid flex-1 items-center gap-10 lg:mt-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Plan smarter. Work better.
            </h1>
            <p className="mt-5 max-w-md text-base text-muted-foreground">
              A flexible weekly planner that automatically rearranges tasks based on deadlines,
              priority, available time, and your rules.
            </p>

            <ul className="mt-8 space-y-4">
              {FEATURES.map((feature) => {
                const Icon = feature.icon;
                return (
                  <li key={feature.title} className="flex items-center gap-4">
                    <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-2xl", feature.tone)}>
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <span className="text-sm font-medium">
                      {feature.title}
                      {feature.detail ? (
                        <span className="block font-normal text-muted-foreground">({feature.detail})</span>
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ul>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary-border px-4 py-1.5 text-sm font-medium text-primary-text">
                Free <span aria-hidden="true">·</span> No Monetization
              </span>
              <Link
                href={appPath("changelog")}
                className="text-sm font-medium text-primary-text underline-offset-4 hover:underline"
              >
                Version history
              </Link>
            </div>
          </div>

          <LandingPreview />
        </main>

        <footer className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t pt-5 text-xs text-muted-foreground">
          <p>
            Weekflow {APP_VERSION} <span aria-hidden="true">·</span> Next.js <span aria-hidden="true">·</span>{" "}
            Appwrite <span aria-hidden="true">·</span> Tailwind CSS <span aria-hidden="true">·</span> shadcn/ui{" "}
            <span aria-hidden="true">·</span> Zustand
          </p>
          <p className="font-medium text-foreground">Your time. Your rules.</p>
        </footer>
      </div>
    </div>
  );
}
