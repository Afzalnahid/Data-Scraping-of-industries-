// Central configuration. Everything tunable comes from environment variables
// so the same code runs locally and on Vercel.

export const PLATFORMS = ["facebook", "linkedin", "x", "skool"] as const;
export type Platform = (typeof PLATFORMS)[number];

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

// Candidate posting hours in local time (Asia/Dhaka by default).
export const SLOT_HOURS = [8, 10, 12, 14, 17, 19, 21, 23];

function list(name: string, fallback: string[]): string[] {
  const raw = process.env[name];
  if (!raw) return fallback;
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

export const config = {
  niches: list("NICHES", ["AI automation", "Business growth"]),
  platforms: list("ENABLED_PLATFORMS", [...PLATFORMS]) as Platform[],
  brandVoice: process.env.BRAND_VOICE ?? "Friendly, practical and expert. No hype.",
  postsPerDay: Number(process.env.POSTS_PER_DAY ?? 1),
  exploreDays: Number(process.env.EXPLORE_DAYS ?? 7),
  epsilon: Number(process.env.EXPLORE_RATE ?? 0.2),
  requireApproval: (process.env.REQUIRE_APPROVAL ?? "true") !== "false",
  timezoneOffsetHours: Number(process.env.TZ_OFFSET_HOURS ?? 6), // Dhaka = UTC+6
  appUrl: process.env.APP_URL ?? "http://localhost:3000",
  model: process.env.CLAUDE_MODEL ?? "claude-opus-5",
};
