import type { Metadata } from "next";
import { HomeScreen } from "@/screens/home/home-screen";

export const metadata: Metadata = { title: "Home" };

// Private data loads after session validation.
export const instant = false;

export default function Page() {
  return <HomeScreen />;
}
