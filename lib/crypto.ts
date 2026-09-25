// AES-256-GCM encryption for secrets saved from the dashboard. The key is
// derived from SETTINGS_SECRET (or CRON_SECRET), which only lives in Vercel, so
// a database leak alone does not expose API keys. Changing that env var makes
// saved secrets unreadable: re-enter them on the Settings page.
import crypto from "node:crypto";

function deriveKey(secret: string): Buffer {
  return crypto.createHash("sha256").update(`social-autopilot-settings:${secret}`).digest();
}

export function masterSecret(): string {
  const secret = process.env.SETTINGS_SECRET ?? process.env.CRON_SECRET;
  if (!secret) throw new Error("SETTINGS_SECRET or CRON_SECRET must be set to store secrets");
  return secret;
}

export function encrypt(plain: string, secret = masterSecret()): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", deriveKey(secret), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return `v1:${Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64")}`;
}

export function decrypt(token: string, secret = masterSecret()): string {
  if (!token.startsWith("v1:")) throw new Error("Unknown secret format");
  const raw = Buffer.from(token.slice(3), "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", deriveKey(secret), raw.subarray(0, 12));
  decipher.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8");
}
