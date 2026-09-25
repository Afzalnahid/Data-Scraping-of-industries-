import { CONTENT_TYPES, LANGUAGES, MANUAL_PLATFORMS, SLOT_HOURS, config, type Platform } from "./config";
import { sql, type Post } from "./db";
import { generatePost } from "./generate";
import { adapters } from "./platforms";
import { chooseArms, engagementScore, type Engagement, type HistoryRow } from "./strategy";

const HOUR = 3600_000;
const DAY = 24 * HOUR;
const PUBLISH_WINDOW_HOURS = 6; // approved posts older than this are marked missed

/** UTC Date for `hour` local time on the local day `daysAhead` from now. */
export function localSlotToUtc(hour: number, daysAhead: number, now = new Date()): Date {
  const offset = config.timezoneOffsetHours * HOUR;
  const local = new Date(now.getTime() + offset + daysAhead * DAY);
  return new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), hour) - offset,
  );
}

export function posterUrl(post: Pick<Post, "poster_title">): string {
  const q = new URLSearchParams({ title: post.poster_title ?? "" });
  return `${config.appUrl}/api/poster?${q}`;
}

/** Plans and writes tomorrow's posts for every enabled platform. Idempotent per day. */
export async function planTomorrow() {
  const results: string[] = [];
  const dayStart = localSlotToUtc(0, 1);
  const dayEnd = new Date(dayStart.getTime() + DAY);

  // Platforms are planned in parallel so the cron stays within its time limit.
  await Promise.all(config.platforms.map(async (platform) => {
    const [{ count }] = await sql<{ count: number }[]>`
      SELECT count(*)::int AS count FROM posts
      WHERE platform = ${platform} AND scheduled_at >= ${dayStart} AND scheduled_at < ${dayEnd}`;
    if (count > 0) {
      results.push(`${platform}: already planned`);
      return;
    }

    const history = await sql<(HistoryRow & { body: string; created_at: Date })[]>`
      SELECT slot_hour, content_type, language, niche, score, body, created_at
      FROM posts WHERE platform = ${platform} AND status <> 'rejected'
      ORDER BY created_at DESC`;
    const firstPost = history.at(-1)?.created_at;
    const exploring = !firstPost || Date.now() - firstPost.getTime() < config.exploreDays * DAY;

    const picks = chooseArms({
      history,
      count: config.postsPerDay,
      exploring,
      epsilon: config.epsilon,
      slots: SLOT_HOURS,
      contentTypes: [...CONTENT_TYPES],
      languages: [...LANGUAGES],
      niches: config.niches,
    });
    const recent = history.slice(0, 10).map((h) => h.body.split("\n")[0].slice(0, 100));

    for (const arms of picks) {
      try {
        const draft = await generatePost(platform, arms, recent);
        await sql`
          INSERT INTO posts (platform, niche, content_type, language, slot_hour, scheduled_at, status, body, poster_title)
          VALUES (${platform}, ${arms.niche}, ${arms.content_type}, ${arms.language}, ${arms.slot_hour},
                  ${localSlotToUtc(arms.slot_hour, 1)}, ${config.requireApproval ? "draft" : "approved"},
                  ${draft.body}, ${draft.poster_title})`;
        recent.unshift(draft.body.split("\n")[0].slice(0, 100));
        results.push(`${platform}: planned ${arms.content_type}/${arms.language} at ${arms.slot_hour}:00`);
      } catch (err) {
        results.push(`${platform}: generation failed - ${String(err)}`);
      }
    }
  }));
  return { exploringNote: `explore days: ${config.exploreDays}`, results };
}

/** Publishes approved posts whose time has come. */
export async function publishDue() {
  const now = new Date();
  const results: string[] = [];

  await sql`
    UPDATE posts SET status = 'failed', error = 'missed publish window (not approved in time)'
    WHERE status IN ('draft', 'approved')
      AND scheduled_at < ${new Date(now.getTime() - PUBLISH_WINDOW_HOURS * HOUR)}`;

  const due = await sql<Post[]>`
    SELECT * FROM posts WHERE status = 'approved' AND scheduled_at <= ${now} ORDER BY scheduled_at`;

  for (const post of due) {
    if (MANUAL_PLATFORMS.includes(post.platform)) {
      await sql`UPDATE posts SET status = 'manual' WHERE id = ${post.id}`;
      results.push(`#${post.id} ${post.platform}: ready for manual posting`);
      continue;
    }
    const adapter = adapters[post.platform as Platform];
    if (!adapter) continue;
    try {
      const withPoster = post.platform === "facebook" && post.content_type === "poster_quote";
      const externalId = await adapter.publish(post, withPoster ? posterUrl(post) : null);
      await sql`
        UPDATE posts SET status = 'published', external_id = ${externalId}, published_at = now(), error = NULL
        WHERE id = ${post.id}`;
      results.push(`#${post.id} ${post.platform}: published`);
    } catch (err) {
      await sql`UPDATE posts SET status = 'failed', error = ${String(err)} WHERE id = ${post.id}`;
      results.push(`#${post.id} ${post.platform}: failed - ${String(err)}`);
    }
  }
  return { results };
}

export async function saveMetrics(id: number, m: Engagement, source: "api" | "manual") {
  await sql`
    UPDATE posts SET reach = ${m.reach ?? null}, reactions = ${m.reactions ?? 0},
      comments = ${m.comments ?? 0}, shares = ${m.shares ?? 0}, score = ${engagementScore(m)},
      metrics_source = ${source}, metrics_updated_at = now()
    WHERE id = ${id}`;
}

/** Pulls engagement for posts published between 12 hours and 7 days ago. */
export async function collectMetrics() {
  const now = Date.now();
  const posts = await sql<Post[]>`
    SELECT * FROM posts
    WHERE status = 'published' AND external_id IS NOT NULL
      AND published_at BETWEEN ${new Date(now - 7 * DAY)} AND ${new Date(now - 12 * HOUR)}
      AND (metrics_source IS NULL OR metrics_source = 'api')`;
  const results: string[] = [];
  for (const post of posts) {
    try {
      const metrics = await adapters[post.platform as Platform]?.fetchMetrics(post.external_id!);
      if (!metrics) continue; // no API metrics: enter manually on the dashboard
      await saveMetrics(post.id, metrics, "api");
      results.push(`#${post.id} ${post.platform}: score ${engagementScore(metrics).toFixed(1)}`);
    } catch (err) {
      results.push(`#${post.id} ${post.platform}: metrics failed - ${String(err)}`);
    }
  }
  return { results };
}
