import { z } from "zod";

export const LOCALES = [
  { id: "en-US", label: "English (United States)" },
  { id: "en-GB", label: "English (United Kingdom)" },
  { id: "de-DE", label: "Deutsch (Deutschland)" },
  { id: "fr-FR", label: "Français (France)" },
  { id: "es-ES", label: "Español (España)" },
  { id: "it-IT", label: "Italiano (Italia)" },
  { id: "pt-BR", label: "Português (Brasil)" },
  { id: "mk-MK", label: "Македонски (Македонија)" },
] as const;

const localeIds = LOCALES.map((l) => l.id) as [string, ...string[]];

function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export const profileSchema = z.object({
  /** Small re-encoded JPEG; private account data, never a public upload URL. */
  avatarImage: z.string().max(120_000).regex(/^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]*={0,2}$/).nullable().optional(),
  fullName: z.string().trim().min(1, "Enter your name").max(80, "Keep it under 80 characters"),
  email: z.email("Enter a valid email"),
  bio: z.string().trim().max(280, "Keep it under 280 characters"),
  timeZone: z.string().refine(isValidTimeZone, "Pick a valid time zone"),
  locale: z.enum(localeIds),
  /** ISO date (YYYY-MM-DD). */
  joinedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type Profile = z.infer<typeof profileSchema>;

/** Fields a user can edit. Email and join date belong to the account. */
export const profileEditSchema = profileSchema.pick({
  avatarImage: true,
  fullName: true,
  bio: true,
  timeZone: true,
  locale: true,
});

export type ProfileEdit = z.infer<typeof profileEditSchema>;

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "?";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return `${first}${last}`.toUpperCase();
}
