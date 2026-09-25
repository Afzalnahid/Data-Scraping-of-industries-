import { Empty } from "../ui";
import { PLATFORM_LABELS, type Platform } from "@/lib/config";
import { sql, type Post } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { insights } from "@/lib/strategy";

export const dynamic = "force-dynamic";

const DIM_LABELS: Record<string, string> = {
  slot_hour: "Time of day",
  content_type: "Format",
  language: "Language",
  niche: "Niche",
};

export default async function InsightsPage() {
  const s = await getSettings();
  const posts = await sql<Post[]>`SELECT * FROM posts WHERE status = 'published'`;
  const platforms = [...new Set([...s.platforms, ...posts.map((p) => p.platform)])] as Platform[];

  return (
    <>
      <h1>Insights</h1>
      <p className="muted">
        Score = reactions + 2×comments + 3×shares + reach/100. Options need 2 measured posts before the tool trusts them.
        Enter LinkedIn and Skool numbers on the Published tab.
      </p>
      {platforms.length === 0 && <Empty>No platforms yet.</Empty>}
      {platforms.map((platform) => {
        const rows = posts.filter((p) => p.platform === platform);
        const measured = rows.filter((p) => p.score !== null);
        const avg = measured.length ? measured.reduce((a, p) => a + (p.score ?? 0), 0) / measured.length : null;
        return (
          <section key={platform} className="card">
            <h2>{PLATFORM_LABELS[platform]}</h2>
            <p className="muted">
              {rows.length} published · {measured.length} measured · average score {avg?.toFixed(1) ?? "-"}
            </p>
            <div className="grid">
              {insights(rows).map(({ dimension, rows: options }) => (
                <table key={dimension}>
                  <thead>
                    <tr><th>{DIM_LABELS[dimension]}</th><th>posts</th><th>avg</th></tr>
                  </thead>
                  <tbody>
                    {options.length === 0 && <tr><td colSpan={3} className="muted">no data</td></tr>}
                    {options.map((o, i) => (
                      <tr key={o.option} className={i === 0 && o.avgScore !== null ? "best" : ""}>
                        <td>{dimension === "slot_hour" ? `${o.option}:00` : o.option.replace(/_/g, " ")}</td>
                        <td>{o.measured}/{o.tried}</td>
                        <td>{o.avgScore?.toFixed(1) ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}
