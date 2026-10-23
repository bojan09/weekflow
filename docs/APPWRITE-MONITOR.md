# Appwrite Free plan monitor

Weekflow currently uses Appwrite. Appwrite's Free plan pauses projects after seven consecutive days without development activity in the Appwrite Console. Appwrite says normal application API/SDK traffic does not count as development activity, so a scheduled check does **not** keep a project active and must not be treated as a keep-alive.

The workflow reads the project's status and `consoleAccessedAt` timestamp once a day. It warns when the project is paused, the last Console access is at least five days old, or the check cannot authenticate. Visit the Appwrite Console and do actual project development work when prompted. This is monitoring only; it does not automate Console activity, create database writes, or guarantee availability.

## Configure GitHub Actions

1. In the Appwrite Console, create a project API key with only the `project.read` scope. Do not use an unrestricted key.
2. In the GitHub repository, open **Settings → Secrets and variables → Actions → New repository secret**.
3. Add these repository secrets:
   - `APPWRITE_ENDPOINT`: the Appwrite endpoint from Weekflow's server environment, for example `https://fra.cloud.appwrite.io/v1`.
   - `APPWRITE_PROJECT_ID`: the Appwrite project ID.
   - `APPWRITE_API_KEY`: the read-only key created above.
4. Open **Actions → Appwrite Free plan activity monitor → Run workflow** to test it manually. The workflow is scheduled daily at 08:17 UTC.
5. Check the run logs. A successful run means the status request worked and Console activity is recent; it does not guarantee the project will remain active.

Never paste secrets into workflow files, issues, or logs. Rotate the API key if it is exposed.

## Troubleshooting

- **Missing secret:** add the named secret under repository Actions secrets, then rerun the workflow.
- **HTTP 401/403:** verify the project ID and endpoint, and ensure the key has the `project.read` scope.
- **HTTP 404:** check that the endpoint includes `/v1` and the project ID is correct.
- **Stale Console activity:** open the Appwrite Console and do real development work. API calls from this GitHub workflow do not reset the inactivity timer.
- **Workflow is not listed:** confirm GitHub Actions is enabled and the workflow file exists on the default branch (`master`). Scheduled runs can be delayed by GitHub; use **Run workflow** for an immediate check.

## Supabase

Supabase is not configured in this repository, so this monitor makes no Supabase requests and needs no Supabase secrets. If Supabase is added later, review its then-current pause policy before adding a genuine health check; do not generate artificial user traffic.
