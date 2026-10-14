import type { Metadata } from "next";
import { PlannedScreen } from "@/screens/planned-screen";

export const metadata: Metadata = { title: "Home" };

export default function Page() {
  return <PlannedScreen route="home" title="Home" />;
}
