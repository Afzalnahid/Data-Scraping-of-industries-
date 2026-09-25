import type { Post } from "../db";
import type { Engagement } from "../strategy";

export interface PlatformAdapter {
  /** Publishes the post and returns the platform's post id. */
  publish(post: Post, posterUrl: string | null): Promise<string>;
  /** Returns metrics, or null when the platform API does not provide them. */
  fetchMetrics(externalId: string): Promise<Engagement | null>;
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

export async function checkedJson(res: Response, what: string): Promise<any> {
  const text = await res.text();
  if (!res.ok) throw new Error(`${what} failed (${res.status}): ${text.slice(0, 500)}`);
  return text ? JSON.parse(text) : {};
}
