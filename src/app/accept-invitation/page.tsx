import type { Metadata } from "next";
import { AcceptTeamInvitation } from "@/components/team/account-team";

export const metadata: Metadata = { title: "Accept invitation", referrer: "no-referrer", robots: { index: false, follow: false } };

export default function AcceptInvitationPage() {
  return <AcceptTeamInvitation />;
}
