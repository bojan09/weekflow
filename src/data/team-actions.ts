import { toast } from "sonner";
import type { Result } from "@/domain/team/ops";
import type { TeamState } from "@/domain/team/types";
import { teamCollection } from "./team";

/**
 * Run a team operation as the member you are acting as. A refusal is shown
 * as a message and nothing changes. Returns whether it went through.
 */
export function applyTeam(operation: (state: TeamState, actorId: string) => Result): boolean {
  const state = teamCollection.getSnapshot();
  const result = operation(state, state.viewerId);
  if (!result.ok) {
    toast.error(result.reason);
    return false;
  }
  teamCollection.write(result.state);
  return true;
}

export function newId(): string {
  return crypto.randomUUID();
}
