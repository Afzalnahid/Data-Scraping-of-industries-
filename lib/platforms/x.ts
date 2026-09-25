// X (Twitter) API v2 with OAuth 1.0a user context (tokens do not expire).
// Reading metrics may require a paid API tier; failures fall back to manual entry.
import crypto from "node:crypto";
import type { Settings } from "../settings";
import { checkedJson, need, type PlatformAdapter } from "./types.ts";

const enc = (s: string) =>
  encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

export function oauth1Header(
  method: string,
  url: string,
  query: Record<string, string>,
  creds: { key: string; secret: string; token: string; tokenSecret: string },
  nonce = crypto.randomBytes(16).toString("hex"),
  timestamp = Math.floor(Date.now() / 1000).toString(),
): string {
  const oauth: Record<string, string> = {
    oauth_consumer_key: creds.key,
    oauth_nonce: nonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestamp,
    oauth_token: creds.token,
    oauth_version: "1.0",
  };
  // JSON bodies are not part of the signature; query parameters are.
  const params = Object.entries({ ...query, ...oauth })
    .map(([k, v]) => [enc(k), enc(v)])
    .sort(([a, av], [b, bv]) => (a === b ? (av < bv ? -1 : 1) : a < b ? -1 : 1))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  const base = [method.toUpperCase(), enc(url), enc(params)].join("&");
  const signingKey = `${enc(creds.secret)}&${enc(creds.tokenSecret)}`;
  oauth.oauth_signature = crypto.createHmac("sha1", signingKey).update(base).digest("base64");
  return (
    "OAuth " +
    Object.entries(oauth)
      .map(([k, v]) => `${enc(k)}="${enc(v)}"`)
      .join(", ")
  );
}

const creds = (s: Settings) => ({
  key: need(s.x.apiKey, "X API key"),
  secret: need(s.x.apiSecret, "X API key secret"),
  token: need(s.x.accessToken, "X access token"),
  tokenSecret: need(s.x.accessSecret, "X access token secret"),
});

export const x: PlatformAdapter = {
  async publish(post, _poster, s) {
    const url = "https://api.x.com/2/tweets";
    const data = await checkedJson(
      await fetch(url, {
        method: "POST",
        headers: { Authorization: oauth1Header("POST", url, {}, creds(s)), "Content-Type": "application/json" },
        body: JSON.stringify({ text: post.body }),
      }),
      "X publish",
    );
    return data.data.id;
  },

  async fetchMetrics(id, s) {
    const url = `https://api.x.com/2/tweets/${id}`;
    const query = { "tweet.fields": "public_metrics" };
    const data = await checkedJson(
      await fetch(`${url}?${new URLSearchParams(query)}`, {
        headers: { Authorization: oauth1Header("GET", url, query, creds(s)) },
      }),
      "X metrics",
    );
    const m = data.data?.public_metrics;
    if (!m) return null;
    return {
      reactions: m.like_count ?? 0,
      comments: m.reply_count ?? 0,
      shares: (m.retweet_count ?? 0) + (m.quote_count ?? 0),
      reach: m.impression_count ?? null,
    };
  },

  async test(s) {
    const url = "https://api.x.com/2/users/me";
    const data = await checkedJson(
      await fetch(url, { headers: { Authorization: oauth1Header("GET", url, {}, creds(s)) } }),
      "X",
    );
    return `Connected as @${data.data?.username}`;
  },
};
