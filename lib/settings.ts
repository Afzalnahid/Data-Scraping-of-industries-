// Settings edited on the dashboard. Values are stored in the `settings` table
// (secrets encrypted); an environment variable with the same name in upper
// case is used as a fallback when nothing is saved.
import { PLATFORMS, type Platform } from "./config";
import { decrypt, encrypt } from "./crypto";
import { sql } from "./db";

export type FieldType = "text" | "secret" | "textarea" | "number" | "toggle" | "platforms";

export interface Field {
  key: string;
  label: string;
  type: FieldType;
  section: SectionId;
  help?: string;
  default?: string;
  env?: string; // env var fallback (defaults to KEY in upper case)
}

export const SECTIONS = {
  ai: { title: "Claude AI", help: "Writes the posts. Get a key at console.anthropic.com → API Keys." },
  content: { title: "Content", help: "What the posts are about and how they sound." },
  schedule: { title: "Publishing & learning", help: "Which platforms get posts and how the tool learns." },
  facebook: { title: "Facebook Page", help: "Needs a Page access token with pages_manage_posts and pages_read_engagement." },
  linkedin: { title: "LinkedIn (personal profile)", help: "Access token with w_member_social. Expires after about 60 days." },
  x: { title: "X (Twitter)", help: "From developer.x.com → your app → Keys and tokens (OAuth 1.0a, Read and write)." },
} as const;
export type SectionId = keyof typeof SECTIONS;

export const FIELDS: Field[] = [
  { key: "anthropic_api_key", label: "Claude API key", type: "secret", section: "ai" },
  { key: "claude_model", label: "Model", type: "text", section: "ai", default: "claude-opus-5" },

  { key: "niches", label: "Niches (one per line)", type: "textarea", section: "content", default: "AI automation\nBusiness growth" },
  { key: "brand_voice", label: "Brand voice", type: "textarea", section: "content", default: "Friendly, practical and expert. No hype." },
  { key: "brand_name", label: "Brand name (shown on posters)", type: "text", section: "content" },

  { key: "enabled_platforms", label: "Post to", type: "platforms", section: "schedule", default: "facebook,skool" },
  { key: "posts_per_day", label: "Posts per day, per platform", type: "number", section: "schedule", default: "1" },
  { key: "require_approval", label: "I approve every post before it goes out", type: "toggle", section: "schedule", default: "true" },
  { key: "explore_days", label: "Exploration days (try every time & format)", type: "number", section: "schedule", default: "7" },
  { key: "explore_rate", label: "Keep experimenting after that (0-1)", type: "number", section: "schedule", default: "0.2" },
  { key: "tz_offset_hours", label: "Time zone offset from UTC (Dhaka = 6)", type: "number", section: "schedule", default: "6" },

  { key: "fb_page_id", label: "Page ID", type: "text", section: "facebook" },
  { key: "fb_page_token", label: "Page access token", type: "secret", section: "facebook" },
  { key: "fb_graph_version", label: "Graph API version", type: "text", section: "facebook", default: "v23.0" },
  { key: "fb_reach_metric", label: "Reach insight metric", type: "text", section: "facebook", default: "post_impressions_unique" },

  { key: "linkedin_token", label: "Access token", type: "secret", section: "linkedin" },
  { key: "linkedin_person_urn", label: "Person URN (urn:li:person:…)", type: "text", section: "linkedin", help: "Leave empty to look it up automatically with “Test connection”." },
  { key: "linkedin_version", label: "API version (YYYYMM, optional)", type: "text", section: "linkedin" },

  { key: "x_api_key", label: "API key", type: "secret", section: "x" },
  { key: "x_api_secret", label: "API key secret", type: "secret", section: "x" },
  { key: "x_access_token", label: "Access token", type: "secret", section: "x" },
  { key: "x_access_secret", label: "Access token secret", type: "secret", section: "x" },
];

const FIELD_BY_KEY = new Map(FIELDS.map((f) => [f.key, f]));
const envName = (f: Field) => f.env ?? f.key.toUpperCase();

export interface RawSetting {
  value: string;
  source: "saved" | "env" | "default" | "none";
}

