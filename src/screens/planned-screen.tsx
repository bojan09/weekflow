import Link from "next/link";
import { Check, Hourglass } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { buttonVariants } from "@/components/ui/button";
import { ROADMAP, PLANNED_ROUTES } from "@/lib/roadmap";
import { appPath, type AppRoute } from "@/lib/routes";
import { cn } from "@/lib/utils";

/**
 * Honest placeholder for a screen that is not built yet: says which version
 * delivers it and what it will contain. No fake data, no dead controls.
 */
export function PlannedScreen({ route, title }: { route: AppRoute; title: string }) {
  const plan = PLANNED_ROUTES[route];
  const release = ROADMAP.find((r) => r.version === plan?.version);
  return (
    <>
      <PageHeader title={title} subtitle={plan?.blurb} />
      <section className="mx-auto max-w-2xl rounded-3xl border bg-card p-6 shadow-soft md:p-8">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-info-soft text-info-text">
          <Hourglass className="size-6" aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-lg font-semibold">
          Arrives in version {plan?.version}
          {release ? <span className="font-normal text-muted-foreground">: {release.title}</span> : null}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This screen is part of the planned roadmap. Here is what it will include.
        </p>
        <ul className="mt-5 space-y-2.5">
          {plan?.items.map((item) => (
            <li key={item} className="flex gap-3 text-sm">
              <Check className="mt-0.5 size-4 shrink-0 text-success-text" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href={appPath("settings", "appearance")} className={cn(buttonVariants({ size: "lg" }))}>
            Try appearance settings
          </Link>
          <Link href={appPath("changelog")} className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
            Version history
          </Link>
        </div>
      </section>
    </>
  );
}
