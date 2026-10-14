import type { Metadata } from "next";
import { PlannedScreen } from "@/screens/planned-screen";

export const metadata: Metadata = { title: "My Week" };

export default function Page() {
  return <PlannedScreen route="week" title="My Week" />;
}
