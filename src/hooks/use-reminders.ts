"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { tasksCollection } from "@/data/tasks";
import { useCollection } from "@/data/use-collection";
import { dueReminders, reminderMessage } from "@/domain/reminders";
import { usePrefsStore } from "@/prefs/store";
import { useUiStore } from "@/stores/ui";
import { useNow } from "./use-now";

const STORAGE_KEY = "weekflow:demo:reminded";

function loadReminded(): Set<string> {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveReminded(keys: Set<string>): void {
  try {
    // Keep it small: only today's reminders matter.
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...keys].slice(-200)));
  } catch {
    // Reminders still work for this page view without storage.
  }
}

/**
 * Shows a reminder inside Weekflow shortly before a timed task starts, once
 * per task and start time, when reminders are on in Settings. No browser
 * permission is needed.
 */
export function useReminders(): void {
  const tasks = useCollection(tasksCollection);
  const now = useNow();
  const { reminders, reminderLeadMin } = usePrefsStore((s) => s.prefs.notifications);
  const reminded = useRef<Set<string> | null>(null);

  const list = tasks.status === "ready" ? tasks.data : null;
  useEffect(() => {
    if (!reminders || !list || !now) return;
    reminded.current ??= loadReminded();
    const due = dueReminders(list, now, reminderLeadMin, reminded.current);
    if (due.length === 0) return;
    for (const reminder of due) {
      reminded.current.add(reminder.key);
      toast(reminderMessage(reminder), {
        duration: 10_000,
        action: { label: "Open", onClick: () => useUiStore.getState().openEditor({ kind: "edit", id: reminder.task.id }) },
      });
    }
    saveReminded(reminded.current);
  }, [reminders, reminderLeadMin, list, now]);
}
