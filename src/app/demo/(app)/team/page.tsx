import type { Metadata } from "next";
import { TeamScreen } from "@/screens/team/team-screen";

export const metadata: Metadata = { title: "Team" };

export default function Page() {
  return <TeamScreen />;
}
