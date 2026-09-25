// LinkedIn personal profile via the Posts API ("Share on LinkedIn" product,
// scope w_member_social). Access tokens expire after about 60 days.
import type { Settings } from "../settings";
import { checkedJson, need, type PlatformAdapter } from "./types";

// LinkedIn requires a YYYYMM version header; each version is supported for
// about a year, so default to two months ago.
function defaultVersion(): string {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() - 2);
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

// Needs the "Sign In with LinkedIn using OpenID Connect" product (openid scope).
async function lookupPerson(token: string): Promise<{ urn: string; name: string }> {
  const data = await checkedJson(
    await fetch("https://api.linkedin.com/v2/userinfo", { headers: { Authorization: `Bearer ${token}` } }),
    "LinkedIn profile lookup",
  );
  return { urn: `urn:li:person:${data.sub}`, name: data.name ?? "" };
}

export const linkedin: PlatformAdapter = {
  async publish(post, _poster, s: Settings) {
    const token = need(s.linkedin.token, "LinkedIn access token");
    const author = s.linkedin.personUrn || (await lookupPerson(token)).urn;
    const res = await fetch("https://api.linkedin.com/rest/posts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "LinkedIn-Version": s.linkedin.version || defaultVersion(),
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        author,
        commentary: post.body,
        visibility: "PUBLIC",
        distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
        lifecycleState: "PUBLISHED",
        isReshareDisabledByAuthor: false,
      }),
    });
    if (!res.ok) throw new Error(`LinkedIn publish failed (${res.status}): ${(await res.text()).slice(0, 500)}`);
    return res.headers.get("x-restli-id") ?? "unknown";
  },

  // Personal-profile analytics are not available to standard apps, so
  // LinkedIn metrics are entered manually on the dashboard.
  async fetchMetrics() {
    return null;
  },

  async test(s) {
    const token = need(s.linkedin.token, "LinkedIn access token");
    const person = await lookupPerson(token);
    return `Connected as ${person.name || person.urn} (${person.urn})`;
  },
};
