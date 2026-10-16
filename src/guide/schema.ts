import { z } from "zod";
import { APP_ROUTES } from "@/lib/routes";

const stepIds = ["add-task", "schedule-task", "lock-task", "preview-plan", "check-rules", "open-review"] as const;
export const guideSchema = z.object({
  done: z.partialRecord(z.enum(stepIds), z.literal(true)).default({}),
  panelHidden: z.boolean().default(false),
  dismissedHints: z.partialRecord(z.enum(APP_ROUTES), z.literal(true)).default({}),
});
