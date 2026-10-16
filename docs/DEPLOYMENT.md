# Account deployment

Production destination: https://weekflow-ashy.vercel.app

## Configuration

Use Node 22 or newer. In the existing Vercel project, keep production deployments on `master` and set these environment variables:

| Variable | Value |
| --- | --- |
| `APPWRITE_ENDPOINT` | The configured regional API endpoint |
| `APPWRITE_PROJECT_ID` | The existing project ID |
| `APPWRITE_DATABASE_ID` | `weekflow` |
| `APPWRITE_API_KEY` | Server key; never a public variable |
| `APP_URL` | `https://weekflow-ashy.vercel.app` |

The public endpoint and project ID are derived at build time. Redeploy after changing them. No secret belongs in Git, browser storage, or public variables. Configure a separate project and key for preview deployments before permitting account testing there; production `APP_URL` intentionally rejects other origins.

The server key needs the Users, Sessions, Teams and TablesDB row/transaction operations used by the application. Migration additionally needs database, table, column and index management. Prefer a separate migration key and remove schema-management scopes from the runtime key after deployment. Do not grant API-key management scopes.

Register `weekflow-ashy.vercel.app` as a Web platform in the account service and confirm outbound verification, recovery and invitation email delivery. Register `localhost` for development. Check the redirect allow-list; links must return to `/verify`, `/reset-password`, and `/accept-invitation` on the intended origin.

## Database

Run `npm run db:migrate` with the migration environment. Migration 002 adds `account_data` and `team_states`; it preserves existing rows and removes table-wide client creation permissions. Rows are readable only by their owner or workspace members. Application writes are server-authorized.

Personal collections use one versioned document per resource and account. This preserves the existing collection interface and keeps each save atomic without hundreds of per-task requests. A revision conflict stops saving rather than overwriting a newer device's data. Pending changes remain in the open tab and can be exported. Account data is not stored in demo local storage. Scheduling remains on the existing pure engine.

Every personal request includes the expected account ID and checks it against the authenticated session. A cookie change in another tab cannot redirect a queued save to another account. Pending queues remain scoped in memory through client navigation; full-page exits prompt while anything is unsaved.

Deletion has an exclusive operation marker shared with save transactions. A terminal, non-content tombstone prevents already-authenticated requests from recreating private data after deletion. Membership changes, invitation acceptance and sole-owner workspace deletion share a workspace lease. Shared work is preserved when another owner remains.

Authentication attempts use transactional, server-only rate counters shared across workers. Vercel's overwritten forwarding header supplies the client address; only a keyed digest is stored. Self-hosted environments use a conservative shared bucket until a trusted proxy identity is configured. These are abuse protections, not product feature limits.

## Verification

1. Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`.
   With a running configured test server, `node scripts/verify-live-accounts.cjs http://localhost:3113` creates disposable identities, verifies real sessions, recovery, isolation, concurrent saves and deletion, then removes only those identities and their data. It never prints passwords or tokens. Supply the production origin only when intentionally testing that deployment.
2. Deploy the verified commit from `master` through the existing Vercel integration.
3. Open `/app/home` signed out: it must redirect to `/sign-in`.
4. Create a test account. Confirm the new planner is empty and no demo identity appears. Follow its verification email.
5. Add a task and change appearance. Reload, then sign in on another device; both changes must persist. A second account must see neither.
6. Keep two tabs open; save the same resource from both. The stale tab must show a conflict and offer export, without claiming it saved.
7. Request password recovery and follow the emailed link. Confirm the old password fails and the new password succeeds. Sign out of all devices and confirm the other session is denied.
8. Create a workspace, invite a second verified account and accept its email link. Check member/viewer restrictions and the last-owner protection. Personal protected time must remain unchanged.
9. Delete only a disposable test account using its password and typed confirmation. Confirm it can no longer sign in and its personal rows are removed. Workspace owners must resolve shared ownership first.

## Deployment limits

Email delivery requires an actual inbox and provider configuration; an invalid-token automated check does not prove delivery or successful recovery. A successful local production build does not prove the deployed service has its environment variables. Verify the production URLs and the exact deployed commit before marking the release complete.
