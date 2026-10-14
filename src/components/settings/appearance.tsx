"use client";

import { Check } from "lucide-react";
import { BACKGROUNDS, type BackgroundId } from "@/theme/backgrounds";
import { PALETTES, type AccentId } from "@/theme/generated/palettes";
import { cn } from "@/lib/utils";
import { useRoving } from "./controls";

/**
 * Live thumbnail of a page background. It renders the same CSS the app uses
 * (data-bg → --page-bg), so what you see is exactly what you get.
 */
export function MiniPreview({
  background,
  accent,
  scheme,
}: {
  background: BackgroundId;
  accent: AccentId;
  scheme?: "light" | "dark";
}) {
  return (
    <div
      data-bg={background}
      data-accent={accent}
      className={cn("relative aspect-[16/10] w-full overflow-hidden rounded-xl border", scheme)}
      style={{ background: "var(--page-bg)" }}
      aria-hidden="true"
    >
      <div className="absolute inset-y-[8%] left-[4%] w-[20%] rounded-md bg-sidebar">
        <div className="mx-auto mt-[18%] h-[7%] w-[55%] rounded-full bg-sidebar-primary" />
        <div className="mx-auto mt-[12%] h-[5%] w-[55%] rounded-full bg-sidebar-muted/60" />
        <div className="mx-auto mt-[10%] h-[5%] w-[55%] rounded-full bg-sidebar-muted/60" />
      </div>
      <div className="absolute inset-y-[8%] right-[4%] left-[28%] space-y-[4%] rounded-md bg-background p-[4%]">
        <div className="h-[8%] w-1/3 rounded-full bg-foreground/70" />
        <div className="flex h-[46%] gap-[4%]">
          <div className="flex-1 rounded-sm bg-task-blue-bg" />
          <div className="flex-1 rounded-sm bg-primary-soft" />
          <div className="flex-1 rounded-sm bg-task-green-bg" />
        </div>
        <div className="h-[20%] rounded-sm bg-muted" />
      </div>
    </div>
  );
}

const PREVIEW_SCHEME: Partial<Record<BackgroundId, "light" | "dark">> = {
  light: "light",
  dark: "dark",
};

export function BackgroundPicker({
  value,
  accent,
  onChange,
}: {
  value: BackgroundId;
  accent: AccentId;
  onChange: (value: BackgroundId) => void;
}) {
  const ids = BACKGROUNDS.map((b) => b.id);
  const { refs, onKeyDown } = useRoving(ids, onChange);
  return (
    <div
      role="radiogroup"
      aria-label="Background"
      className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 xl:grid-cols-4"
    >
      {BACKGROUNDS.map((background, index) => {
        const selected = background.id === value;
        return (
          <button
            key={background.id}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(background.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className="group flex flex-col gap-2 rounded-2xl text-left"
          >
            <span
              className={cn(
                "block rounded-[0.85rem] p-0.5 transition-shadow",
                selected
                  ? "ring-2 ring-primary-text ring-offset-2 ring-offset-card"
                  : "group-hover:ring-2 group-hover:ring-border",
              )}
            >
              <MiniPreview
                background={background.id}
                accent={accent}
                scheme={PREVIEW_SCHEME[background.id]}
              />
            </span>
            <span
              className={cn(
                "flex items-center gap-1.5 text-xs font-medium",
                selected ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {selected ? <Check className="size-3.5 text-primary-text" aria-hidden="true" /> : null}
              {background.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function AccentPicker({
  value,
  onChange,
}: {
  value: AccentId;
  onChange: (value: AccentId) => void;
}) {
  const ids = PALETTES.map((p) => p.id);
  const { refs, onKeyDown } = useRoving(ids, onChange);
  return (
    <div role="radiogroup" aria-label="Accent color" className="flex flex-wrap gap-2.5">
      {PALETTES.map((palette, index) => {
        const selected = palette.id === value;
        return (
          <button
            key={palette.id}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={palette.name}
            title={palette.name}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(palette.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              "flex size-8 items-center justify-center rounded-full border border-foreground/15 transition-transform hover:scale-110",
              selected && "ring-2 ring-foreground ring-offset-2 ring-offset-card",
            )}
            style={{ backgroundColor: palette.swatch, color: palette.swatchFg }}
          >
            {selected ? <Check className="size-4" strokeWidth={3} aria-hidden="true" /> : null}
          </button>
        );
      })}
    </div>
  );
}
