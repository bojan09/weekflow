import type { Metadata } from "next";
import { AccountTeam } from "@/components/team/account-team";

export const metadata: Metadata = { title: "Team" };

// Private data loads after session validation.
export const instant = false;

export default function Page() {
  return <AccountTeam />;
}
