import { planNow, publishDueNow } from "./actions";
import { Empty, Flash, PostMeta, type SearchParams } from "./ui";
import { PLATFORM_LABELS } from "@/lib/config";
import { sql, type Post } from "@/lib/db";
import { getSettings, missingFor } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export default async function Overview({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const s = await getSettings();
  const [counts] = await sql<{ drafts: number; scheduled: number; published7: number; failed: number; manual: number }[]>`
    SELECT
      count(*) FILTER (WHERE status = 'draft')::int AS drafts,
      count(*) FILTER (WHERE status = 'approved')::int AS scheduled,
      count(*) FILTER (WHERE status = 'published' AND published_at > now() - interval '7 days')::int AS published7,
      count(*) FILTER (WHERE status = 'failed')::int AS failed,
      count(*) FILTER (WHERE status = 'manual')::int AS manual
    FROM posts`;
  const upcoming = await sql<Post[]>`
    SELECT * FROM posts WHERE status IN ('draft', 'approved') ORDER BY scheduled_at LIMIT 5`;
  const [{ first }] = await sql<{ first: Date | null }[]>`SELECT min(created_at) AS first FROM posts`;
  const day = first ? Math.floor((Date.now() - first.getTime()) / 86_400_000) + 1 : 0;

  const checks = [
    { label: "Claude API key", ok: !!s.anthropicApiKey },
    { label: `Niches (${s.niches.length})`, ok: s.niches.length > 0 },
    { label: `Platforms selected (${s.platforms.length})`, ok: s.platforms.length > 0 },
    ...s.platforms.map((p) => {
      const missing = missingFor(s, p);
      return { label: `${PLATFORM_LABELS[p]}${missing.length ? `: missing ${missing.join(", ")}` : ""}`, ok: !missing.length };
    }),
  ];
  const ready = checks.every((c) => c.ok);
  // Generation only needs Claude, niches and at least one platform that is ready.
  const canGenerate =
    !!s.anthropicApiKey && s.niches.length > 0 && s.platforms.some((p) => missingFor(s, p).length === 0);

  return (
    <>
      <Flash params={params} />
      <h1>Overview</h1>
      <p className="muted">
        {day === 0
          ? "No posts yet. Finish the setup, then generate your first posts."
          : day <= s.exploreDays
            ? `Exploration phase: day ${day} of ${s.exploreDays}. Trying every time slot, format and language.`
            : `Learning phase: day ${day}. ${Math.round((1 - s.epsilon) * 100)}% of choices follow what worked best.`}
      </p>

      <div className="stats">
        <a className="stat" href="/posts?tab=review"><b>{counts.drafts}</b><span>Waiting for approval</span></a>
        <a className="stat" href="/posts?tab=scheduled"><b>{counts.scheduled}</b><span>Scheduled</span></a>
        <a className="stat" href="/posts?tab=skool"><b>{counts.manual}</b><span>Skool to post</span></a>
        <a className="stat" href="/posts?tab=published"><b>{counts.published7}</b><span>Published (7 days)</span></a>
        <a className="stat" href="/posts?tab=failed"><b>{counts.failed}</b><span>Failed</span></a>
      </div>

      <section className="card">
        <h2>Setup {ready ? "✅" : ""}</h2>
        <ul className="checklist">
          {checks.map((c) => (
            <li key={c.label} className={c.ok ? "ok" : "todo"}>{c.ok ? "✓" : "✗"} {c.label}</li>
          ))}
        </ul>
        {!ready && <a className="button" href="/settings">Open Settings</a>}
      </section>

      <section className="card">
        <h2>Run now</h2>
        <p className="muted">
          Posts are planned automatically every night (22:00 Dhaka) and published hourly. You can also run it yourself.
          Generating takes up to a minute.
        </p>
        <div className="row">
          <form action={planNow}><button type="submit" disabled={!canGenerate}>Generate tomorrow’s posts</button></form>
          <form action={publishDueNow}><button type="submit" className="secondary">Publish due posts</button></form>
        </div>
      </section>

      <section>
        <h2>Coming up</h2>
        {upcoming.length === 0 && <Empty>Nothing scheduled.</Empty>}
        {upcoming.map((p) => (
          <div key={p.id} className="card compact">
            <PostMeta post={p} tzOffset={s.tzOffset} />
            <p className="preview">{p.body.slice(0, 160)}{p.body.length > 160 ? "…" : ""}</p>
            <span className={`status status-${p.status}`}>{p.status === "draft" ? "needs approval" : "scheduled"}</span>
          </div>
        ))}
      </section>
    </>
  );
}
