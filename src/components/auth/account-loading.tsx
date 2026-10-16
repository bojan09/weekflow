import { Logo } from "@/components/brand/logo";
import { Skeleton } from "@/components/ui/skeleton";

/** A neutral loading shell: private children and demo data are never mounted early. */
export function AccountLoading() {
  return <div role="status" aria-label="Loading planner" aria-busy="true" className="flex min-h-dvh gap-4 p-2 sm:p-4">
    <aside aria-hidden="true" className="surface-sidebar hidden w-60 shrink-0 space-y-5 rounded-3xl p-6 text-sidebar-foreground lg:block">
      <Logo wordmarkClassName="text-sidebar-foreground" />
      {Array.from({ length: 7 }, (_, index) => <div key={index} className="h-10 rounded-xl bg-sidebar-hover" />)}
    </aside>
    <main className="surface-panel min-w-0 flex-1 space-y-6 rounded-3xl p-4 sm:p-8">
      <span className="sr-only">Loading your planner</span>
      <div aria-hidden="true" className="space-y-6">
        <div className="flex items-center justify-between gap-4"><Skeleton className="h-8 w-52" /><Skeleton className="size-10 rounded-full" /></div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-20 rounded-2xl" />)}</div>
        <div className="overflow-hidden rounded-2xl border bg-card">
          <div className="grid grid-cols-7 gap-3 border-b p-4">{Array.from({ length: 7 }, (_, index) => <Skeleton key={index} className="h-10" />)}</div>
          {Array.from({ length: 6 }, (_, index) => <div key={index} className="h-16 border-b last:border-b-0" />)}
        </div>
      </div>
    </main>
  </div>;
}
