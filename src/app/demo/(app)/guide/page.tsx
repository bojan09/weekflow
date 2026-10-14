import type { Metadata } from "next";
import { GuideScreen } from "@/screens/guide/guide-screen";

export const metadata: Metadata = { title: "Guide" };

export default function Page() {
  return <GuideScreen />;
}
