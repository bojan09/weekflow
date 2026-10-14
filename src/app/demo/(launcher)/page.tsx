import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, CalendarRange, FlaskConical, ListChecks, Palette, Users, Wand2 } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ScenarioPicker } from "@/components/settings/scenario-picker";
import { buttonVariants } from "@/components/ui/button";
import { APP_VERSION } from "@/generated/version";
import { ROADMAP } from "@/lib/roadmap";
import { appPath } from "@/lib/routes";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Demo" };

const TRY_FIRST = [
  {
    icon: CalendarRange,
    title: "Plan your week",
    text: "Drag tasks, pull a block's bottom edge to resize it, and lock what must not move.",
    href: appPath("week"),
  },
  {
    icon: ListChecks,
    title: "Capture tasks fast",
    text: 'Type "Write report 1h30 !high due fri" in the quick-add box and press Enter.',
    href: appPath("tasks"),
  },
  {
    icon: Palette,
    title: "Make it yours",
    text: "Switch theme, pick one of 15 accent colors and one of 12 backgrounds.",
    href: appPath("settings", "appearance"),
  },
  {
    icon: Wand2,
    title: "Let the planner plan",
    text: "Press P for Plan my week: a preview with a reason for every placement, and nothing changes until you apply it.",
    href: appPath("week"),
  },
  {
    icon: Users,
    title: "Try a team workspace",
    text: "A preview on sample data. Switch between roles to see what each can do.",
    href: appPath("team"),
  },
  {
    icon: BookOpen,
    title: "Read the guide",
    text: "Every part of Weekflow explained, with a Start here checklist on Home.",
    href: appPath("guide"),
  },
] as const;

export default function DemoLauncher() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-4xl flex-col p-3 sm:p-5">
      <div className="flex-1 surface-panel rounded-3xl p-6 shadow-soft sm:p-10">
        <header className="flex items-center justify-between">
          <Link href="/" aria-label="Weekflow home" className="flex min-h-11 items-center">
            <Logo markClassName="size-8" />
          </Link>
          <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary-soft-text">
            Version {APP_VERSION}
          </span>
        </header>

        <main className="mt-10">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Weekflow demo</h1>
          <p className="mt-3 max-w-xl text-muted-foreground">
            Explore Weekflow as a user would. Everything runs in your browser with sample data, and
            nothing leaves your device.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={appPath("home")} className={cn(buttonVariants({ size: "lg" }), "min-h-11")}>
              Open the app <ArrowRight aria-hidden="true" />
            </Link>
          </div>

          <section aria-labelledby="try-first" className="mt-12">
            <h2 id="try-first" className="text-lg font-semibold">
              What you can try in this version
            </h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {TRY_FIRST.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.title}>
                    <Link
                      href={item.href}
                      className="flex h-full gap-4 rounded-2xl border bg-card p-4 transition-shadow hover:shadow-soft"
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-text">
                        <Icon className="size-5" aria-hidden="true" />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold">{item.title}</span>
                        <span className="mt-0.5 block text-sm text-muted-foreground">{item.text}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>

          <section aria-labelledby="scenarios" className="mt-10">
            <h2 id="scenarios" className="text-lg font-semibold">
              Start from a scenario
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Load a ready-made week, then open the app to see it.
            </p>
            <div className="mt-4">
              <ScenarioPicker />
            </div>
          </section>

          <section aria-labelledby="states" className="mt-10 rounded-2xl border border-info-border bg-info-soft p-5 text-info-text">
            <h2 id="states" className="flex items-center gap-2 text-base font-semibold">
              <FlaskConical className="size-4" aria-hidden="true" /> Preview every screen state
            </h2>
            <p className="mt-1 text-sm">
              Inside the app, use the floating <strong>Demo states</strong> button to force loading,
              error, offline and permission-denied screens, so you can review each one.
            </p>
          </section>

          <section aria-labelledby="next" className="mt-10">
            <h2 id="next" className="text-lg font-semibold">
              Coming next
            </h2>
            <ol className="mt-4 divide-y rounded-2xl border bg-card">
              {ROADMAP.map((entry) => (
                <li key={entry.version} className="flex gap-4 px-4 py-3">
                  <span className="w-12 shrink-0 text-sm font-semibold tabular-nums">{entry.version}</span>
                  <span className="text-sm">
                    <span className="font-medium">{entry.title}</span>
                    <span className="block text-muted-foreground">{entry.summary}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </main>
      </div>
    </div>
  );
}
