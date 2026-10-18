# Changelog

Newest first. This file is the source of the in-app Version history and the
version timeline. Each entry is `## <version> — <title>`, then a `Date:` line,
a `Summary:` line, and bullet changes. `package.json` must match the newest entry.
Database schema migrations are tracked separately and never share this file.

## Unreleased — Accounts and private planning

- Continue with Google on sign-in and sign-up, with protected one-time callbacks and the existing private session
- Authentication links and the brand sit on readable surfaces over every background
- Sign up, sign in, verify email, recover a password and manage account security
- Private personal tasks, projects, templates, schedule history, preferences and guide progress saved to an account
- Visible save status, stale-device protection and exportable pending changes
- Account-bound requests prevent an old tab from saving into another signed-in account
- Real team workspaces with invitations, roles, shared projects, assignments and comments
- Ownership safeguards preserve shared work during account deletion; personal protected time stays private
- The public demo remains separate, with account guidance reflecting real controls
- Team tabs stack their active content cleanly, with accurate workspace stats and member identities
- Account pages wait for private data without spurious navigation notices
- Release verification is in progress; the current app version remains unchanged until sign-off

## 0.0.16 — More project colors
Date: 2026-10-18
Summary: Give personal and shared projects their own colors with 16 solids and six gradients.

- Visual swatches with named colors, clear selection and keyboard access
- Sunset, Ocean, Aurora, Blossom, Forest and Twilight gradients
- Existing project colors are preserved; task categories keep their existing palette
- Project markers use the chosen color in task lists and shared projects

## 0.0.15 — More comfortable on phones
Date: 2026-10-16
Summary: A clearer mobile landing page and more room for everyday planning.

- Compact landing navigation, full-width phone menu with sign-in, and a readable sample day in the calendar preview
- Tighter mobile spacing across the hero, sections and footer
- Consistent page headers with search and account controls beside the title
- Task search stays visible, with additional filters behind a button showing the active count
- Compact week navigation and calendar controls fit narrow screens
- Bottom navigation steps aside while typing and returns when the field loses focus

## 0.0.14 — Task titles use available space
Date: 2026-10-16
Summary: Calendar titles wrap naturally instead of stopping after two lines.

- Taller task blocks show as many title lines as fit, while reserving room for the time and resize grip
- Short blocks retain their compact title treatment and full accessible details

## 0.0.13 — Clearer time intervals and task actions
Date: 2026-10-16
Summary: Show every selected minute interval on the calendar and edit or delete tasks directly from the list.

- Time spacing controls beside Home and My Week calendars offer 5, 10, 15 or 30 minutes
- Each interval has its own readable time label and gridline; task placement and resizing use the same scale
- Changing spacing preserves the time you were viewing
- Tasks have visible Edit and Delete buttons, with Undo after deletion
- Account loading uses a planner-shaped skeleton instead of a separate sign-in-style window; failures retain recovery controls
- Editor priority controls and project/category fields have room to fit cleanly

## 0.0.12 — A more comfortable planner
Date: 2026-10-16
Summary: Better mobile planning, clearer task editing, flexible time adjustments, sidebar colors and your own profile photo.

- Compact mobile dashboard, a single day selector and five navigation tabs, with Team under More
- My Week opens the current Monday–Sunday week and focuses the current or upcoming task
- Choose 5, 10, 15 or 30 minute increments for moving, resizing and adjusting tasks
- Start, end and duration stay in sync; editor changes preview the calendar before Save, and Cancel restores it
- Larger visible resize grips, quick delete on task blocks and Undo
- Choose Navy, Light, Accent or theme-matching sidebar colors
- Upload, preview, replace and remove a profile photo; account photos stay private
- Clear pointer cursors and a refined Google sign-in button

## 0.0.11 — A clearer calendar-first workspace
Date: 2026-10-16
Summary: Your calendar comes first, with quieter setup help, better-fitting task blocks and accent-colored scrollbars.

- Home shows a compact weekly summary and the calendar before attention items and optional setup help
- Preview a plan is available in the header; quick add sits below the calendar
- Setup shows only the next unfinished step; the full checklist, map and explanations remain in the Guide
- Calendar titles and time labels fit independently; narrow blocks show the start time and reveal full details on hover or keyboard focus
- Short task blocks reserve a resize strip on the right so titles stay readable without changing their time footprint
- Thin, rounded scrollbars follow the selected accent in both themes, with a system-color fallback for high-contrast mode
- Compact phone header and demo banner keep the schedule easier to reach

## 0.0.10 — Start here fixes
Date: 2026-10-15
Summary: Every step in the Start here checklist now does what it says.

- Add a task opens the new task form (it used to link to the page you were already on)
- Preview a plan opens the plan preview right away (it used to just open My Week)
- Lock a task takes you to Tasks, where each task's menu has Lock in place
- Each step now says in one line how to do it
- The map no longer lists Home, which you are already on, and now includes Team
- Tests check that no step points at the page you are on and that each button opens what it promises

## 0.0.9 — Polish and audit
Date: 2026-10-14
Summary: A full accessibility, mobile and theme audit of every screen, with the problems it found fixed.

- Audited every page in light and dark, on a phone and a desktop, with larger text, using axe-core: no violations remain
- Colour contrast checked for all 15 accent colours and all 12 backgrounds with every glass level, in both schemes: all pass
- Phone: pages no longer scroll sideways (Home, Tasks and Review header controls now wrap)
- Touch targets are at least 44px on phones and touch screens, including switches, colour swatches, task checkboxes and checklist items
- Larger text: week, month and review navigation, planning time fields and settings rows wrap instead of overflowing
- Each Settings pane has its own page title
- The demo start page lists what you can try today: the planner, Team and the Guide
- New automated accessibility checks on the main screens and dialogs, plus a repeatable browser audit script and a written report in the docs
- Known limits are documented: seven-column calendar cells on a phone are slightly narrower than 44px but much taller

## 0.0.8 — Team workspaces preview
Date: 2026-10-14
Summary: A free team workspace on sample data: shared tasks and projects, assignment, comments, people and roles, and team availability.

- Team page with Tasks, People and Availability. It is a preview on sample data: nothing is shared with anyone yet
- Shared projects and tasks with assignee, status, priority, deadline, length and notes, plus comments on every task
- Four roles (Owner, Admin, Member, Viewer) with a written permission model: members edit tasks they created or own and can only assign themselves, admins cannot change owners, and a workspace always keeps one owner
- View as: act as any sample person to see exactly what each role can and cannot do; refused actions explain why and change nothing
- People: change roles, invite by email (saved as a pending invitation, no email is sent) and remove people; their tasks are kept and unassigned
- Availability: each person's shared working hours by weekday, the hours everyone overlaps, and workload against a week of shared hours. Personal tasks and calendars are never shown or counted
- The same rules will be enforced on the server when accounts arrive
- Release notes and the public roadmap no longer name any tools or vendors
- Guide: Team section and the terms Role and Shared hours

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
- Local-first data layer behind repository interfaces, ready for a real database adapter
