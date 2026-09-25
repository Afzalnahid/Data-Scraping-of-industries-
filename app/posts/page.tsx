import {
  approveAll,
  approveAndPublishNow,
  approvePost,
  enterMetrics,
  markManualPosted,
  rejectPost,
  unapprovePost,
} from "../actions";
import { Empty, Flash, PostMeta, type SearchParams } from "../ui";
import { sql, type Post } from "@/lib/db";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const TABS = [
  { id: "review", label: "Review", status: "draft", order: "ASC" },
  { id: "scheduled", label: "Scheduled", status: "approved", order: "ASC" },
  { id: "skool", label: "Skool (manual)", status: "manual", order: "ASC" },
  { id: "published", label: "Published", status: "published", order: "DESC" },
  { id: "failed", label: "Failed", status: "failed", order: "DESC" },
] as const;

export default async function PostsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const tab = TABS.find((t) => t.id === params.tab) ?? TABS[0];
  const s = await getSettings();
  const counts = await sql<{ status: string; n: number }[]>`SELECT status, count(*)::int AS n FROM posts GROUP BY status`;
  const count = (status: string) => counts.find((c) => c.status === status)?.n ?? 0;
  const posts = await sql<Post[]>`
    SELECT * FROM posts WHERE status = ${tab.status}
    ORDER BY ${tab.order === "ASC" ? sql`scheduled_at ASC` : sql`coalesce(published_at, scheduled_at) DESC`}
    LIMIT 100`;

  return (
    <>
      <Flash params={params} />
      <h1>Posts</h1>
      <nav className="tabs">
        {TABS.map((t) => (
          <a key={t.id} href={`/posts?tab=${t.id}`} className={t.id === tab.id ? "active" : ""}>
            {t.label} <span className="count">{count(t.status)}</span>
          </a>
        ))}
      </nav>

      {tab.id === "review" && posts.length > 1 && (
        <form action={approveAll} className="row" style={{ marginBottom: 12 }}>
          <button type="submit">Approve all {posts.length}</button>
          <span className="muted">Each will be published at its scheduled time.</span>
        </form>
      )}

      {posts.length === 0 && <Empty>No posts here.</Empty>}

      {posts.map((p) => (
        <div key={p.id} className="card">
          <PostMeta post={p} tzOffset={s.tzOffset} />

          {tab.id === "review" && (
            <form action={approvePost}>
              <input type="hidden" name="id" value={p.id} />
              <input type="hidden" name="back" value="/posts?tab=review" />
              <textarea name="body" defaultValue={p.body} />
              <div className="row">
                <button type="submit">Approve (post at scheduled time)</button>
                <button type="submit" className="secondary" formAction={approveAndPublishNow}>Approve &amp; post now</button>
                <button type="submit" className="danger" formAction={rejectPost}>Reject</button>
                {p.platform === "x" && <span className="muted">{p.body.length}/280</span>}
              </div>
            </form>
          )}

          {tab.id === "scheduled" && (
            <>
              <pre>{p.body}</pre>
              <form className="row">
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="body" value={p.body} />
                <button type="submit" formAction={approveAndPublishNow}>Post now</button>
                <button type="submit" className="secondary" formAction={unapprovePost}>Back to review</button>
              </form>
            </>
          )}

          {tab.id === "skool" && (
            <form action={markManualPosted}>
              <pre className="copy">{p.body}</pre>
              <input type="hidden" name="id" value={p.id} />
              <p className="muted">Copy this text, post it in your Skool community, then click the button.</p>
              <button type="submit">I posted it</button>
            </form>
          )}

          {tab.id === "failed" && (
            <form>
              {p.error && <p className="error">{p.error}</p>}
              <input type="hidden" name="id" value={p.id} />
              <input type="hidden" name="back" value="/posts?tab=failed" />
              <textarea name="body" defaultValue={p.body} />
              <div className="row">
                <button type="submit" formAction={approveAndPublishNow}>Retry now</button>
                <button type="submit" className="danger" formAction={rejectPost}>Discard</button>
              </div>
            </form>
          )}

          {tab.id === "published" && (
            <>
              <pre>{p.body.slice(0, 400)}{p.body.length > 400 ? "…" : ""}</pre>
              <form action={enterMetrics}>
                <input type="hidden" name="id" value={p.id} />
                <div className="metrics">
                  <label>Reach<input name="reach" type="number" min="0" defaultValue={p.reach ?? ""} /></label>
                  <label>Reactions<input name="reactions" type="number" min="0" defaultValue={p.reactions ?? ""} /></label>
                  <label>Comments<input name="comments" type="number" min="0" defaultValue={p.comments ?? ""} /></label>
                  <label>Shares<input name="shares" type="number" min="0" defaultValue={p.shares ?? ""} /></label>
                  <button type="submit">Save</button>
                </div>
                <p className="muted">
                  Score: {p.score?.toFixed(1) ?? "not measured yet"}
                  {p.metrics_source ? ` (${p.metrics_source === "api" ? "automatic" : "entered by you"})` : ""}
                </p>
              </form>
            </>
          )}
        </div>
      ))}
    </>
  );
}
