import type { Metadata } from "next";
import { ReviewScreen } from "@/screens/review/review-screen";

export const metadata: Metadata = { title: "Weekly review" };

// Private data loads after session validation.
export const instant = false;

export default function Page() {
  return <ReviewScreen />;
}
