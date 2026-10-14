import type { Metadata } from "next";
import { PlannedScreen } from "@/screens/planned-screen";

export const metadata: Metadata = { title: "Calendar" };

export default function Page() {
  return <PlannedScreen route="calendar" title="Calendar" />;
}
