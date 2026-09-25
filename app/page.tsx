import { approvePost, enterMetrics, markManualPosted, rejectPost } from "./actions";
import { config } from "@/lib/config";
import { sql, type Post } from "@/lib/db";
import { insights } from "@/lib/strategy";

export const dynamic = "force-dynamic";

const fmt = (d: Date | null) =>
  d
    ? new Date(d.getTime() + config.timezoneOffsetHours * 3600_000).toISOString().slice(0, 16).replace("T", " ")
    : "-";

function Tags({ post }: { post: Post }) {
  return (
    <div className="meta">
      <span className="tag">#{post.id}</span>
      <span className="tag">{post.platform}</span>
      <span className="tag">{post.content_type}</span>
      <span className="tag">{post.language}</span>
      <span className="tag">{post.niche}</span>
      <span className="tag">{fmt(post.scheduled_at)}</span>
    </div>
  );
}

export default async function Dashboard() {
  const posts = await sql<Post[]>`SELECT * FROM posts ORDER BY scheduled_at DESC LIMIT 200`;
  const drafts = posts.filter((p) => p.status === "draft").reverse();
  const manual = posts.filter((p) => p.status === "manual");
  const done = posts.filter((p) => p.status === "published" || p.status === "failed").slice(0, 40);
  const first = posts.at(-1)?.created_at;
  const day = first ? Math.floor((Date.now() - first.getTime()) / 86_400_000) + 1 : 0;

  return (
    <main>
      <h1>Social Autopilot</h1>
      <p className="muted">
        {day === 0
          ? "No posts yet: the plan cron creates tomorrow's posts once a day."
          : day <= config.exploreDays
            ? `Exploration phase: day ${day} of ${config.exploreDays}. Trying every time slot and format.`
            : `Learning phase: day ${day}. ${Math.round((1 - config.epsilon) * 100)}% of choices follow the best results.`}
        {" "}Times shown in local time (UTC+{config.timezoneOffsetHours}).
      </p>

      <h2>Waiting for approval ({drafts.length})</h2>
      {drafts.length === 0 && <p className="muted">Nothing to approve.</p>}
      {drafts.map((p) => (
        <form key={p.id} className="card" action={approvePost}>
          <Tags post={p} />
          <input type="hidden" name="id" value={p.id} />
          <textarea name="body" defaultValue={p.body} />
          <div className="row">
            <button type="submit">Approve</button>
            <button type="submit" className="secondary" formAction={rejectPost}>Reject</button>
            {p.platform === "x" && <span className="muted">{p.body.length}/280</span>}
          </div>
        </form>
      ))}

      <h2>Post manually on Skool ({manual.length})</h2>
      {manual.map((p) => (
        <form key={p.id} className="card" action={markManualPosted}>
          <Tags post={p} />
          <pre>{p.body}</pre>
          <input type="hidden" name="id" value={p.id} />
          <button type="submit">I posted it</button>
        </form>
      ))}

      <h2>Published</h2>
      {done.map((p) => (
        <div key={p.id} className="card">
          <Tags post={p} />
          <pre>{p.body.slice(0, 280)}{p.body.length > 280 ? "…" : ""}</pre>
          {p.error && <p className="error">{p.error}</p>}
          {p.status === "published" && (
            <form action={enterMetrics}>
              <input type="hidden" name="id" value={p.id} />
              <div className="metrics">
                <input name="reach" type="number" min="0" placeholder="Reach" defaultValue={p.reach ?? ""} />
                <input name="reactions" type="number" min="0" placeholder="Reactions" defaultValue={p.reactions ?? ""} />
                <input name="comments" type="number" min="0" placeholder="Comments" defaultValue={p.comments ?? ""} />
                <input name="shares" type="number" min="0" placeholder="Shares" defaultValue={p.shares ?? ""} />
                <button type="submit">Save</button>
              </div>
              <p className="muted">
                Score: {p.score?.toFixed(1) ?? "not measured"}
                {p.metrics_source ? ` (${p.metrics_source})` : ""}
              </p>
            </form>
          )}
        </div>
      ))}

      <h2>What works best</h2>
      {config.platforms.map((platform) => {
        const rows = posts.filter((p) => p.platform === platform && p.status === "published");
        return (
          <div key={platform} className="card">
            <strong>{platform}</strong>
            <div className="grid">
              {insights(rows).map(({ dimension, rows: options }) => (
                <table key={dimension}>
                  <thead>
                    <tr><th>{dimension}</th><th>posts</th><th>avg score</th></tr>
                  </thead>
                  <tbody>
                    {options.map((o) => (
                      <tr key={o.option}>
                        <td>{dimension === "slot_hour" ? `${o.option}:00` : o.option}</td>
                        <td>{o.measured}/{o.tried}</td>
                        <td>{o.avgScore?.toFixed(1) ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ))}
            </div>
          </div>
        );
      })}
    </main>
  );
}
