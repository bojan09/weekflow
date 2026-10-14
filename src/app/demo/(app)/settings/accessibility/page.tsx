import type { Metadata } from "next";
import { SettingsScreen } from "@/screens/settings/settings-screen";

export const metadata: Metadata = { title: "Accessibility" };

export default function Page() {
  return <SettingsScreen section="accessibility" />;
}
