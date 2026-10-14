import { isTimed, type Task } from "./tasks";

export interface DueReminder {
  /** Stable per task, day and start time, so each reminder shows once. */
  key: string;
  task: Task;
  /** Minutes until the task starts (0 = starting now). */
  startsInMin: number;
}

/**
 * Open timed tasks starting today whose reminder time has arrived. A reminder
 * is due from `leadMin` minutes before the start until the start minute, so
 * opening the app after a task began never shows a stale one.
 */
export function dueReminders(
  tasks: readonly Task[],
  now: { date: string; minutes: number },
  leadMin: number,
  reminded: ReadonlySet<string>,
): DueReminder[] {
  const due: DueReminder[] = [];
  for (const task of tasks) {
    if (task.status !== "todo" || !isTimed(task) || task.placement.date !== now.date) continue;
    const start = task.placement.startMin;
    const startsInMin = start - now.minutes;
    if (startsInMin < 0 || startsInMin > leadMin) continue;
    const key = `${task.id}:${task.placement.date}:${start}`;
    if (!reminded.has(key)) due.push({ key, task, startsInMin });
  }
  return due.sort((a, b) => a.startsInMin - b.startsInMin || (a.task.id < b.task.id ? -1 : 1));
}

export function reminderMessage(reminder: DueReminder): string {
  const when = reminder.startsInMin === 0 ? "starts now" : `starts in ${reminder.startsInMin} min`;
  return `${reminder.task.title} ${when}`;
}
