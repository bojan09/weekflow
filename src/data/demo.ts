import { profileCollection } from "./profile";
import { tasksCollection } from "./tasks";

/** Every demo collection, so "reset demo data" cannot miss one. */
const DEMO_COLLECTIONS = [profileCollection, tasksCollection] as const;

export function resetDemoData(): void {
  for (const collection of DEMO_COLLECTIONS) collection.reset();
}

/** Everything the demo has stored, for the "export my data" action. */
export function exportDemoData(): Record<string, unknown> {
  return {
    profile: profileCollection.getSnapshot(),
    tasks: tasksCollection.getSnapshot(),
  };
}
