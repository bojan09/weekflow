# Account integration verification — 2026-10-16

Release 0.1.0 remains pending production configuration and inbox sign-off. No version increment has been claimed.

## Live service checks

Migration 002 was applied successfully to the existing database. It adds account and shared-workspace documents, preserves existing rows, and removes direct table-wide client writes.

Disposable identities were used for these passing checks:

- Sign-up, HttpOnly session cookie, authentication and sign-out revocation.
- Anonymous requests and cross-origin mutations denied.
- New accounts start without sample tasks, projects or identities.
- Personal data isolation and rejection of posted ownership fields.
- Stale revisions and simultaneous saves: exactly one same-revision save commits.
- Expected-account binding rejects an old tab targeting a different shared session.
- A real recovery token resets the password and cannot be reused; old passwords and invalid tokens fail.
- Permanent deletion requires the current password; a previously staged save cannot recreate deleted private data.
- Real team creation, projects, tasks and shared revisions.
- Outsiders cannot read a workspace; actual current memberships determine member/viewer permissions.
- Posted identity fields cannot grant ownership; viewers cannot write, members cannot promote themselves or delete protected tasks.
- Deleting one owner leaves another owner's workspace and shared tasks intact.
- Sole-owner deletion removes that disposable workspace; team actions never change personal tasks or protected time.

## Local browser checks

Final automated gates: **409 tests passed in 48 files**; TypeScript, ESLint and the production build passed. The build includes the protected account pages, authentication forms and all account/team API routes.

- Signed in through the real form, created a private task, reloaded, and found it on Tasks.
- Edited the real profile bio, reloaded, and confirmed persistence.
- Account navigation stays under `/app`; the demo banner and simulator are absent.
- Profile is usable at 375px without horizontal overflow; the account security fields have labels and real pending/error states.
- Account hints and Guide describe real controls instead of sample-role tools.
- Appearance, backgrounds and accents use the existing semantic token system; generation checks all 15 palettes and 2,186 contrast cases.

## Review corrections

Review found and prompted fixes for cross-account stale tabs, discarded queues on client navigation, demo preference restoration, deletion racing a save, and concurrent deletion rollback. Pending queues are account-scoped in memory; requests bind the intended account; deletion is exclusive and terminal markers cannot be reactivated. Invitation acceptance and ownership-sensitive deletion share the workspace membership lease.

## Remaining release checks

- Commit `541fdba` deployed successfully through the existing Vercel integration. `/sign-in` and `/api/auth/session` return successfully on production.
- The deployed sign-in page explicitly reports **accounts are not configured**. The local configuration was not present in Vercel's build environment. Add the values in `DEPLOYMENT.md` and redeploy.
- Vercel project settings require the owner's login in this browser session. A sign-in handoff was left open; no credentials were requested in chat.
- Follow verification, recovery and invitation emails in a real inbox. Automated one-time token checks prove the token flow, not actual inbox delivery.
- Complete the production steps in `DEPLOYMENT.md` before marking 0.1.0 released.

Final visual follow-up: the real Members/Projects/Shared Tasks layout needed an explicit column direction for its tab container. This was corrected and checked after a fresh browser load; the narrow member panel no longer crowds beside the tab bar.

Development follow-up: private leaf pages explicitly opt out of instant-navigation validation while their account data loads. The layout-level setting does not exempt child page segments in this framework version. A fresh unauthenticated development request produced the expected sign-in response without the dropped-segment notice.
