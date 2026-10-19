import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";
import { TASK_STYLE } from "@/components/tasks/task-style";
import { buttonVariants } from "@/components/ui/button";
import type { TaskHue } from "@/domain/tasks";
import { SITE_CTA } from "@/lib/site";
import { cn } from "@/lib/utils";

interface FloatingCard {
  title: string;
  meta: string;
  hue: TaskHue;
  locked?: boolean;
  /** Tailwind position classes (extra-large screens only). */
  position: string;
  delay: string;
}

const CARDS: FloatingCard[] = [
  { title: "Morning swim", meta: "07:00 · 30m", hue: "teal", position: "left-[3%] top-[12%] w-44", delay: "0s" },
  { title: "Book flights", meta: "Any time · Fri", hue: "orange", position: "left-[1%] top-[48%] w-44", delay: "1.2s" },
  { title: "Dinner with Priya", meta: "19:30 · 1h", hue: "pink", position: "left-[6%] top-[76%] w-48", delay: "2.4s" },
  { title: "Renew passport", meta: "Due Friday", hue: "amber", position: "right-[22%] top-[6%] w-44", delay: "0.6s" },
  { title: "Design review", meta: "10:00 · 1h 15m", hue: "blue", locked: true, position: "right-[2%] top-[22%] w-48", delay: "1.8s" },
  { title: "Deep work", meta: "14:00 · 2h", hue: "lavender", locked: true, position: "right-[4%] top-[62%] w-48", delay: "3s" },
];

function Card({ card }: { card: FloatingCard }) {
  const look = TASK_STYLE[card.hue];
  return (
    <div
      className={cn(
        "float-card absolute hidden rounded-xl border-l-[3px] px-3 py-2 shadow-soft xl:block",
        look.surface,
        look.bar,
        card.position,
      )}
      style={{ animationDelay: card.delay }}
    >
      <div className="flex items-center justify-between gap-2">
        <p className={cn("truncate text-sm font-semibold", look.title)}>{card.title}</p>
        {card.locked ? <Lock className={cn("size-3.5 shrink-0", look.title)} /> : null}
      </div>
      <p className={cn("text-xs", look.meta)}>{card.meta}</p>
    </div>
  );
}

/**
 * Centered hero. The scattered cards and faint grid are decoration only, so the
 * whole backdrop is hidden from assistive tech and from small screens.
 */
export function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      className="surface-panel relative overflow-hidden rounded-3xl border px-4 pt-10 pb-8 text-center shadow-soft sm:px-10 sm:pt-24 sm:pb-20"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="hero-grid absolute inset-0 opacity-70" />
        {CARDS.map((card) => (
          <Card key={card.title} card={card} />
        ))}
      </div>

      <div className="relative mx-auto max-w-3xl">
        <p className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
          Free forever. Your week, your rules.
        </p>
        <h1
          id="hero-title"
          className="text-[clamp(2.5rem,7vw,4.75rem)] leading-[1.05] font-semibold tracking-[-0.035em] text-balance"
        >
          Plan smarter.
          <br />
          <span className="text-primary-text">Work better.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground text-pretty sm:mt-6 sm:text-lg">
          A flexible weekly planner shaped around your deadlines, priorities and real availability. Make a plan that
          works for your life, and stay in control of every change.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:mt-9 sm:flex-row sm:gap-3">
          <Link href={SITE_CTA.href} className={cn(buttonVariants({ size: "lg" }), "h-12 w-full rounded-full px-8 text-base shadow-lift sm:w-auto")}>
            Create your free account <ArrowRight aria-hidden="true" />
          </Link>
          <Link
            href="/sign-in"
            className="flex h-11 items-center rounded-full border bg-card/80 px-6 text-sm font-medium text-foreground hover:bg-muted sm:h-12 sm:text-base"
          >
            Already have an account? Sign in
          </Link>
        </div>
        <Link href="/#how" className="mt-4 inline-flex min-h-11 items-center rounded-full px-4 text-sm font-medium text-primary-text hover:bg-primary-soft">See how it works</Link>
        <p className="mt-1 text-xs text-muted-foreground">No credit card · No paid tiers · Free forever</p>
      </div>
    </section>
  );
}
