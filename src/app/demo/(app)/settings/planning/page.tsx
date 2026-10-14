import type { Metadata } from "next";
import { SettingsScreen } from "@/screens/settings/settings-screen";

export const metadata: Metadata = { title: "Planning preferences" };

export default function Page() {
  return <SettingsScreen section="planning" />;
}
