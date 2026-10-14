import type { PlanningPrefs } from "@/domain/availability";
import type { Now } from "@/domain/conflicts";
import type { Placement, Task } from "@/domain/tasks";
import type { TimeFormat } from "@/lib/time";
import type { Prefs } from "@/prefs/schema";

export type EnginePrefs = Prefs["engine"];

/**
 * What the engine may touch.
 * - `inbox`: only open tasks that have no place yet.
 * - `fix`: the inbox, plus unlocked tasks whose current place breaks a rule.
 *   Needs `engine.allowMoveExisting`; otherwise it behaves like `inbox`.
 */
export type PlanMode = "inbox" | "fix";

export interface PlanInput {
  tasks: readonly Task[];
  planning: PlanningPrefs;
  engine: EnginePrefs;
  now: Now;
  mode: PlanMode;
  /**
   * Open tasks whose time has passed. `include` re-plans them along with the
   * rest; `only` plans nothing else. Locked tasks are never touched.
   */
  missed?: "include" | "only";
  /** Only used to word explanations. */
  format?: TimeFormat;
  horizonDays?: number;
}

export type ReasonCode =
  | "slot"
  | "order"
  | "deadline"
  | "dependency"
  | "earliest-start"
  | "preference"
  | "focus"
  | "moved";

export interface Reason {
  code: ReasonCode;
  text: string;
}

export interface Proposal {
  taskId: string;
  title: string;
  /** Where the task is now, or null when it was in the inbox. */
  from: Placement | null;
  to: { date: string; startMin: number };
  /** True when the task is placed after a soft deadline. */
  late: boolean;
  /** Plain-language answers to "why here?", most important first. */
  reasons: Reason[];
}

export type UnplacedCode =
  | "no-room-before-deadline"
  | "no-room"
  | "impossible-window"
  | "dependency-cycle"
  | "blocked-dependency";

export interface Unplaced {
  taskId: string;
  title: string;
  code: UnplacedCode;
  message: string;
}

export interface Plan {
  proposals: Proposal[];
  unplaced: Unplaced[];
  summary: { considered: number; placed: number; moved: number; unplaced: number };
}
