import Link from "next/link";
import { Compass } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="max-w-md rounded-3xl bg-background p-10 text-center shadow-soft">
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary-soft-text">
          <Compass className="size-6" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-2xl font-semibold">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          That page does not exist, or it moved.
        </p>
        <Link href="/" className={cn(buttonVariants({ size: "lg" }), "mt-6")}>
          Back to Weekflow
        </Link>
      </div>
    </main>
  );
}
