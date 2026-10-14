# 0.0.7: Recurring tasks, projects, templates, categories, blocks, reminders

Status: decided by the assistant under the owner's instruction "continue with every phase that doesn't
require my input" (2026-10-14). No owner choices were needed; defaults below follow the existing patterns.
The owner can overrule any of these in a later message.

## Decisions
| Topic | Decision | Why |
|---|---|---|
| Recurring tasks | A task has an optional `recurrence` (daily, weekly on chosen weekdays, or monthly, every N, optional end date). Completing it creates the next occurrence as a new open task. No "infinite calendar" of future copies. | Todoist-style, simple, plays well with the planner and with undo; one real task at a time |
| Next occurrence | Pure `nextOccurrence`. Dates shift from the task's placed day, else its deadline, else the completion day. A timed task keeps its time. Month ends clamp (31 Jan + 1 month = 28/29 Feb). Checklist resets, actual time clears. | Predictable and testable |
| Projects | Named groups with a colour. A task belongs to at most one. Filter on Tasks, chip on rows, deleting a project keeps its tasks. | Smallest useful grouping |
| Templates | Saved task blueprints (title, length, priority, category, labels, notes, checklist steps, project). "Start from template" in the New task editor; "Save as template" on an existing task. | Covers repeatable work without a heavy feature |
| Where managed | One "Organize" dialog on Tasks with Projects and Templates tabs. | One entry point |
| Custom categories | Up to 8 extra categories (name and one of 8 colours) in Settings, Workspace. Built-in 8 stay. Deleting one moves its tasks to Work. | Task colours come from the existing 8 hues |
| Long-task blocks | When a task is longer than the maximum block, the planner splits it into blocks between the minimum and maximum, placed in separate slots. The first block keeps the task; the rest become new tasks "Title (2 of 3)". | Uses the existing min/max block settings honestly |
| Reminders | A reminder toast (inside Weekflow only) at the lead time before a timed task starts today, once per task and start time. Uses the existing Notifications settings. | No browser permission needed |

## Data compatibility
New task fields use schema defaults (`recurrence: null`, `projectId: null`), so tasks saved by earlier
versions still load. `category` becomes a free string; an unknown id (a deleted custom category) renders as Work.

## Out of scope
Editing one occurrence versus the series, calendar-wide "ghost" future occurrences, browser or email
notifications, template sharing, project-level deadlines, nested projects.
