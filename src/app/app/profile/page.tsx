import type { Metadata } from "next";
import { ProfileScreen } from "@/screens/profile/profile-screen";

export const metadata: Metadata = { title: "Profile" };

// Private data loads after session validation.
export const instant = false;

export default function Page() {
  return <ProfileScreen />;
}
