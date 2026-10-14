# 0.0.8: Team workspaces (UI on mock data, permission model designed in)

Status: decided by the assistant under the owner's instruction "continue with every phase that doesn't
require my input" (2026-10-14). No owner choices were needed. The owner can overrule any of these later.

## Goal
Show what a free team workspace looks like and how permissions behave, using local mock data, so the
design is settled before Appwrite arrives in 0.1.0. Nothing here is real collaboration. The landing page
keeps its "Coming soon" tag for team workspaces.

## Decisions
| Topic | Decision | Why |
|---|---|---|
| Privacy | Team tasks are a separate collection. Personal tasks, calendars and the planner never mix with them. Team availability shows only the working hours a member shares. | The spec: team scheduling never overrides personal time |
| Roles | Owner, Admin, Member, Viewer | Smallest set that exercises real rules |
| Permission model | One pure module, `can(role, action, context)`, plus invariant checks (last owner, admins cannot touch owners). Every team operation checks it and returns `{ ok: false, reason }` instead of changing anything. | This module moves to the server in 0.1.0 as the authoritative check; the screen only mirrors it |
| Demo | A "View as" switch changes which mock member you are, so every role's view can be tried. Labelled as a demo tool. | Without accounts there is no other way to show permissions |
| Screens | One Team page with four tabs: Tasks, Members, Availability, About the demo | One entry point |
| Tasks | Shared projects, assignee, status (todo, doing, done), priority, deadline, length, comments | The roadmap line: shared projects and tasks, assignment, comments |
| Availability | Each member's shared working hours per weekday as bars, the hours everyone overlaps, and workload (assigned open minutes against weekly capacity) | "Team availability and workload" |
| Invites | Inviting by email adds a pending invitation (no email is sent). An admin can cancel it. | Honest: the demo cannot send mail |

## Roles and rules
| Action | Owner | Admin | Member | Viewer |
|---|---|---|---|---|
| Rename or delete the workspace | yes (delete: owner only) | rename only | no | no |
| Invite, cancel invites, remove members | yes | yes (not owners) | no | no |
| Change roles | yes | yes (not owners, cannot make owners) | no | no |
| Create, rename, delete shared projects | yes | yes | no | no |
| Create tasks | yes | yes | yes | no |
| Edit any task, assign anyone, delete any task | yes | yes | no | no |
| Edit a task you created or are assigned to, and set its status | yes | yes | yes | no |
| Comment | yes | yes | yes | no |
| Delete a comment | any | any | own | none |

Invariants: a workspace always has at least one owner; nobody can remove or demote the last owner; you
cannot change your own role; a member cannot assign a task to someone else.

## Data
`TeamState`: workspace, members (id, name, email, role, colour, shared hours per weekday), invitations,
projects, tasks (with comments), `viewerId` (the demo "View as"). Stored in `weekflow:demo:team`,
validated with Zod, seeded with a small realistic team.

## Out of scope
Real sign-in, real invitations, notifications, team calendar sync, assigning work into someone's
personal planner, time zones per member, file attachments, activity feed.

## Testing
Pure tests for the permission matrix, invariants, every team operation (allowed and denied),
availability overlap and workload. UI tests for role-based disabling, comments and invitations.
Browser axe scan on every tab at desktop and phone widths.
