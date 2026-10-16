import type { Metadata } from "next";
import { AccountTeam } from "@/components/team/account-team";

export const metadata: Metadata = { title: "Team" };

export default function Page() {
  return <AccountTeam />;
}
