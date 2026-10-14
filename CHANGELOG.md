# Changelog

Newest first. This file is the source of the in-app Version history and the
version timeline. Each entry is `## <version> — <title>`, then a `Date:` line,
a `Summary:` line, and bullet changes. `package.json` must match the newest entry.
Database schema migrations are tracked separately and never share this file.

## 0.0.7 — Repeat, organize and remind
Date: 2026-10-14
Summary: Repeating tasks, projects, templates, your own categories, long tasks split into blocks, and reminders inside Weekflow.

- Repeat: a task can repeat daily, weekly on chosen days, or monthly, every N, with an optional end date. Finishing it adds the next one
- Projects: group tasks with a colour, filter the Tasks page by project, and see the project on each task
- Templates: save any task as a template and start new tasks from it; two starters included
- Projects and templates are managed in one dialog on the Tasks page
- Your own categories (up to 8) in Settings, Workspace, alongside the built-in eight; deleting one moves its tasks to Work
- Long tasks: when a task is longer than your maximum block, Plan my week splits it into blocks placed one after another, and shows the split in the preview
- Reminders: a message inside Weekflow shortly before a timed task starts, once per task, using the lead time in Settings
- Settings text updated: block length and reminders are now live
- Guide: new entries for repeat, projects, templates, categories, blocks and reminders

## 0.0.6 — Guide and onboarding
Date: 2026-10-14
Summary: A guide to every part of Weekflow, help on every screen, and a Start here checklist on Home.

- Guide page: the big picture, a section for every screen, planner rules and a glossary, with live search and a contents list
- Help on every screen: press H or the ? button for what the page is, what to try first, shortcuts and the words used (the ? key still shows all shortcuts)
- (i) tips next to confusing words such as buffer, strict deadline, stability and inbox, in Settings, Plan my week, the rules bar and the inbox
- Start here on Home: a map of the app, a six-step checklist that ticks off as you really do each thing, and the words people trip on
- One short first-visit hint per screen, shown once
- Replay Start here from the Guide page
- Guide added to the sidebar, the phone More menu, the account menu, the command menu and the public footer

## 0.0.5 — Replanning and review
Date: 2026-10-14
Summary: Missed tasks get replanned, every bulk change can be rolled back, and a weekly review shows workload and progress.

- Missed tasks (their time passed without being done) can be replanned: preview from Home, or switch on "Replan missed tasks" in Plan my week
- Auto-rescheduling setting now works: "ask" shows a prompt on Home, "Replan automatically" does it once and offers Undo, "never" leaves it to you
- Schedule history: the schedule is saved before Plan my week, auto-replanning and each restore; restore any version with a preview of what moves, and undo the restore
- Restoring never touches locked or finished tasks and keeps your edits to titles, notes and checklists
- Weekly review page: workload by day against your daily limit, time by category, estimates versus actual time, and lists of completed, missed, still ahead and due soon
- Optional weekly review card on Home on the day you choose in Settings
- Review added to the sidebar and the phone More menu
- Settings now says plainly that task reminders arrive in 0.0.7

## 0.0.4 — Scheduling engine
Date: 2026-10-14
Summary: A deterministic planner that fits your inbox around your rules, shows its reasoning, and changes nothing until you apply it.

- Plan my week (button on Home and My Week, command menu, or the P key) previews a plan before anything moves
- Every placement answers "Why here?" in plain language: priority, deadline margin, prerequisites, preferred time and the slot rules
- Tasks that cannot fit are listed with the reason and what to change, never dropped silently
- Respects working days and hours, breaks, buffers, the daily limit, earliest start, deadlines (strict or soft) and dependencies
- Optional "Also fix conflicts" moves only unlocked tasks that break a rule; locked tasks never move
- Same inputs always give the same plan, whatever order the tasks arrive in; applying a plan twice changes nothing
- Apply is one step with Undo
- Preferred time of day (morning or afternoon) now steers where tasks land
- Settings text now states which engine options are active and which arrive later
- Engine covered by automated tests, including invariants over every demo scenario

## 0.0.3 — Landing page and public site
Date: 2026-10-14
Summary: A redesigned landing page with a public navbar, mobile menu and a phone-friendly footer.

- Centered hero with floating task cards over a faint calendar grid
- The real week calendar, read-only on sample data, as the product preview
- How it works, features with honest "Available now" and "Coming soon" tags, and a free-forever band
- Try-it-live theme, color, background and glass controls on the page
- Shipped and coming-next roadmap, and an FAQ
- Sticky glass navbar with a full-height mobile menu, theme toggle and one clear call to action
- Mobile footer with 44px links and safe-area padding, plus a bottom call to action that appears after the hero
- Floating card motion respects reduced-motion settings

## 0.0.2 — Tasks, week calendar and Home
Date: 2026-10-14
Summary: Create and organize tasks, plan your week on a calendar with drag, resize and locking, and see conflicts with suggested fixes on Home.

- Tasks: create, edit, complete, delete with undo, search, filters, inbox, subtasks, dependencies, labels, estimated vs actual time
- Quick-add understands "Write report 1h30 !high due fri"
- Week, day and agenda views with drag, resize, keyboard moves, working-hours shading, workload bars and a current-time line
- Unscheduled tray with drag-to-schedule and one-click "next free slot"
- Lock a task in place or pin it to a day so it never moves
- Home: greeting, weekly stats, conflicts with fixes you apply by hand, and Active Rules chips from your real settings
- Month Calendar page with workload per day
- Soft and frosted glass surfaces, with opacity solved per background so text stays readable
- Demo scenarios: a normal week, empty, overloaded, and conflicts
- Browser tab icon, and the tech stack removed from the public footer

## 0.0.1 — Foundation and design system
Date: 2026-10-14
Summary: Design tokens, 15 accent palettes, themes and backgrounds, navigation shell, Profile, Settings and the interactive demo.

- Design token system generated from OKLCH with WCAG AA contrast enforced for every palette in light and dark
- Light, Dark and System themes, 15 accent palettes, 12 page backgrounds, density and motion preferences, persisted per user
- Navigation shell: dark sidebar on desktop, bottom navigation on tablet and mobile, command palette and keyboard shortcuts
- Profile page with editable identity details
- Settings with ten categories, including Appearance, Scheduling engine rules, Calendar and Accessibility
- Version history timeline generated from this file
- Interactive demo at /demo with a state simulator for loading, error, offline and permission-denied screens
- Local-first data layer behind repository interfaces, ready for the Appwrite adapter
