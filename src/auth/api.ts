export interface AuthUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
}

/** Session secrets stay in HttpOnly cookies, never in browser storage. */
async function request<T>(action: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/auth/${action}`, {
    method: body === undefined ? "GET" : "POST", credentials: "same-origin", cache: "no-store",
    ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  });
  const result = await response.json();
  if (!response.ok) throw Object.assign(new Error(result.message || "The request failed."), { code: response.status, type: result.type, safeMessage: true });
  return result as T;
}

export const currentUser = async (): Promise<AuthUser | null> => (await request<{ user: AuthUser | null }>("session")).user;
export const signIn = async (email: string, password: string): Promise<AuthUser> => (await request<{ user: AuthUser }>("sign-in", { email, password })).user;
export const signUp = async (name: string, email: string, password: string): Promise<AuthUser> => (await request<{ user: AuthUser }>("sign-up", { name, email, password })).user;
export const signOut = async (): Promise<void> => { await request("sign-out", {}); };
export const signOutEverywhere = async (): Promise<void> => { await request("sign-out-everywhere", {}); };
export const sendVerification = async (): Promise<void> => { await request("send-verification", {}); };
export const confirmVerification = async (userId: string, secret: string): Promise<void> => { await request("verify", { userId, secret }); };
export const requestRecovery = async (email: string): Promise<void> => { await request("recovery", { email }); };
export const confirmRecovery = async (userId: string, secret: string, password: string): Promise<void> => { await request("reset", { userId, secret, password }); };
export const changePassword = async (current: string, password: string): Promise<void> => { await request("password", { current, password, confirm: password }); };
export const renameAccount = async (name: string): Promise<AuthUser> => (await request<{ user: AuthUser }>("rename", { name })).user;
export const closeAccount = async (password: string): Promise<void> => { await request("delete", { password, confirm: "DELETE" }); };
