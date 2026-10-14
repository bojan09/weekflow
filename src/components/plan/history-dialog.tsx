"use client";

import { History, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { clearHistory, historyCollection, restoreSnapshot } from "@/data/history";
import { restoreTasks, tasksCollection } from "@/data/tasks";
import { useCollection } from "@/data/use-collection";
import { snapshotChanges, type ScheduleSnapshot } from "@/domain/history";
import { useUiStore } from "@/stores/ui";

const formatWhen = (iso: string): string =>
  new Date(iso).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

function Body({ onClose }: { onClose: () => void }) {
  const history = useCollection(historyCollection);
  const tasks = useCollection(tasksCollection);

  if (history.status !== "ready" || tasks.status !== "ready") {
    return <p className="py-6 text-sm text-muted-foreground">Your schedule history is not available right now.</p>;
  }
  if (history.data.length === 0) {
    return (
      <p className="rounded-xl bg-muted/60 px-3 py-6 text-center text-sm text-muted-foreground">
        No history yet. Weekflow saves your schedule just before Plan my week, auto-replanning and each restore.
      </p>
    );
  }

  const restore = (snapshot: ScheduleSnapshot): void => {
    const previous = restoreSnapshot(snapshot);
    onClose();
    if (!previous) return;
    toast("Schedule restored", { action: { label: "Undo", onClick: () => restoreTasks(previous) } });
  };

  return (
    <>
      <ul className="max-h-[22rem] space-y-2 overflow-y-auto pr-1">
        {history.data.map((snapshot) => {
          const changes = snapshotChanges(snapshot, tasks.data).length;
          return (
            <li key={snapshot.id} className="flex items-center justify-between gap-3 rounded-xl border p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{snapshot.label}</p>
                <p className="text-xs text-muted-foreground">
                  {formatWhen(snapshot.at)} ·{" "}
                  {changes === 0 ? "Same as now" : `${changes} ${changes === 1 ? "task" : "tasks"} would move`}
                </p>
              </div>
              <Button variant="outline" size="sm" disabled={changes === 0} onClick={() => restore(snapshot)}>
                <Undo2 aria-hidden="true" /> Restore
              </Button>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-muted-foreground">
        Restoring puts tasks back where they were. Locked and finished tasks stay, and your edits are kept.
      </p>
      <Button variant="ghost" size="sm" className="self-start" onClick={clearHistory}>
        Clear history
      </Button>
    </>
  );
}

/** Roll the schedule back to how it looked before an earlier bulk change. */
export function HistoryDialog() {
  const open = useUiStore((s) => s.historyOpen);
  const setOpen = useUiStore((s) => s.setHistoryOpen);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="size-4" aria-hidden="true" /> Schedule history
          </DialogTitle>
          <DialogDescription>Go back to an earlier version of your schedule.</DialogDescription>
        </DialogHeader>
        <Body onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
