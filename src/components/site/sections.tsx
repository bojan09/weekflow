import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  BarChart3,
  Check,
  ListPlus,
  Lock,
  Palette,
  SlidersHorizontal,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { RELEASES } from "@/generated/version";
import { ROADMAP } from "@/lib/roadmap";
import { appPath } from "@/lib/routes";
import { SITE_CTA } from "@/lib/site";
import { cn } from "@/lib/utils";

/** A rounded panel; gaps between panels let the chosen background show. */
export function Panel({
  id,
  title,
  intro,
  children,
  className,
}: {
  id?: string;
  title: string;
  intro?: string;
  children: ReactNode;
  className?: string;
}) {
  const headingId = id ? `${id}-title` : undefined;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn("surface-panel scroll-mt-20 rounded-3xl border p-4 shadow-soft sm:scroll-mt-24 sm:p-10", className)}
    >
      <h2 id={headingId} className="text-2xl font-semibold tracking-tight text-balance sm:text-4xl">
        {title}
      </h2>
      {intro ? <p className="mt-3 max-w-2xl text-base text-muted-foreground text-pretty">{intro}</p> : null}
      <div className="mt-5 sm:mt-8">{children}</div>
    </section>
  );
}

const STEPS: Array<{ title: string; text: string }> = [
  { title: "Capture", text: "Add a task in seconds. Type a length, a priority and a due date in one line." },
  { title: "Set your rules", text: "Working hours, breaks, buffers and workload limits. You decide how your week runs." },
  { title: "Plan with control", text: "Drag tasks into place, resize them, and lock anything that must not move." },
];

export function HowItWorks() {
  return (
    <Panel id="how" title="From to-do list to a plan you trust" intro="Three steps, and you stay in charge of every one.">
      <ol className="grid gap-4 md:grid-cols-3">
        {STEPS.map((step, i) => (
          <li key={step.title} className="rounded-2xl border bg-card p-5">
            <span className="flex size-9 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary-soft-text">
              {i + 1}
            </span>
            <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{step.text}</p>
          </li>
        ))}
      </ol>
    </Panel>
  );
}

interface Feature {
  icon: LucideIcon;
  title: string;
  text: string;
  available: boolean;
  tone: string;
}

const FEATURES: Feature[] = [
  { icon: ListPlus, title: "Fast capture and an inbox", text: "Quick-add, filters, checklists and dependencies. Nothing gets lost.", available: true, tone: "bg-primary-soft text-primary-soft-text" },
  { icon: Lock, title: "Lock tasks in place", text: "Pin a task to a time or a day. It stays put when everything else moves.", available: true, tone: "bg-warning-soft text-warning-text" },
  { icon: BarChart3, title: "Workload at a glance", text: "See planned hours against your daily limit, and spot overloaded days early.", available: true, tone: "bg-success-soft text-success-text" },
  { icon: Palette, title: "Make it yours", text: "Light and dark, 15 colors, 12 backgrounds and optional glass surfaces.", available: true, tone: "bg-info-soft text-info-text" },
  { icon: Workflow, title: "A planner that explains itself", text: "A deterministic engine: the same inputs give the same plan, with every decision explained.", available: true, tone: "bg-primary-soft text-primary-soft-text" },
  { icon: Users, title: "Free team workspaces", text: "Shared projects, tasks and comments, with personal time always kept private. Preview it in the demo; real sharing comes with accounts.", available: false, tone: "bg-danger-soft text-danger-text" },
];

