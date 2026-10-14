# 0.1.0 plan: accounts, database and server-side permissions

Status: **waiting on the owner.** This phase needs an Appwrite project and credentials, which only the
owner can create. Everything before it (0.0.1 to 0.0.9) is built and verified on a local data layer.

## What the owner needs to provide
1. An **Appwrite Cloud project**: its endpoint, project ID, and a database ID.
2. A **server API key** for migrations and Functions (scopes listed below). Keep it out of the repo; it
   goes in Vercel environment variables only.
3. Decisions (each has a default, so a plain "go ahead" is enough):
   - Sign-in methods. Default: email and password, with email verification and password reset.
   - Social sign-in (Google, GitHub)? Default: not in 0.1.0.
   - Should the demo stay available without an account? Default: yes, `/demo` keeps working on local data.
   - Allowed sign-up domains or open sign-up? Default: open.
4. The Vercel project for hosting, and which URL is the production origin (for Appwrite platform and CORS).

## Environment variables
`NEXT_PUBLIC_APPWRITE_ENDPOINT`, `NEXT_PUBLIC_APPWRITE_PROJECT_ID`, `APPWRITE_DATABASE_ID` (server only),
`APPWRITE_API_KEY` (server only, never `NEXT_PUBLIC_`).

## Data mapping
The screens already read and write through the `Collection<T>` port (`src/data/collection.ts`). Each local
collection gets an Appwrite adapter with the same interface, so no screen changes.

| Local collection | Appwrite collection | Document permission |
|---|---|---|
| tasks | `tasks` (one document per task, `ownerId`) | read/update/delete: the owner only |
| projects, templates | `projects`, `templates` | owner only |
| schedule history | `schedule_snapshots` | owner only |
| profile and preferences | `profiles` (one per user) | owner only |
| guide progress | `profiles.guide` field | owner only |
| team workspace | Appwrite **Teams** (members and roles) plus `team_tasks`, `team_projects`, `team_comments`, `team_invitations` | team roles; see below |

Indexes: `tasks(ownerId, status)`, `tasks(ownerId, placement.date)`, `team_tasks(teamId, status)`.
Schema migrations live in a numbered `migrations/` folder and are tracked separately from the changelog.

## Authorization (server-side is authoritative)
- Personal data: document-level permissions `Role.user(ownerId)` only. No collection-level read.
- Team data: collection permissions by team role, plus a Function that runs the same pure rules as
  `src/domain/team/permissions.ts` before any write (`can`, `canEditTask`, `canAssign`, `canChangeRole`,
  `canRemoveMember`, and the last-owner invariant). The screens keep mirroring these rules to disable
  what a person cannot do, but they are never the only check.
- Availability shows shared working hours only; personal tasks and calendars are never readable by the team.
- Invitations become real: Appwrite team invites by email replace the pending list in the demo.

## Steps
1. Auth: sign-up, sign-in, sign-out, verify email, reset password, protected `/app` routes, session in
   cookies, redirect rules. `/demo` stays local.
2. Adapters and migrations for personal collections; one-time import of the local demo data on first sign-in.
3. Team: Appwrite Teams, collections, the authorization Function, real invitations.
4. Permission tests that run against the Function with each role, plus the existing pure tests.
5. Replace "preview on sample data" wording on the Team page and landing page once it is real.
6. Update the Guide (sign-in, sync, sharing) and run the 0.0.9 audit sweep on the new screens.

## Out of scope for 0.1.0
Realtime updates and the security and performance audit are 0.1.1.
