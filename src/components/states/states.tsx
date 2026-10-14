import type { ReactNode } from "react";
import { CircleAlert, Inbox, Lock, WifiOff, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "danger" | "warning" | "info";

const TONES: Record<Tone, string> = {
  neutral: "bg-primary-soft text-primary-soft-text",
  danger: "bg-danger-soft text-danger-text",
  warning: "bg-warning-soft text-warning-text",
  info: "bg-info-soft text-info-text",
};

interface StateCardProps {
  icon: LucideIcon;
  tone?: Tone;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

function StateCard({ icon: Icon, tone = "neutral", title, description, action, className }: StateCardProps) {
  return (
    <div
      className={cn(
        "mx-auto flex max-w-md flex-col items-center gap-3 rounded-3xl border bg-card px-6 py-10 text-center shadow-soft",
        className,
      )}
    >
      <span className={cn("flex size-12 items-center justify-center rounded-2xl", TONES[tone])}>
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function EmptyState(props: Omit<StateCardProps, "icon"> & { icon?: LucideIcon }) {
  return <StateCard {...props} icon={props.icon ?? Inbox} />;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert">
      <StateCard
        icon={CircleAlert}
        tone="danger"
        title="Something went wrong"
        description={message}
        action={
          <Button variant="outline" onClick={onRetry}>
            Try again
          </Button>
        }
      />
    </div>
  );
}

export function PermissionDenied() {
  return (
    <StateCard
      icon={Lock}
      tone="warning"
      title="You don't have access"
      description="Ask the owner of this workspace to give you access, then reload this page."
    />
  );
}

export function OfflineNotice({ simulated }: { simulated: boolean }) {
  return (
    <div
      role="status"
      className="flex items-center gap-2 rounded-2xl border border-warning-border bg-warning-soft px-4 py-2.5 text-sm text-warning-text"
    >
      <WifiOff className="size-4 shrink-0" aria-hidden="true" />
      <span>
        {simulated ? "Simulated offline. " : "You're offline. "}
        Weekflow keeps working with the data saved on this device.
      </span>
    </div>
  );
}

/** Generic block skeleton used while a screen loads. */
export function LoadingBlocks({ rows = 4 }: { rows?: number }) {
  return (
    <div role="status" aria-busy="true" aria-label="Loading" className="space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-2xl" />
      ))}
    </div>
  );
}
