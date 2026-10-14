import type { Metadata } from "next";
import { PlannedScreen } from "@/screens/planned-screen";

export const metadata: Metadata = { title: "Team" };

export default function Page() {
  return <PlannedScreen route="team" title="Team" />;
}
