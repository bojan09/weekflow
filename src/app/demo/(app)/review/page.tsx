import type { Metadata } from "next";
import { ReviewScreen } from "@/screens/review/review-screen";

export const metadata: Metadata = { title: "Weekly review" };

export default function Page() {
  return <ReviewScreen />;
}
