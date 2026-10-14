import { formatClock, type TimeFormat } from "@/lib/time";
import { timeToMinutes } from "@/lib/time";
import type { Prefs } from "@/prefs/schema";

export type RuleIcon =
  | "priority"
  | "deadline"
  | "hours"
  | "focus"
  | "buffer"
  | "workload"
  | "locked";

export interface ActiveRule {
  id: string;
  icon: RuleIcon;
  label: string;
}

/**
 * The scheduling rules the user has actually turned on, in plain words.
 * Driven entirely by saved settings, so the Home bar never shows a fake rule.
 */
export function activeRules(prefs: Prefs, format: TimeFormat = prefs.calendar.timeFormat): ActiveRule[] {
  const { planning, engine } = prefs;
  const rules: ActiveRule[] = [];

  if (engine.weights.priority >= 5) {
    rules.push({ id: "priority", icon: "priority", label: "Prioritize high priority" });
  }
  rules.push({
    id: "deadline",
    icon: "deadline",
    label: engine.deadlineBehavior === "strict" ? "Respect deadlines" : "Flexible deadlines",
  });

  const start = timeToMinutes(planning.workStart);
  const end = timeToMinutes(planning.workEnd);
  rules.push({
    id: "hours",
    icon: "hours",
    label: `Work ${formatClock(Math.floor(start / 60), start % 60, format)}–${formatClock(Math.floor(end / 60), end % 60, format)}`,
  });
  rules.push({ id: "workload", icon: "workload", label: `Max ${planning.maxDailyHours}h a day` });

  if (planning.focusTime.enabled) {
    rules.push({ id: "focus", icon: "focus", label: "Keep focus time" });
  }
  if (planning.bufferMin > 0) {
    rules.push({ id: "buffer", icon: "buffer", label: `${planning.bufferMin} min buffers` });
  }
  if (!engine.allowMoveExisting) {
    rules.push({ id: "locked", icon: "locked", label: "Keep placements fixed" });
  }
  return rules;
}