export async function loadRaw(): Promise<Record<string, RawSetting>> {
  const rows = await sql<{ key: string; value: string }[]>`SELECT key, value FROM settings`;
  const saved = new Map(rows.map((r) => [r.key, r.value]));
  const out: Record<string, RawSetting> = {};
  for (const f of FIELDS) {
    const stored = saved.get(f.key);
    if (stored !== undefined) {
      let value = stored;
      if (f.type === "secret") {
        try {
          value = decrypt(stored);
        } catch {
          value = ""; // master secret changed: treat as not set
        }
      }
      if (value) {
        out[f.key] = { value, source: "saved" };
        continue;
      }
    }
    const env = process.env[envName(f)];
    if (env) out[f.key] = { value: env, source: "env" };
    else if (f.default !== undefined) out[f.key] = { value: f.default, source: "default" };
    else out[f.key] = { value: "", source: "none" };
  }
  return out;
}

export async function saveSetting(key: string, value: string) {
  const field = FIELD_BY_KEY.get(key);
  if (!field) throw new Error(`Unknown setting ${key}`);
  if (!value) {
    await sql`DELETE FROM settings WHERE key = ${key}`;
    return;
  }
  const stored = field.type === "secret" ? encrypt(value) : value;
  await sql`
    INSERT INTO settings (key, value, updated_at) VALUES (${key}, ${stored}, now())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`;
}

export interface Settings {
  anthropicApiKey: string;
  model: string;
  niches: string[];
  brandVoice: string;
  brandName: string;
  platforms: Platform[];
  postsPerDay: number;
  requireApproval: boolean;
  exploreDays: number;
  epsilon: number;
  tzOffset: number;
  fb: { pageId: string; token: string; graphVersion: string; reachMetric: string };
  linkedin: { token: string; personUrn: string; version: string };
  x: { apiKey: string; apiSecret: string; accessToken: string; accessSecret: string };
}

const splitList = (s: string) =>
  s.split(/[\n,]/).map((v) => v.trim()).filter(Boolean);

export async function getSettings(): Promise<Settings> {
  const r = await loadRaw();
  const v = (k: string) => r[k]?.value ?? "";
  const n = (k: string, fallback: number) => {
    const parsed = Number(v(k));
    return Number.isFinite(parsed) && v(k) !== "" ? parsed : fallback;
  };
  return {
    anthropicApiKey: v("anthropic_api_key"),
    model: v("claude_model") || "claude-opus-5",
    niches: splitList(v("niches")),
    brandVoice: v("brand_voice"),
    brandName: v("brand_name"),
    platforms: splitList(v("enabled_platforms")).filter((p): p is Platform =>
      (PLATFORMS as readonly string[]).includes(p),
    ),
    postsPerDay: Math.max(1, Math.min(4, n("posts_per_day", 1))),
    requireApproval: v("require_approval") !== "false",
    exploreDays: n("explore_days", 7),
    epsilon: Math.max(0, Math.min(1, n("explore_rate", 0.2))),
    tzOffset: n("tz_offset_hours", 6),
    fb: {
      pageId: v("fb_page_id"),
      token: v("fb_page_token"),
      graphVersion: v("fb_graph_version") || "v23.0",
      reachMetric: v("fb_reach_metric") || "post_impressions_unique",
    },
    linkedin: {
      token: v("linkedin_token"),
      personUrn: v("linkedin_person_urn"),
      version: v("linkedin_version"),
    },
    x: {
      apiKey: v("x_api_key"),
      apiSecret: v("x_api_secret"),
      accessToken: v("x_access_token"),
      accessSecret: v("x_access_secret"),
    },
  };
}

/** Which required settings are missing for a platform (empty = ready). */
export function missingFor(s: Settings, platform: Platform): string[] {
  const miss: string[] = [];
  if (platform === "facebook") {
    if (!s.fb.pageId) miss.push("Page ID");
    if (!s.fb.token) miss.push("Page access token");
  }
  if (platform === "linkedin" && !s.linkedin.token) miss.push("Access token");
  if (platform === "x") {
    if (!s.x.apiKey || !s.x.apiSecret || !s.x.accessToken || !s.x.accessSecret) miss.push("all 4 keys");
  }
  return miss;
}
