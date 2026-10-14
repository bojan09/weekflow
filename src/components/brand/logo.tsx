import { useId } from "react";
import { cn } from "@/lib/utils";

/** The "W" mark. Gradient comes from the active accent (--logo-a → --logo-b). */
export function WeekflowMark({ className }: { className?: string }) {
  const gradientId = useId();
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-8", className)}
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="3" y1="4" x2="29" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--logo-a)" />
          <stop offset="1" stopColor="var(--logo-b)" />
        </linearGradient>
      </defs>
      <path
        d="M4 7.5 11.2 25 16 13.6 20.8 25 28 7.5"
        stroke={`url(#${gradientId})`}
        strokeWidth="4.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface LogoProps {
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
}

export function Logo({ className, markClassName, wordmarkClassName }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <WeekflowMark className={markClassName} />
      <span className={cn("text-lg font-semibold tracking-tight", wordmarkClassName)}>
        Weekflow
      </span>
    </span>
  );
}
