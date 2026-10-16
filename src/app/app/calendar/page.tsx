import type { Metadata } from "next";
import { CalendarScreen } from "@/screens/calendar/calendar-screen";

export const metadata: Metadata = { title: "Calendar" };

// Private data loads after session validation.
export const instant = false;

export default function Page() {
  return <CalendarScreen />;
}
