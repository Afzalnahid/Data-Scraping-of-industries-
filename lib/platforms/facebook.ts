// Facebook Page via the Graph API. Needs a Page access token with
// pages_manage_posts and pages_read_engagement.
import type { Settings } from "../settings";
import { checkedJson, need, type PlatformAdapter } from "./types";

const graph = (s: Settings, path: string) => `https://graph.facebook.com/${s.fb.graphVersion}/${path}`;

export const facebook: PlatformAdapter = {
  async publish(post, posterUrl, s) {
    const pageId = need(s.fb.pageId, "Facebook Page ID");
    const form = new URLSearchParams({ access_token: need(s.fb.token, "Facebook Page token") });
    let endpoint: string;
    if (posterUrl) {
      endpoint = graph(s, `${pageId}/photos`);
      form.set("url", posterUrl);
      form.set("caption", post.body);
    } else {
      endpoint = graph(s, `${pageId}/feed`);
      form.set("message", post.body);
    }
    const data = await checkedJson(await fetch(endpoint, { method: "POST", body: form }), "Facebook publish");
    return data.post_id ?? data.id;
  },

  async fetchMetrics(postId, s) {
    const token = need(s.fb.token, "Facebook Page token");
    const fields = "reactions.summary(total_count).limit(0),comments.summary(total_count).limit(0),shares";
    const data = await checkedJson(
      await fetch(`${graph(s, postId)}?fields=${fields}&access_token=${token}`),
      "Facebook metrics",
    );
    let reach: number | null = null;
    try {
      // Insight metric names change between Graph versions; reach is optional.
      const ins = await checkedJson(
        await fetch(`${graph(s, `${postId}/insights`)}?metric=${s.fb.reachMetric}&access_token=${token}`),
        "Facebook insights",
      );
      reach = ins.data?.[0]?.values?.[0]?.value ?? null;
    } catch (err) {
      console.warn(String(err));
    }
    return {
      reactions: data.reactions?.summary?.total_count ?? 0,
      comments: data.comments?.summary?.total_count ?? 0,
      shares: data.shares?.count ?? 0,
      reach,
    };
  },

  async test(s) {
    const pageId = need(s.fb.pageId, "Facebook Page ID");
    const token = need(s.fb.token, "Facebook Page token");
    const data = await checkedJson(
      await fetch(`${graph(s, pageId)}?fields=name&access_token=${token}`),
      "Facebook",
    );
    return `Connected to Page “${data.name}”`;
  },
};
