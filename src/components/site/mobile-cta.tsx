"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { SITE_CTA } from "@/lib/site";
import { cn } from "@/lib/utils";

/**
 * One primary action, pinned to the bottom of phone screens once the hero has
 * scrolled away. Hidden (and inert) before that, on larger screens, and while
 * the footer, which has its own button, is on screen.
 */
export function MobileCta({ afterId, untilId }: { afterId: string; untilId: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Two cheap measurements per scroll event: no throttling needed.
    const update = (): void => {
      const hero = document.getElementById(afterId);
      const footer = document.getElementById(untilId);
      if (!hero || !footer) return;
      const pastHero = hero.getBoundingClientRect().top < 0;
      const atFooter = footer.getBoundingClientRect().top < window.innerHeight;
      setVisible(pastHero && !atFooter);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [afterId, untilId]);

  return (
    <div
      inert={!visible}
      className={cn(
        "fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 transition-all duration-200 sm:hidden",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0",
      )}
    >
      <Link href={SITE_CTA.href} className={cn(buttonVariants({ size: "lg" }), "h-12 w-full rounded-full text-base shadow-lift")}>
        {SITE_CTA.label}
      </Link>
    </div>
  );
}
