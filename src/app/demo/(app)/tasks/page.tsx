import type { Metadata } from "next";
import { PlannedScreen } from "@/screens/planned-screen";

export const metadata: Metadata = { title: "Tasks" };

export default function Page() {
  return <PlannedScreen route="tasks" title="Tasks" />;
}
