import type { Metadata } from "next";
import { WeekScreen } from "@/screens/week/week-screen";

export const metadata: Metadata = { title: "My Week" };

export default function Page() {
  return <WeekScreen />;
}
