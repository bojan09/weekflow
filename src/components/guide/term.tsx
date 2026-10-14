"use client";

import Link from "next/link";
import { Info, X } from "lucide-react";
import { Popover, PopoverClose, PopoverContent, PopoverDescription, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { termById, type TermId } from "@/guide/terms";
import { appPath } from "@/lib/routes";
import { cn } from "@/lib/utils";

/**
 * A small (i) next to a confusing word. Opens on click, Enter or Space, so it
 * works on touch and with a keyboard. The icon is 24px with a 44px tap area.
 */
export function Term({ id, className }: { id: TermId; className?: string }) {
  const term = termById(id);
  return (
    <Popover modal>
      <PopoverTrigger
        aria-label={`What is ${term.word}?`}
        className={cn(
          "relative inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors outline-none after:absolute after:-inset-2.5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
      >
        <Info className="size-4" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent>
        <PopoverClose
          aria-label="Close"
          className="absolute top-1 right-1 flex size-11 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-4" aria-hidden="true" />
        </PopoverClose>
        <PopoverTitle className="pr-10 text-sm font-semibold">{term.word}</PopoverTitle>
        <PopoverDescription className="mt-1 text-sm">{term.plain}</PopoverDescription>
        <p className="mt-2 text-sm text-muted-foreground">{term.whyItMatters}</p>
        <div className="mt-3 flex flex-col gap-1.5 text-sm font-medium text-primary-text">
          {term.setting ? (
            <Link href={appPath(term.setting.route, term.setting.sub)} className="hover:underline">
              Open {term.setting.label}
            </Link>
          ) : null}
          <Link href={`${appPath("guide")}#term-${term.id}`} className="hover:underline">
            More in the Guide
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
