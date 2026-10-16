import type { AppRoute } from "@/lib/routes";
import type { GuideSection } from "./types";

/**
 * The Guide, in reading order. This one list feeds the Guide page, the help
 * panel, the first-visit hints and the Start here map. Every app route has
 * exactly one section (a test enforces it), so a new screen cannot ship
 * without its guide entry.
 */
export const SECTIONS: readonly GuideSection[] = [
  {
    id: "overview",
    title: "The big picture",
    route: "guide",
    summary: "What Weekflow is and where everything lives.",
    hint: "This is the Guide. Search it, or jump to any part from the contents.",
    whatItIs:
      "Weekflow is a weekly planner. You capture tasks, tell it your working hours and limits, and it helps you fit the work into a week you can actually keep. You are always in charge: it suggests, you decide.",
    steps: [
      { text: "Home shows your week at a glance, your conflicts and your rules.", to: { route: "home", label: "Open Home" } },
      { text: "My Week is where you plan: drag tasks onto a calendar.", to: { route: "week", label: "Open My Week" } },
      { text: "Tasks is the full list, with search, filters and the inbox.", to: { route: "tasks", label: "Open Tasks" } },
      { text: "Calendar shows the whole month.", to: { route: "calendar", label: "Open Calendar" } },
      { text: "Review shows how the week went.", to: { route: "review", label: "Open Review" } },
      { text: "Settings holds your rules: hours, breaks, limits and the planner.", to: { route: "settings", label: "Open Settings" } },
    ],
    tips: [
      "Nothing is final. Plans are previewed first, and changes can be undone.",
      "Press / or Ctrl+K to search for any page or command.",
      "This demo keeps your data in this browser only. Nothing is sent anywhere.",
    ],
    shortcuts: [
      { keys: "/ or Ctrl+K", label: "Search and commands" },
      { keys: "H", label: "Help for the page you are on" },
    ],
    terms: ["engine"],
    tryIt: { route: "home", label: "Go to Home" },
  },
  {
    id: "home",
    title: "Home",
    route: "home",
    summary: "Your week at a glance, with conflicts and your active rules.",
    hint: "Home is your overview. Anything that needs attention shows up here first.",
    whatItIs:
      "Home puts your calendar first, with a compact weekly summary. Preview a plan from the header, add tasks below the calendar, and check anything that needs attention beside or below it. Optional setup help shows just your next step; the full checklist is in this Guide.",
    steps: [
      { text: "Read the four numbers at the top: tasks, completed, overdue and free time." },
      { text: "Use Quick add to drop a task into your inbox in one line." },
      { text: "Press Preview a plan in the header to propose times for your inbox. Nothing changes until you apply it." },
      { text: "Check Scheduling conflicts and press a fix button to apply it." },
    ],
    tips: [
      "Quick add understands 'Write report 1h30 !high due fri'.",
      "A banner appears if tasks ran past their time and you chose to be asked first.",
      "Active Rules lists only the rules that are really switched on.",
    ],
    shortcuts: [
      { keys: "C", label: "New task" },
      { keys: "P", label: "Plan my week" },
    ],
    terms: ["conflict", "inbox"],
    tryIt: { route: "home", label: "Go to Home" },
  },
  {
    id: "week",
    title: "My Week",
    route: "week",
    summary: "Plan your week by dragging tasks onto a calendar.",
    hint: "Drag a task onto the calendar. Press L on a selected task to lock it.",
    whatItIs:
      "My Week is your planning table. Tasks without a time wait in the Unscheduled list. Drag them onto a day, move them around, and pull the bottom edge to change how long they take.",
    steps: [
      { text: "Drag a task from Unscheduled onto a day and time, or press Schedule to use the next free slot." },
      { text: "Drag a block to move it, or pull its bottom edge to resize it." },
      { text: "Lock a task that must not move, from its lock button or the L key." },
      { text: "Switch between Day, Week and Agenda views at the top." },
      { text: "Press Plan my week to have the planner fill your free time." },
    ],
    tips: [
      "Everything also works by keyboard: Enter to edit, arrows to move, Shift plus arrows to resize.",
      "Shaded areas are outside your working hours. You can still place tasks there, but you will get a warning.",
      "The bar under each day shows how full it is against your daily limit.",
      "Narrow blocks show a shorter time label. Hover or focus a task to read its full title and time range; press Enter to edit it.",
    ],
    shortcuts: [
      { keys: "[ and ]", label: "Previous and next week" },
      { keys: ".", label: "Jump to today" },
      { keys: "L", label: "Lock or unlock the selected task" },
      { keys: "Shift + arrows", label: "Resize the selected task" },
    ],
    terms: ["lock", "inbox", "daily-limit"],
    tryIt: { route: "week", label: "Open My Week" },
  },
  {
    id: "tasks",
    title: "Tasks",
    route: "tasks",
    summary: "Every task in one list, with search, filters and checklists.",
    hint: "Search or filter your tasks. Tick the circle to complete one.",
    whatItIs:
      "Tasks is the complete list. Each task can have a length, a priority, a category, a deadline, notes, a checklist and dependencies on other tasks.",
    steps: [
      { text: "Press New task, or type in Quick add, to capture something." },
      { text: "Search by title and filter by status, priority or category." },
      { text: "Open a task to add a deadline, notes, a checklist or a dependency." },
      { text: "Tick a task to complete it. You can add the time it really took, to learn from your estimates." },
      { text: "Set Repeat in the editor for something that comes back, such as a weekly report. Finishing it adds the next one." },
      { text: "Group tasks into projects, and save tasks you create often as templates, from Projects and templates." },
    ],
    tips: [
      "Deleting asks nothing, because it can always be undone from the message that appears.",
      "A task that depends on another cannot be planned before it.",
      "Reopening a repeating task does not remove the next one. Use Undo right after finishing instead.",
      "Add your own categories in Settings, Workspace. Deleting one moves its tasks to Work.",
    ],
    shortcuts: [{ keys: "C", label: "New task" }],
    terms: ["inbox", "lock", "repeat", "project", "template"],
    tryIt: { route: "tasks", label: "Open Tasks" },
  },
  {
    id: "calendar",
    title: "Calendar",
    route: "calendar",
    summary: "The whole month, with how busy each day is.",
    hint: "Pick a day to open it in My Week. Colours show how full each day is.",
    whatItIs:
      "Calendar is the month view. Each day shows its tasks and a fullness bar. Use it to spot heavy weeks and to jump to a day.",
    steps: [
      { text: "Use the arrows to change month." },
      { text: "Select a day to open it in My Week." },
      { text: "Filter by category to see one kind of work." },
    ],
    tips: ["A full or overloaded day is marked with text as well as colour."],
    shortcuts: [],
    terms: ["daily-limit"],
    tryIt: { route: "calendar", label: "Open Calendar" },
  },
  {
    id: "planning",
    title: "Planning and rules",
    summary: "How Plan my week decides, and the rules you control.",
    hint: "Plan my week shows a preview with a reason for every choice.",
    whatItIs:
      "Plan my week is a deterministic planner: the same tasks and rules always give the same plan. It places tasks by priority and deadline, in the first free time that respects your working hours, breaks, buffers, daily limit, dependencies and deadlines. It changes nothing until you press Apply, and you can undo.",
    steps: [
      { text: "Press Plan my week, from Home, My Week, the command menu or the P key." },
      { text: "Read the preview. Open 'Why here?' on any task to see the reasons." },
      { text: "Optionally switch on 'Also fix conflicts' to let it move unlocked tasks that break a rule." },
      { text: "Press Apply plan, or Cancel. Applying can be undone straight away." },
      { text: "Change the rules whenever you like.", to: { route: "settings", sub: "engine", label: "Open the scheduling rules" } },
    ],
    tips: [
      "Tasks that cannot fit are listed with the reason, never dropped silently.",
      "Locked tasks never move, whatever you choose.",
      "Preferring mornings or afternoons is a soft preference, not a rule.",
      "A task longer than your maximum block is split into blocks placed one after another. The first block keeps the task and the others become new tasks, such as Report (2 of 3).",
    ],
    shortcuts: [{ keys: "P", label: "Plan my week" }],
    terms: ["engine", "buffer", "daily-limit", "strict-deadline", "soft-deadline", "stability", "focus-time", "block", "lock"],
    tryIt: { route: "settings", sub: "planning", label: "Open planning preferences" },
  },
  {
    id: "replan",
    title: "Replanning and history",
    summary: "What happens when tasks slip, and how to go back.",
    hint: "Missed tasks can be replanned. Schedule history lets you roll back.",
    whatItIs:
      "A task is missed when its time passes without it being done. Weekflow can replan those tasks for you, either after asking or automatically, and it saves your schedule before every bulk change so you can restore it.",
    steps: [
      { text: "Choose how it behaves in Settings, Scheduling engine: never, ask first, or automatic." },
      { text: "When asked first, a banner on Home offers a preview of a new plan." },
      { text: "Open Schedule history from the Review page or the command menu to restore an earlier version." },
    ],
    tips: [
      "Restoring keeps your edits to titles and notes, and leaves locked and finished tasks alone.",
      "A restore is itself saved, so you can undo it.",
    ],
    shortcuts: [],
    terms: ["missed", "schedule-history"],
    tryIt: { route: "settings", sub: "engine", label: "Open the scheduling rules" },
  },
  {
    id: "review",
    title: "Weekly review",
    route: "review",
    summary: "How the week went: workload, progress and what slipped.",
    hint: "See your workload, what got done and what slipped. Replan from here.",
    whatItIs:
      "The review shows workload per day against your limit, where the time went by category, how your estimates compared with reality, and lists of completed, missed, upcoming and due-soon tasks.",
    steps: [
      { text: "Look at Workload by day. The line marks your daily limit." },
      { text: "Check Missed, and press Replan missed tasks if any slipped." },
      { text: "Open Schedule history to go back to an earlier plan." },
    ],
    tips: [
      "Turn on the weekly review reminder in Settings, Notifications, to see a card on Home on the day you choose.",
      "Estimates versus reality needs the actual time on finished tasks.",
    ],
    shortcuts: [],
    terms: ["daily-limit", "missed", "schedule-history"],
    tryIt: { route: "review", label: "Open the review" },
  },
  {
    id: "settings",
    title: "Settings",
    route: "settings",
    summary: "Your hours, limits and how the planner behaves.",
    hint: "Changes save as you make them. Look for the (i) next to unfamiliar words.",
    whatItIs:
      "Settings holds your preferences. Planning preferences covers working days, hours, breaks, buffers and the daily limit. Scheduling engine covers how the planner decides. Appearance has themes, 15 colours, 12 backgrounds and glass surfaces.",
    steps: [
      { text: "Start with Planning preferences: set your days, hours and breaks.", to: { route: "settings", sub: "planning", label: "Open Planning preferences" } },
      { text: "Then Scheduling engine: choose strict or soft deadlines and how much to prefer stability.", to: { route: "settings", sub: "engine", label: "Open Scheduling engine" } },
      { text: "Make it yours in Appearance.", to: { route: "settings", sub: "appearance", label: "Open Appearance" } },
      { text: "Add your own task categories in Workspace.", to: { route: "settings", sub: "workspace", label: "Open Workspace" } },
      { text: "Choose reminders in Notifications: a message inside Weekflow shortly before a timed task starts.", to: { route: "settings", sub: "notifications", label: "Open Notifications" } },
    ],
    tips: [
      "Each section can be reset to its defaults.",
      "Reminders only appear while Weekflow is open. Nothing is sent to your browser or email.",
    ],
    shortcuts: [],
    terms: ["buffer", "daily-limit", "strict-deadline", "soft-deadline", "stability", "focus-time"],
    tryIt: { route: "settings", sub: "planning", label: "Open Planning preferences" },
  },
  {
    id: "profile",
    title: "Profile",
    route: "profile",
    summary: "Your name, avatar and demo account details.",
    hint: "Your details live in this browser only. Accounts arrive in a later release.",
    whatItIs: "Profile holds your name and contact details. In the demo they stay in your browser.",
    steps: [{ text: "Edit your name and details, then save." }],
    tips: ["Sign-in and real accounts arrive with the database release."],
    shortcuts: [],
    terms: [],
    tryIt: { route: "profile", label: "Open Profile" },
  },
  {
    id: "team",
    title: "Team",
    route: "team",
    summary: "Shared projects, tasks and comments, kept apart from your personal plan.",
    hint: "Try View as to see what each role can and cannot do.",
    whatItIs:
      "Team is a free shared workspace: shared projects, tasks you can assign, comments, and a view of when everyone is working. It is a preview on sample data for now, and real sharing arrives with accounts. Your personal tasks and calendar are never shown to the team, and team planning never books time in your personal planner.",
    steps: [
      { text: "Use View as to act as the owner, an admin, a member or a viewer, and see what each can do." },
      { text: "On Tasks, add a task, assign it, change its status, and open it to comment." },
      { text: "On People, change roles, invite someone by email, or remove a person." },
      { text: "On Availability, see everyone's shared hours, the hours you all overlap, and each person's workload." },
    ],
    tips: [
      "Members can edit tasks they created or are assigned to, and can only assign tasks to themselves.",
      "A workspace always keeps at least one owner. Admins cannot change owners.",
      "Removing a person keeps their tasks, now unassigned.",
      "In the demo the screen enforces these rules. With accounts they are also enforced on the server.",
    ],
    shortcuts: [],
    terms: ["role", "shared-hours"],
    tryIt: { route: "team", label: "Open Team" },
  },
  {
    id: "changelog",
    title: "Version history",
    route: "changelog",
    summary: "Everything that changed in each release.",
    hint: "Each release lists what was added. The newest is at the top.",
    whatItIs: "Version history is the log of every release, newest first, with a short summary and the changes in each.",
    steps: [{ text: "Scroll the timeline, or open an older release." }],
    tips: ["The version shown in the sidebar matches the newest entry here."],
    shortcuts: [],
    terms: [],
    tryIt: { route: "changelog", label: "Open Version history" },
  },
  {
    id: "shortcuts",
    title: "Keyboard shortcuts",
    summary: "Every shortcut in one place.",
    hint: "Press ? any time to see every keyboard shortcut.",
    whatItIs: "Shortcuts are switched off while you type in a field. Press ? to see the full list in a dialog.",
    steps: [
      { text: "Go to a page with G then a letter, for example G then W for My Week." },
      { text: "Press C to add a task, P to plan, H for help, / to search." },
    ],
    tips: ["On the calendar, [ and ] change week and . jumps to today."],
    shortcuts: [
      { keys: "?", label: "Show all shortcuts" },
      { keys: "H", label: "Help for this page" },
      { keys: "C", label: "New task" },
      { keys: "P", label: "Plan my week" },
      { keys: "G then H, W, T, C, R, M, P, S, U, V", label: "Go to a page" },
    ],
    terms: [],
  },
];