export function Features() {
  return (
    <Panel id="features" title="Everything a week needs. Nothing it doesn't." intro="Built for people who want a calm, predictable plan, not another list.">
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => {
          const Icon = feature.icon;
          return (
            <li key={feature.title} className="flex flex-col rounded-2xl border bg-card p-5">
              <span className={cn("flex size-11 items-center justify-center rounded-xl", feature.tone)}>
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-base font-semibold">{feature.title}</h3>
              <p className="mt-1.5 flex-1 text-sm text-muted-foreground">{feature.text}</p>
              <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium">
                {feature.available ? (
                  <>
                    <Check className="size-3.5 text-success-text" aria-hidden="true" />
                    <span className="text-success-text">Available now</span>
                  </>
                ) : (
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-muted-foreground">Coming soon</span>
                )}
              </p>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

export function FreeBand() {
  return (
    <section
      aria-labelledby="free-title"
      className="surface-panel flex flex-col items-start gap-6 rounded-3xl border p-6 shadow-soft sm:flex-row sm:items-center sm:justify-between sm:p-10"
    >
      <div>
        <h2 id="free-title" className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Free. Forever.
        </h2>
        <p className="mt-2 max-w-xl text-muted-foreground">
          No subscriptions, no paid tiers, no feature gates and no artificial limits. Team features are free too.
        </p>
      </div>
      <Link href={SITE_CTA.href} className={cn(buttonVariants({ size: "lg" }), "h-12 shrink-0 rounded-full px-8 text-base")}>
        {SITE_CTA.label} <ArrowRight aria-hidden="true" />
      </Link>
    </section>
  );
}

export function Roadmap() {
  const shipped = RELEASES.slice(0, 2);
  return (
    <Panel id="roadmap" title="What's shipped, and what's next" intro="Weekflow is built in the open, one tested release at a time.">
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-3 text-sm font-semibold">Shipped</h3>
          <ul className="space-y-3">
            {shipped.map((release) => (
              <li key={release.version} className="rounded-2xl border bg-card p-4">
                <p className="text-sm font-semibold tabular-nums">
                  {release.version} <span className="font-medium text-muted-foreground">· {release.title}</span>
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{release.summary}</p>
              </li>
            ))}
          </ul>
          <Link href={appPath("changelog")} className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-primary-text hover:underline">
            Full version history
          </Link>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold">Coming next</h3>
          <ol className="space-y-3">
            {ROADMAP.slice(0, 4).map((entry) => (
              <li key={entry.version} className="rounded-2xl border bg-card p-4">
                <p className="text-sm font-semibold tabular-nums">
                  {entry.version} <span className="font-medium text-muted-foreground">· {entry.title}</span>
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{entry.summary}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Panel>
  );
}

const FAQ: Array<{ q: string; a: string }> = [
  { q: "Is Weekflow really free?", a: "Yes. There are no subscriptions, paid tiers or limits, and team features will be free as well." },
  { q: "Do I need an account to try it?", a: "No. The demo runs entirely in your browser on sample data, and its Guide explains every part. Accounts and sync arrive in a later release." },
  { q: "Where is my data kept?", a: "In the demo, only in your browser. Nothing is sent to a server and there is no tracking." },
  { q: "What is the scheduling engine?", a: "A deterministic planner: the same tasks and rules always give the same plan, and every decision is explained in plain language. Try it with Plan my week in the demo." },
  { q: "Can I plan with a team?", a: "Team workspaces are on the roadmap. Your personal tasks will always stay private, and team scheduling will never override your protected time." },
];

export function Faq() {
  return (
    <Panel id="faq" title="Questions, answered">
      <div className="divide-y rounded-2xl border bg-card">
        {FAQ.map((item) => (
          <details key={item.q} className="group px-5">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 text-base font-medium [&::-webkit-details-marker]:hidden">
              {item.q}
              <span aria-hidden="true" className="text-xl text-muted-foreground transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="pb-4 text-sm text-muted-foreground">{item.a}</p>
          </details>
        ))}
      </div>
    </Panel>
  );
}

export function FinalCta() {
  return (
    <section
      id="get-started"
      aria-labelledby="final-title"
      className="surface-panel rounded-3xl border px-6 py-14 text-center shadow-soft sm:py-20"
    >
      <h2 id="final-title" className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
        Your time. Your rules.
      </h2>
      <p className="mx-auto mt-4 max-w-lg text-muted-foreground">Try the whole app in your browser in a few seconds.</p>
      <Link href={SITE_CTA.href} className={cn(buttonVariants({ size: "lg" }), "mt-8 h-12 rounded-full px-8 text-base")}>
        {SITE_CTA.label} <ArrowRight aria-hidden="true" />
      </Link>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
        <SlidersHorizontal className="size-4" aria-hidden="true" /> Free forever. No credit card.
      </p>
    </section>
  );
}
