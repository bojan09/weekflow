"use client";

import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { useAuthStore } from "@/auth/store";

/** Starts reading the session once, wherever it is needed. */
export function AuthBoot(): null {
  const refresh = useAuthStore((s) => s.refresh);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return null;
}

/** Shared authentication frame with readable brand and footer surfaces. */
export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10">
      <AuthBoot />
      <Link href="/" aria-label="Weekflow home" className="surface-panel mb-6 flex min-h-11 items-center self-start rounded-2xl border px-4 py-2 shadow-soft">
        <Logo markClassName="size-9" wordmarkClassName="text-xl" />
      </Link>
      <main id="main" className="surface-panel rounded-3xl border p-6 shadow-soft sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="mt-1.5 text-sm text-muted-foreground">{description}</p> : null}
        <div className="mt-6">{children}</div>
        {footer ? <div className="mt-6 border-t pt-4 text-center text-sm text-muted-foreground [&_a]:inline-flex [&_a]:min-h-11 [&_a]:items-center [&_a]:font-medium [&_a]:text-primary-text">{footer}</div> : null}
      </main>
    </div>
  );
}

/** A labelled input with its error under it, linked for screen readers. */
export function TextField({
  id,
  label,
  error,
  hint,
  ...input
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "id">) {
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        data-slot="input"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className="h-11 w-full rounded-xl border border-input bg-card px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
        {...input}
      />
      {hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-danger-text">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** A form-level message (a refused sign-in, a sent email). */
export function Notice({ tone, children }: { tone: "error" | "success" | "info"; children: ReactNode }) {
  const look = {
    error: "border-danger-border bg-danger-soft text-danger-text",
    success: "border-success-border bg-success-soft text-success-text",
    info: "border-info-border bg-info-soft text-info-text",
  }[tone];
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`rounded-xl border px-3 py-2.5 text-sm ${look}`}>
      {children}
    </p>
  );
}
