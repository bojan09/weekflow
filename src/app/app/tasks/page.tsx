import type { Metadata } from "next";
import { TasksScreen } from "@/screens/tasks/tasks-screen";

export const metadata: Metadata = { title: "Tasks" };

export default function Page() {
  return <TasksScreen />;
}
