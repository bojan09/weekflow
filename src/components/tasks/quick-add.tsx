"use client";

import { useId, useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mutateTasks, newTaskId } from "@/data/tasks";
import { parseQuickAdd } from "@/domain/quick-add";
import { addTask, buildTask } from "@/domain/task-ops";
import type { Placement } from "@/domain/tasks";
import { useNow } from "@/hooks/use-now";
import { usePrefsStore } from "@/prefs/store";
import { cn } from "@/lib/utils";

interface QuickAddProps {
  /** Add straight onto the calendar instead of the inbox. */
  placement?: Placement | null;
  placeholder?: string;
  className?: string;
}

/**
 * One-line task entry. Understands "45m", "1h30", "!high" and "due fri", so a
 * task takes a few seconds to capture. Defaults come from Workspace settings.
 */
export function QuickAdd({ placement = null, placeholder = "Add a task…", className }: QuickAddProps) {
  const [value, setValue] = useState("");
  const now = useNow();
  const workspace = usePrefsStore((s) => s.prefs.workspace);
  const hintId = useId();

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    if (!now) return;
    const parsed = parseQuickAdd(value, now.date);
    if (parsed.title.length === 0) return;
    const task = buildTask(
      {
        title: parsed.title,
        durationMin: parsed.durationMin ?? workspace.defaultDurationMin,
        priority: parsed.priority ?? workspace.defaultPriority,
        deadline: parsed.deadline,
        placement,
      },
      newTaskId(),
      new Date().toISOString(),
    );
    mutateTasks((tasks) => addTask(tasks, task));
    toast.success(placement ? "Task added to your calendar" : "Task added to your inbox");
    setValue("");
  };

  return (
    <form onSubmit={submit} className={cn("w-full", className)}>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          aria-label="Quick add a task"
          aria-describedby={hintId}
          maxLength={200}
          className="h-10 flex-1 rounded-xl border-input bg-card"
        />
        <Button type="submit" size="lg" disabled={value.trim().length === 0 || !now} className="h-10 px-4">
          <Plus aria-hidden="true" /> Add
        </Button>
      </div>
      <p id={hintId} className="mt-1.5 text-xs text-muted-foreground">
        Try: Write report 1h30 !high due fri
      </p>
    </form>
  );
}
