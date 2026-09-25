// Facebook Page via the Graph API. Needs a Page access token with
// pages_manage_posts and pages_read_engagement.
import { checkedJson, requireEnv, type PlatformAdapter } from "./types";

const version = () => process.env.FB_GRAPH_VERSION ?? "v23.0";
const graph = (path: string) => `https://graph.facebook.com/${version()}/${path}`;

export const facebook: PlatformAdapter = {
  async publish(post, posterUrl) {
    const pageId = requireEnv("FB_PAGE_ID");
    const token = requireEnv("FB_PAGE_TOKEN");
    const form = new URLSearchParams({ access_token: token });
    let endpoint: string;
    if (posterUrl) {
      endpoint = graph(`${pageId}/photos`);
      form.set("url", posterUrl);
      form.set("caption", post.body);
    } else {
      endpoint = graph(`${pageId}/feed`);
      form.set("message", post.body);
    }
    const data = await checkedJson(await fetch(endpoint, { method: "POST", body: form }), "Facebook publish");
    return data.post_id ?? data.id;
  },

  async fetchMetrics(postId) {
    const token = requireEnv("FB_PAGE_TOKEN");
    const fields = "reactions.summary(total_count).limit(0),comments.summary(total_count).limit(0),shares";
    const data = await checkedJson(
      await fetch(`${graph(postId)}?fields=${fields}&access_token=${token}`),
      "Facebook metrics",
    );
    let reach: number | null = null;
    try {
      // Insight metric names change between Graph versions; reach is optional.
      const metric = process.env.FB_REACH_METRIC ?? "post_impressions_unique";
      const ins = await checkedJson(
        await fetch(`${graph(`${postId}/insights`)}?metric=${metric}&access_token=${token}`),
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
};
