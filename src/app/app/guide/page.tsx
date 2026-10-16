import type { Metadata } from "next";
import { GuideScreen } from "@/screens/guide/guide-screen";

export const metadata: Metadata = { title: "Guide" };

// Private data loads after session validation.
export const instant = false;

export default function Page() {
  return <GuideScreen />;
}
