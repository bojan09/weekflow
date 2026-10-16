/**
 * Where the account service lives. These two values are public by design (they
 * identify the project, they grant nothing). next.config.ts copies them from
 * APPWRITE_ENDPOINT and APPWRITE_PROJECT_ID, so there is one place to set them.
 * The server API key is never exposed to the browser.
 */
export const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ?? "";
export const APPWRITE_PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ?? "";
export const DATABASE_ID = "weekflow";

/** False when this deployment has no account service configured; the demo still works. */
export const ACCOUNTS_ENABLED = APPWRITE_ENDPOINT !== "" && APPWRITE_PROJECT_ID !== "";
