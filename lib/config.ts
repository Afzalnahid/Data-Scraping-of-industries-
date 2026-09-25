// Fixed option lists. Everything user-tunable lives in lib/settings.ts and is
// edited on the dashboard's Settings page.

export const PLATFORMS = ["facebook", "linkedin", "x", "skool"] as const;
export type Platform = (typeof PLATFORMS)[number];

export const PLATFORM_LABELS: Record<Platform, string> = {
  facebook: "Facebook Page",
  linkedin: "LinkedIn",
  x: "X (Twitter)",
  skool: "Skool",
};

// Skool has no public posting API: posts are generated and shown on the
// dashboard for manual copy-paste.
export const MANUAL_PLATFORMS: Platform[] = ["skool"];

export const CONTENT_TYPES = [
  "tip",
  "story",
  "question",
  "myth_vs_fact",
  "listicle",
  "poster_quote",
  "case_study",
  "behind_the_scenes",
] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export const LANGUAGES = ["en", "bn"] as const;
export type Language = (typeof LANGUAGES)[number];

// Candidate posting hours in local time.
export const SLOT_HOURS = [8, 10, 12, 14, 17, 19, 21, 23];

export const APP_URL = process.env.APP_URL ?? "http://localhost:3000";
