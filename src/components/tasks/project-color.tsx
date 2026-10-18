"use client";

import { PROJECT_HUES, PROJECT_COLOR_LABEL, type ProjectHue } from "@/domain/project-colors";
import { cn } from "@/lib/utils";

export function ProjectDot({ hue, className }: { hue: ProjectHue; className?: string }) {
  return <span aria-hidden="true" className={cn("inline-block size-3 shrink-0 rounded-sm", `project-color-${hue}`, className)} />;
}

export function ProjectColorPicker({ label, value, onChange, disabled }: { label: string; value: ProjectHue; onChange: (hue: ProjectHue) => void; disabled?: boolean }) {
  return <fieldset disabled={disabled} className="min-w-0 space-y-2">
    <legend className="mb-2 text-xs font-medium">{label} · {PROJECT_COLOR_LABEL[value]}</legend>
    <div className="flex flex-wrap gap-1" role="group" aria-label={label}>
      {PROJECT_HUES.map((hue) => <button key={hue} type="button" aria-label={PROJECT_COLOR_LABEL[hue]} aria-pressed={value === hue} title={PROJECT_COLOR_LABEL[hue]} onClick={() => onChange(hue)} className={cn("flex size-11 items-center justify-center rounded-xl border focus-visible:outline-2 focus-visible:outline-ring", value === hue ? "border-primary bg-primary-soft ring-1 ring-primary" : "border-transparent hover:bg-muted")}><ProjectDot hue={hue} className="size-6 rounded-full ring-1 ring-border" /></button>)}
    </div>
  </fieldset>;
}
