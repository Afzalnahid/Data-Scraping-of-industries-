// LinkedIn personal profile via the Posts API ("Share on LinkedIn" product,
// scope w_member_social). Access tokens expire after about 60 days.
import { requireEnv, type PlatformAdapter } from "./types";

// LinkedIn requires a YYYYMM version header; each version is supported for
// about a year, so default to two months ago.
function defaultVersion(): string {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() - 2);
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export const linkedin: PlatformAdapter = {
  async publish(post) {
    const res = await fetch("https://api.linkedin.com/rest/posts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${requireEnv("LINKEDIN_TOKEN")}`,
        "Content-Type": "application/json",
        "LinkedIn-Version": process.env.LINKEDIN_VERSION ?? defaultVersion(),
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        author: requireEnv("LINKEDIN_PERSON_URN"), // urn:li:person:xxxx
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
};
