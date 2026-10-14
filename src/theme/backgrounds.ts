export const BACKGROUNDS = [
  { id: "default", label: "Default" },
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "tint-lavender", label: "Lavender" },
  { id: "tint-mint", label: "Mint" },
  { id: "tint-rose", label: "Rose" },
  { id: "dots", label: "Dots Pattern" },
  { id: "lines", label: "Lines Pattern" },
  { id: "ocean", label: "Ocean Waves" },
  { id: "mountain", label: "Mountain" },
  { id: "forest", label: "Forest" },
  { id: "sunset", label: "Sunset" },
] as const;

export const BACKGROUND_IDS = [
  "default",
  "light",
  "dark",
  "tint-lavender",
  "tint-mint",
  "tint-rose",
  "dots",
  "lines",
  "ocean",
  "mountain",
  "forest",
  "sunset",
] as const;

export type BackgroundId = (typeof BACKGROUND_IDS)[number];
