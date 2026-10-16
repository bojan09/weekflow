import { Suspense, type ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireUser, publicUser } from "@/server/appwrite";
import { HttpError } from "@/server/http";
import { AccountProvider } from "@/components/auth/account-provider";
import { AppShell } from "@/components/shell/app-shell";

export const instant = false;

async function Authenticated({ children }: { children: ReactNode }) {
  let current;
  try { current = await requireUser(); }
  catch (error) { if (error instanceof HttpError && error.status === 401) redirect("/sign-in"); throw error; }
  return <AccountProvider user={publicUser(current.user)}><AppShell>{children}</AppShell></AccountProvider>;
}

export default function AccountLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={<p role="status" className="p-8">Opening your planner…</p>}><Authenticated>{children}</Authenticated></Suspense>;
}
