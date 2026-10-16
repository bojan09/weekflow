import type { Metadata } from "next";
import { WeekScreen } from "@/screens/week/week-screen";

export const metadata: Metadata = { title: "My Week" };

// Private data loads after session validation.
export const instant = false;

export default function Page() {
  return <WeekScreen />;
}