const BY_ID = new Map(SECTIONS.map((s) => [s.id, s]));
const BY_ROUTE = new Map(SECTIONS.flatMap((s) => (s.route ? [[s.route, s] as const] : [])));

export function sectionById(id: string): GuideSection | undefined {
  return BY_ID.get(id);
}

/** The section that describes a screen. Every route has one (tested). */
export function sectionForRoute(route: AppRoute): GuideSection {
  const section = BY_ROUTE.get(route);
  if (!section) throw new Error(`No guide section for route: ${route}`);
  return section;
}

/** Account guidance describes live controls; sample-role tools stay in the demo. */
export function accountGuide(section: GuideSection): GuideSection {
  if (section.id === "overview") return { ...section, tips: ["Plans are previewed first, and changes can be undone.", "Press / or Ctrl+K to search for any page or command.", "Your planner saves privately to your account. Check the save status before closing a tab."] };
  if (section.id === "profile") return { ...section,
    summary: "Your personal details and account security.", hint: "Edit your profile, verify your email, or manage your password and sessions.",
    whatItIs: "Profile holds your name, bio, time zone and locale. Account security below it lets you verify your email, change your password, sign out of devices, or permanently delete your account.",
    steps: [{ text: "Edit your name, bio, time zone or locale and press Save." }, { text: "Use Account security below your details to manage verification, password and sessions." }],
    tips: ["Your email and joined date belong to your account.", "Deletion requires your password and typed confirmation. Make another team member an owner before leaving a shared workspace you own."] };
  if (section.id === "team") return { ...section,
    hint: "Create a workspace or choose one you belong to. Your real membership controls what you can change.",
    whatItIs: "Team workspaces share projects, assigned tasks and comments with invited people. Personal tasks and protected calendar time stay private. Shared tasks do not automatically reserve time in a personal calendar.",
    steps: [{ text: "Create a workspace, or accept an invitation sent to your email." }, { text: "Add projects and shared tasks. Open a task to assign it, set a deadline, change its status or comment." }, { text: "Owners with verified email addresses can send invitations. Roles and membership changes are checked on the server." }, { text: "Refresh the workspace to see another person's latest changes. A stale edit must be refreshed before retrying." }],
    tips: ["Members can edit tasks they created or are assigned to, and can only assign work to themselves.", "Viewers can read shared work; owners and admins manage it.", "A workspace keeps at least one owner. Personal protected time is never changed by team actions."], terms: ["role"] };
  return section;
}
