import type { Metadata } from "next";
import { TasksScreen } from "@/screens/tasks/tasks-screen";

export const metadata: Metadata = { title: "Tasks" };

// Private data loads after session validation.
export const instant = false;

export default function Page() {
  return <TasksScreen />;
}
