/**
 * Turn a failure from the account service into one plain sentence that says
 * what happened and what to do. The service's own messages are not shown.
 */
export function friendlyAuthError(error: unknown): string {
  const e = (typeof error === "object" && error !== null ? error : {}) as { type?: string; code?: number; message?: string; safeMessage?: boolean };
  if (e.safeMessage && e.message) return e.message;
  switch (e.type) {
    case "user_invalid_credentials":
      return "That email and password do not match. Check them and try again.";
    case "user_already_exists":
    case "user_email_already_exists":
      return "There is already an account with that email. Try signing in instead.";
    case "user_not_found":
      return "We could not find an account with that email.";
    case "user_blocked":
      return "This account is closed.";
    case "password_recently_used":
    case "password_personal_data":
      return "Choose a different password. It looks too similar to an old one or to your details.";
    case "user_password_mismatch":
      return "The current password is not right.";
    case "user_invalid_token":
    case "user_invalid_code":
      return "This link has expired or was already used. Ask for a new one.";
    case "general_rate_limit_exceeded":
      return "Too many tries. Wait a minute and try again.";
    case "user_session_already_exists":
      return "You are already signed in.";
    case "general_argument_invalid":
      return "Please check what you entered and try again.";
  }
  if (e.code === 429) return "Too many tries. Wait a minute and try again.";
  if (e.code === 401) return "Your session has ended. Sign in again.";
  if (typeof navigator !== "undefined" && navigator.onLine === false) return "You are offline. Reconnect and try again.";
  return "Something went wrong on our side. Try again in a moment.";
}
