"use client";

import {
  useId,
  useRef,
  type KeyboardEvent,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { ChevronDown, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

/** Titled card that groups related rows. */
export function SettingsGroup({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border bg-card px-5 shadow-soft", className)}>
      {title ? (
        <header className="pt-5 pb-1">
          <h3 className="text-sm font-semibold">{title}</h3>
          {description ? <p className="mt-0.5 text-sm text-muted-foreground">{description}</p> : null}
        </header>
      ) : null}
      <div className="divide-y">{children}</div>
    </section>
  );
}

/** One labelled control. Pass a function to receive the id for htmlFor. */
export function SettingRow({
  label,
  description,
  hint,
  children,
  stacked = false,
}: {
  label: string;
  description?: string;
  /** Small extra next to the label, such as an (i) tip. */
  hint?: ReactNode;
  children: ReactNode | ((id: string) => ReactNode);
  /** Put the control under the label instead of beside it. */
  stacked?: boolean;
}) {
  const id = useId();
  return (
    <div
      className={cn(
        "flex gap-x-6 gap-y-3 py-[var(--row-y)]",
        stacked ? "flex-col" : "flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between",
      )}
    >
      <div className="min-w-0 sm:max-w-md">
        <div className="flex items-center gap-1">
          <label htmlFor={id} className="text-sm font-medium">
            {label}
          </label>
          {hint}
        </div>
        {description ? <p className="mt-0.5 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <div className={cn("shrink-0", stacked && "w-full")}>
        {typeof children === "function" ? children(id) : children}
      </div>
    </div>
  );
}

export function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-6 py-[var(--row-y)]">
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-sm text-muted-foreground">{description}</span>
        ) : null}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

/** Arrow-key navigation shared by every radio-style group. */
function useRoving<T extends string>(values: readonly T[], onChange: (value: T) => void) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const onKeyDown = (event: KeyboardEvent<HTMLElement>, index: number): void => {
    const count = values.length;
    let next = -1;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % count;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index - 1 + count) % count;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = count - 1;
    if (next < 0) return;
    event.preventDefault();
    const target = values[next];
    if (target !== undefined) onChange(target);
    refs.current[next]?.focus();
  };
  return { refs, onKeyDown };
}

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: readonly SegmentOption<T>[];
  label: string;
  className?: string;
}) {
  const { refs, onKeyDown } = useRoving(
    options.map((o) => o.value),
    onChange,
  );
  return (
    <div role="radiogroup" aria-label={label} className={cn("flex flex-wrap gap-2", className)}>
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              "flex min-h-10 min-w-24 flex-1 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-medium transition-colors",
              selected
                ? "border-primary-border bg-primary-soft text-primary-soft-text ring-1 ring-primary-text/40"
                : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export { useRoving };

export function NativeSelect({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="relative inline-block w-full sm:w-auto">
      <select
        {...props}
        className={cn(
          "h-10 w-full min-w-44 appearance-none rounded-xl border border-input bg-card py-2 pr-9 pl-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
    </span>
  );
}

export function NumberField({
  id,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
}: {
  id?: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
}) {
  return (
    <span className="flex items-center gap-2">
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isFinite(next) && next >= min && next <= max) onChange(next);
        }}
        className="h-10 w-24 rounded-xl border-input bg-card"
      />
      {unit ? <span className="text-sm text-muted-foreground">{unit}</span> : null}
    </span>
  );
}

export function RangeField({
  id,
  value,
  onChange,
  min = 0,
  max = 10,
}: {
  id?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <span className="flex items-center gap-3">
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-2 w-40 cursor-pointer accent-primary"
      />
      <span className="w-6 text-right text-sm tabular-nums text-muted-foreground">{value}</span>
    </span>
  );
}

/** Informational callout used where a setting is saved now and applied later. */
export function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-info-border bg-info-soft px-4 py-3 text-sm text-info-text">
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p>{children}</p>
    </div>
  );
}
