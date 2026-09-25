import type { Post } from "../db";
import type { Settings } from "../settings";
import type { Engagement } from "../strategy";

export interface PlatformAdapter {
  /** Publishes the post and returns the platform's post id. */
  publish(post: Post, posterUrl: string | null, s: Settings): Promise<string>;
  /** Returns metrics, or null when the platform API does not provide them. */
  fetchMetrics(externalId: string, s: Settings): Promise<Engagement | null>;
  /** Checks the credentials; returns a short description of the account. */
  test(s: Settings): Promise<string>;
}

export function need(value: string, label: string): string {
  if (!value) throw new Error(`${label} is not set (Settings page)`);
  return value;
}

export async function checkedJson(res: Response, what: string): Promise<any> {
  const text = await res.text();
  if (!res.ok) throw new Error(`${what} failed (${res.status}): ${text.slice(0, 500)}`);
  return text ? JSON.parse(text) : {};
}
