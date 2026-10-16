import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthScreen } from "@/components/auth/auth-screens";

export const metadata: Metadata = { title: "Sign in" };

export default function Page() {
  return <Suspense fallback={<p role="status" className="p-6 text-center">Loading…</p>}><AuthScreen mode="sign-in" /></Suspense>;
}
