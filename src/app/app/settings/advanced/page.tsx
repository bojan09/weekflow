import type { Metadata } from "next";
import { SettingsScreen } from "@/screens/settings/settings-screen";

export const metadata: Metadata = { title: "Advanced" };

// Private data loads after session validation.
export const instant = false;

export default function Page() {
  return <SettingsScreen section="advanced" />;
}
