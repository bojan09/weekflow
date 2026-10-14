import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";
import { APP_VERSION } from "@/generated/version";
import { SITE_CTA, SITE_LINKS } from "@/lib/site";
import { cn } from "@/lib/utils";

const PRODUCT = SITE_LINKS.filter((l) => ["Features", "How it works", "Customize"].includes(l.label));
const PROJECT = SITE_LINKS.filter((l) => ["Roadmap", "Version history"].includes(l.label));

function LinkList({ title, links }: { title: string; links: readonly { href: string; label: string }[] }) {
  return (
    <nav aria-label={title}>
      <h2 className="text-sm font-semibold">{title}</h2>
      <ul className="mt-2 space-y-1">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="flex min-h-11 items-center rounded-lg text-sm text-muted-foreground hover:text-foreground"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * Footer that stacks cleanly on phones: brand and CTA first, two link columns,
 * 44px rows, and bottom padding for the home indicator and the sticky CTA.
 */
export function SiteFooter() {
  return (
    <footer className="surface-panel rounded-3xl border p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-soft sm:p-10">
      <div className="grid gap-8 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="space-y-4">
          <Logo markClassName="size-9" wordmarkClassName="text-xl" />
          <p className="max-w-xs text-sm text-muted-foreground">
            Plan smarter. Work better. A flexible weekly planner where your time follows your rules.
          </p>
          <span className="inline-flex rounded-full bg-success-soft px-3 py-1 text-xs font-medium text-success-text">
            Free forever. No limits.
          </span>
          <div>
            <Link href={SITE_CTA.href} className={cn(buttonVariants({ size: "lg" }), "h-11 rounded-full px-6")}>
              {SITE_CTA.label}
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6 md:contents">
          <LinkList title="Product" links={PRODUCT} />
          <LinkList title="Project" links={PROJECT} />
        </div>
      </div>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t pt-5 text-xs text-muted-foreground">
        <p>Weekflow {APP_VERSION}</p>
        <p className="font-medium text-foreground">Your time. Your rules.</p>
      </div>
    </footer>
  );
}
