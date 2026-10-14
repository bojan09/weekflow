import { z } from "zod";
import { BACKGROUND_IDS } from "@/theme/backgrounds";
import { ACCENT_IDS } from "@/theme/generated/palettes";
import { DEFAULT_ACCENT } from "@/theme/palettes";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM");

export const breakSchema = z.object({
  id: z.string().min(1).max(40),
  label: z.string().trim().max(40),
  start: time,
  end: time,
});

const appearance = z.object({
  theme: z.enum(["light", "dark", "system"]).default("system"),
  accent: z.enum(ACCENT_IDS).default(DEFAULT_ACCENT),
  background: z.enum(BACKGROUND_IDS).default("default"),
  density: z.enum(["comfortable", "compact"]).default("comfortable"),
  /** Translucent, blurred surfaces so the background shows through. */
  glass: z.enum(["off", "subtle", "frosted"]).default("off"),
});

const planning = z.object({
  workDays: z
    .array(z.number().int().min(0).max(6))
    .max(7)
    .default([1, 2, 3, 4, 5]),
  workStart: time.default("09:00"),
  workEnd: time.default("17:00"),
  breaks: z
    .array(breakSchema)
    .max(8)
    .default([{ id: "lunch", label: "Lunch", start: "12:00", end: "13:00" }]),
  bufferMin: z.number().int().min(0).max(60).default(10),
  maxDailyHours: z.number().int().min(1).max(16).default(6),
  preferredTime: z.enum(["any", "morning", "afternoon"]).default("any"),
  focusTime: z
    .object({
      enabled: z.boolean().default(true),
      minutes: z.number().int().min(30).max(240).default(90),
    })
    .prefault({}),
});

const engine = z.object({
  autoReschedule: z.enum(["off", "ask", "auto"]).default("ask"),
  allowMoveExisting: z.boolean().default(true),
  deadlineBehavior: z.enum(["strict", "soft"]).default("strict"),
  weights: z
    .object({
      priority: z.number().int().min(0).max(10).default(8),
      deadline: z.number().int().min(0).max(10).default(8),
      stability: z.number().int().min(0).max(10).default(5),
    })
    .prefault({}),
  minBlockMin: z.number().int().min(15).max(240).default(30),
  maxBlockMin: z.number().int().min(30).max(480).default(120),
});

const calendar = z.object({
  defaultView: z.enum(["day", "week", "agenda"]).default("week"),
  weekStart: z.enum(["monday", "sunday", "saturday"]).default("monday"),
  timeFormat: z.enum(["12h", "24h"]).default("24h"),
});

const notifications = z.object({
  reminders: z.boolean().default(true),
  reminderLeadMin: z.number().int().min(0).max(120).default(10),
  weeklyReview: z.boolean().default(false),
  weeklyReviewDay: z.number().int().min(0).max(6).default(5),
});

const accessibility = z.object({
  motion: z.enum(["system", "reduce", "full"]).default("system"),
  textScale: z
    .union([z.literal(100), z.literal(110), z.literal(125)])
    .default(100),
});

const workspace = z.object({
  name: z.string().trim().min(1).max(40).default("Personal"),
  defaultDurationMin: z.number().int().min(5).max(480).default(45),
  defaultPriority: z.enum(["low", "medium", "high"]).default("medium"),
});

const advanced = z.object({
  showStateSimulator: z.boolean().default(true),
});

const SECTION_OBJECTS = {
  appearance,
  planning,
  engine,
  calendar,
  notifications,
  accessibility,
  workspace,
  advanced,
} as const;

export const prefsSchema = z.object({
  appearance: appearance.prefault({}),
  planning: planning.prefault({}),
  engine: engine.prefault({}),
  calendar: calendar.prefault({}),
  notifications: notifications.prefault({}),
  accessibility: accessibility.prefault({}),
  workspace: workspace.prefault({}),
  advanced: advanced.prefault({}),
});

export type Prefs = z.infer<typeof prefsSchema>;
export type PrefsSection = keyof Prefs;
export type Break = z.infer<typeof breakSchema>;

export const PREFS_SECTIONS = Object.keys(prefsSchema.shape) as PrefsSection[];

export const DEFAULT_PREFS: Prefs = prefsSchema.parse({});

/** Schema for a single section, used to validate partial updates. */
export function sectionSchema<S extends PrefsSection>(
  section: S,
): (typeof prefsSchema.shape)[S] {
  return prefsSchema.shape[section];
}

/**
 * Parse unknown stored data. A corrupt value only resets that one setting:
 * valid fields in the same section, and every other section, are kept.
 */
export function sanitizePrefs(raw: unknown): Prefs {
  const source = asRecord(raw);
  const result: Record<string, unknown> = {};
  for (const section of PREFS_SECTIONS) {
    const whole = sectionSchema(section).safeParse(source[section]);
    if (whole.success) {
      result[section] = whole.data;
      continue;
    }
    const stored = asRecord(source[section]);
    const defaults = DEFAULT_PREFS[section] as Record<string, unknown>;
    const fields = SECTION_OBJECTS[section].shape as Record<string, z.ZodType>;
    const salvaged: Record<string, unknown> = {};
    for (const [key, schema] of Object.entries(fields)) {
      const field = schema.safeParse(stored[key]);
      salvaged[key] = field.success ? field.data : defaults[key];
    }
    const repaired = sectionSchema(section).safeParse(salvaged);
    result[section] = repaired.success ? repaired.data : DEFAULT_PREFS[section];
  }
  return result as Prefs;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}
