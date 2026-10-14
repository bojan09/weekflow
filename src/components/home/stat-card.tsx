import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatTone = "neutral" | "success" | "danger" | "info";

const TONES: Record<StatTone, { card: string; tile: string }> = {
  neutral: { card: "border-primary-border bg-primary-soft/60", tile: "bg-card text-primary-soft-text" },
  success: { card: "border-success-border bg-success-soft", tile: "bg-card text-success-text" },
  danger: { card: "border-danger-border bg-danger-soft", tile: "bg-card text-danger-text" },
  info: { card: "border-info-border bg-info-soft", tile: "bg-card text-info-text" },
};

const VALUE_TONE: Record<StatTone, string> = {
  neutral: "text-foreground",
  success: "text-success-text",
  danger: "text-danger-text",
  info: "text-info-text",
};

/** A single weekly number with a tinted icon tile. */
export function StatCard({
  label,
  value,
  icon: Icon,
  tone,
  hint,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: StatTone;
  hint?: string;
}) {
  const style = TONES[tone];
  return (
    <div className={cn("flex items-center gap-4 rounded-2xl border p-4", style.card)}>
      <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl shadow-soft", style.tile)}>
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs text-muted-foreground">{label}</p>
        <p className={cn("text-2xl leading-tight font-semibold tabular-nums", VALUE_TONE[tone])}>{value}</p>
        {hint ? <p className="truncate text-xs text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  );
}
