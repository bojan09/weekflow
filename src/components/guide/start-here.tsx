"use client";

import Link from "next/link";
import { BookOpen, Circle, CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SECTIONS } from "@/guide/content";
import { STEPS } from "@/guide/progress";
import { useGuideStore } from "@/guide/store";
import { termById, type TermId } from "@/guide/terms";
import { appPath } from "@/lib/routes";
import { Term } from "./term";

const MAP_IDS = ["home", "week", "tasks", "calendar", "review", "settings"] as const;
const LEARN: readonly TermId[] = ["inbox", "lock", "buffer", "strict-deadline", "stability"];

/**
 * First-run help on Home: a map of the app, a checklist that ticks off as you
 * really do things, and the words people trip on. Collapses when finished.
 */
export function StartHere() {
  const { hydrated, done, panelHidden, hidePanel } = useGuideStore();
  if (!hydrated) return null;

  const count = STEPS.filter((s) => done[s.id]).length;
  const finished = count === STEPS.length;

  if (panelHidden || finished) {
    return (
      <p className="text-sm text-muted-foreground">
        {finished ? "You have done the basics. " : ""}
        <Link href={appPath("guide")} className="inline-flex min-h-11 items-center font-medium text-primary-text hover:underline">
          <BookOpen className="mr-1.5 size-4" aria-hidden="true" /> Open the Guide
        </Link>
      </p>
    );
  }

  return (
    <section aria-labelledby="start-title" className="rounded-2xl border border-primary-border bg-primary-soft/50 p-4 shadow-soft md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="start-title" className="text-base font-semibold">
            Start here
          </h2>
          <p className="text-sm text-muted-foreground">Three minutes to see how everything fits.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-card px-3 py-1 text-xs font-medium tabular-nums">
            {count} of {STEPS.length} done
          </span>
          <Button variant="ghost" size="sm" onClick={hidePanel}>
            Hide
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <section aria-labelledby="start-map" className="rounded-xl bg-card p-4">
          <h3 id="start-map" className="text-sm font-semibold">
            Map
          </h3>
          <ul className="mt-2 space-y-1.5 text-sm">
            {MAP_IDS.map((id) => {
              const section = SECTIONS.find((s) => s.id === id);
              return section?.route ? (
                <li key={id}>
                  <Link href={appPath(section.route)} className="font-medium hover:underline">
                    {section.title}
                  </Link>
                  <span className="text-muted-foreground">: {section.summary}</span>
                </li>
              ) : null;
            })}
          </ul>
          <Link
            href={`${appPath("guide")}#overview`}
            className="mt-2 inline-flex min-h-11 items-center text-sm font-medium text-primary-text hover:underline"
          >
            Read the big picture
          </Link>
        </section>

        <section aria-labelledby="start-do" className="rounded-xl bg-card p-4">
          <h3 id="start-do" className="text-sm font-semibold">
            Do
          </h3>
          <ol className="mt-2 space-y-1.5 text-sm">
            {STEPS.map((step) => {
              const complete = Boolean(done[step.id]);
              return (
                <li key={step.id} className="flex items-start gap-2">
                  {complete ? (
                    <CircleCheck className="mt-0.5 size-4 shrink-0 text-success-text" aria-hidden="true" />
                  ) : (
                    <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  )}
                  <span className="min-w-0">
                    <span className={complete ? "text-muted-foreground line-through" : "font-medium"}>
                      <span className="sr-only">{complete ? `Done: ${step.label}` : `To do: ${step.label}`}</span>
                      <span aria-hidden="true">{step.label}</span>
                    </span>
                    {complete ? null : (
                      <>
                        {" "}
                        <Link href={appPath(step.to.route, step.to.sub)} className="text-primary-text hover:underline">
                          Show me
                        </Link>
                      </>
                    )}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>

        <section aria-labelledby="start-learn" className="rounded-xl bg-card p-4">
          <h3 id="start-learn" className="text-sm font-semibold">
            Learn
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">Tap the (i) for a plain explanation.</p>
          <ul className="mt-2 space-y-1 text-sm">
            {LEARN.map((id) => (
              <li key={id} className="flex items-center gap-1">
                {termById(id).word}
                <Term id={id} />
              </li>
            ))}
          </ul>
          <Link
            href={`${appPath("guide")}#glossary`}
            className="mt-2 inline-flex min-h-11 items-center text-sm font-medium text-primary-text hover:underline"
          >
            All the words
          </Link>
        </section>
      </div>
    </section>
  );
}
