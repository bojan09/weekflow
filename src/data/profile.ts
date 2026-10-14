import { profileSchema, type Profile } from "@/domain/profile";
import { createLocalCollection } from "./collection";

function detectTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** Demo persona. Generated data, not copied from the design mockup. */
export const profileCollection = createLocalCollection<Profile>({
  key: "weekflow:demo:profile",
  schema: profileSchema,
  seed: () => ({
    fullName: "Sam Rivera",
    email: "sam.rivera@example.com",
    bio: "Plans in focused blocks and protects deep-work time.",
    timeZone: detectTimeZone(),
    locale: "en-US",
    joinedAt: "2026-10-01",
  }),
});
