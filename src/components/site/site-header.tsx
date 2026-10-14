"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, Moon, Sun, X } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SITE_CTA, SITE_LINKS } from "@/lib/site";
import { cn } from "@/lib/utils";
import { resolveDark, systemPrefersDark } from "@/prefs/apply";
import { usePrefsStore } from "@/prefs/store";

/** Switches between light and dark. The icon shows what you will switch to. */
function ThemeToggle({ className }: { className?: string }) {
  const theme = usePrefsStore((s) => s.prefs.appearance.theme);
  const update = usePrefsStore((s) => s.update);
  const hydrated = usePrefsStore((s) => s.hydrated);
  const dark = hydrated && resolveDark(theme, systemPrefersDark());
  return (
    <Button
      variant="ghost"
      size="icon-lg"
      className={cn("size-11", className)}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => update("appearance", { theme: dark ? "light" : "dark" })}
    >
      {dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
    </Button>
  );
}

/**
 * Public header. A floating glass pill; on small screens the links move into a
 * full-height sheet with 48px rows and the call to action pinned at the bottom.
 */
export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = (): void => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="sticky top-3 z-40 mx-auto w-full max-w-6xl px-3 sm:px-5">
      <a
        href="#main"
        className="sr-only rounded-lg bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:absolute focus:top-2 focus:left-5"
      >
        Skip to content
      </a>
      <div
        className={cn(
          "surface-panel flex h-16 items-center justify-between rounded-2xl border px-3 pl-4 transition-shadow duration-200 sm:px-4",
          scrolled ? "shadow-lift" : "shadow-soft",
        )}
      >
        <Link href="/" aria-label="Weekflow home" className="flex min-h-11 items-center rounded-lg">
          <Logo markClassName="size-8" />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {SITE_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Link href={SITE_CTA.href} className={cn(buttonVariants({ size: "lg" }), "hidden h-10 rounded-full px-5 sm:inline-flex")}>
            {SITE_CTA.label}
          </Link>
          <Button
            variant="ghost"
            size="icon-lg"
            className="size-11 lg:hidden"
            aria-label="Open menu"
            aria-expanded={open}
            aria-haspopup="dialog"
            onClick={() => setOpen(true)}
          >
            <Menu aria-hidden="true" />
          </Button>
        </div>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" showCloseButton={false} className="w-full gap-0 sm:max-w-sm">
          <SheetHeader className="flex-row items-center justify-between">
            <div>
              <SheetTitle>Menu</SheetTitle>
              <SheetDescription className="sr-only">Site navigation</SheetDescription>
            </div>
            <Button variant="ghost" size="icon-lg" className="size-11" aria-label="Close menu" onClick={() => setOpen(false)}>
              <X aria-hidden="true" />
            </Button>
          </SheetHeader>
          <nav aria-label="Mobile" className="flex flex-1 flex-col gap-1 overflow-y-auto px-4">
            {SITE_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="flex min-h-12 items-center rounded-xl px-3 text-base font-medium hover:bg-muted"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="space-y-3 border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Link
              href={SITE_CTA.href}
              onClick={() => setOpen(false)}
              className={cn(buttonVariants({ size: "lg" }), "h-12 w-full rounded-full text-base")}
            >
              {SITE_CTA.label}
            </Link>
            <p className="text-center text-xs text-muted-foreground">Free forever. No credit card.</p>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
