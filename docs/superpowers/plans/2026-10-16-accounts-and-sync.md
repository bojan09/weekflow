# Accounts and sync implementation plan

User approved completing account setup, authentication, route protection, personal sync, server permissions and deployment validation on 2026-10-16.

## Design
- Preserve the demo and existing screens. Account routes live under `/app`.
- Use existing Appwrite project/database. Existing migration 001 is already applied; additional migrations are additive and inspect existing permissions before updating them.
- Sessions stay in HttpOnly, SameSite=Lax cookies; account/data API endpoints authorize each request and validate Origin for mutations. No user token or API key reaches client state.
- Use session clients for identity and a server-only API key only after authorization. Private tables have no public or table-wide read/write grants.
- Keep the existing synchronous Collection port with a scoped account adapter. Optimistic changes have visible pending/error state, serialized saves, revision conflicts and unsaved-change protection. Demo storage is never silently imported or shared with another account.
- Keep personal tasks private. Real workspace memberships determine identity/roles; the demo's View as control never grants account permissions. Validate changes through the shared pure permission rules and serialize them transactionally.
- Credentials remain in environment configuration. Ask only for missing hosting destination or service settings; do not invent a deployment target.

## Work
1. Inspect live project and existing schema; verify key capabilities without logging credentials.
2. Implement server session helpers, auth endpoints and forms, route guard and security controls.
3. Implement revision-checked personal adapters and per-user preferences/progress, with sync/error tests.
4. Implement workspace persistence, membership/invitation checks and server-authoritative role tests.
5. Run live tests against isolated disposable test identities, including cross-user denial and stale writes. Do not touch existing user data.
6. Verify build, lint, types, tests and browser flows; document deployment setup and any external blocker. Only mark 0.1.0 complete if required checks actually pass. Commit/push master under standing authorization.
