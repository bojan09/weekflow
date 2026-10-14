"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Hourglass } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { sectionForRoute } from "@/guide/content";
import { termById } from "@/guide/terms";
import { useMediaQuery } from "@/hooks/use-media-query";
import { appPath, routeOfPath } from "@/lib/routes";
import { useUiStore } from "@/stores/ui";
import { Term } from "./term";

/** The guide for the screen you are on: what it is, what to try, shortcuts and words. */
export function HelpPanel() {
  const open = useUiStore((s) => s.helpOpen);
  const setOpen = useUiStore((s) => s.setHelpOpen);
  const route = routeOfPath(usePathname()) ?? "guide";
  const section = sectionForRoute(route);
  const wide = useMediaQuery("(min-width: 640px)");

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side={wide ? "right" : "bottom"} className="max-h-[85dvh] overflow-y-auto p-5 sm:max-h-none">
        <SheetHeader className="p-0">
          <SheetTitle>About {section.title}</SheetTitle>
          <SheetDescription>{section.summary}</SheetDescription>
        </SheetHeader>

        {section.comingIn ? (
          <p className="flex items-start gap-2 rounded-xl bg-info-soft px-3 py-3 text-sm text-info-text">
            <Hourglass className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            Arrives in version {section.comingIn}. {section.whatItIs}
          </p>
        ) : (
          <>
            <p className="text-sm">{section.whatItIs}</p>
            {section.steps.length > 0 ? (
              <section aria-label="Try this first">
                <h3 className="text-sm font-semibold">Try this first</h3>
                <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm">
                  {section.steps.map((step) => (
                    <li key={step.text}>
                      {step.text}
                      {step.to ? (
                        <>
                          {" "}
                          <Link
                            href={appPath(step.to.route, step.to.sub)}
                            onClick={() => setOpen(false)}
                            className="font-medium text-primary-text underline underline-offset-2"
                          >
                            {step.to.label}
                          </Link>
                        </>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}
            {section.tips.length > 0 ? (
              <section aria-label="Good to know">
                <h3 className="text-sm font-semibold">Good to know</h3>
                <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                  {section.tips.map((tip) => (
                    <li key={tip}>{tip}</li>
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        )}

        {section.shortcuts.length > 0 ? (
          <section aria-label="Shortcuts on this page">
            <h3 className="text-sm font-semibold">Shortcuts</h3>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              {section.shortcuts.map((shortcut) => (
                <div key={shortcut.keys} className="contents">
                  <dt>
                    <kbd className="rounded-md border bg-muted px-1.5 py-0.5 font-mono text-xs">{shortcut.keys}</kbd>
                  </dt>
                  <dd className="text-muted-foreground">{shortcut.label}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        {section.terms.length > 0 ? (
          <section aria-label="Words used on this page">
            <h3 className="text-sm font-semibold">Words used here</h3>
            <ul className="mt-2 space-y-1 text-sm">
              {section.terms.map((id) => (
                <li key={id} className="flex items-center gap-1">
                  {termById(id).word}
                  <Term id={id} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <Link
          href={`${appPath("guide")}#${section.id}`}
          onClick={() => setOpen(false)}
          className="mt-auto inline-flex min-h-11 items-center text-sm font-medium text-primary-text hover:underline"
        >
          Read the full guide
        </Link>
      </SheetContent>
    </Sheet>
  );
}
