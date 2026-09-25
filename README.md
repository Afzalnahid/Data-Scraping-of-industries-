# Social Autopilot

Writes a post every day for **Facebook Page, LinkedIn (personal), X and Skool** in English and Bangla, publishes it, measures engagement, and learns which **time, format, language and niche** work best.

## How it works

1. **Plan** (daily cron, 22:00 Dhaka): for each platform, picks a time slot, content type, language and niche, and asks Claude to write the post. The post is saved as a draft.
2. **Approve** on the dashboard (you can edit the text). Set `REQUIRE_APPROVAL=false` to skip this step.
3. **Publish** (hourly cron): posts approved posts at their scheduled time. Skool has no API, so its posts show up on the dashboard for you to copy.
4. **Measure** (daily cron): fetches reactions, comments, shares and reach from Facebook and X. LinkedIn personal analytics and Skool are entered by hand on the dashboard.
5. **Learn**
   - For the first `EXPLORE_DAYS` (7), it tries every slot and format evenly.
   - After that, each choice follows the best average score, and 20% of choices keep experimenting.
   - Score = reactions + 2×comments + 3×shares + reach/100.

Posters: `poster_quote` posts on Facebook get a 1080×1080 image from `/api/poster`. Poster headlines are always English, because the image renderer garbles Bangla.

## Platform limits

| Platform | Auto-post | Auto-metrics |
|---|---|---|
| Facebook Page | ✅ | ✅ (reach metric name can change between Graph API versions) |
| LinkedIn personal | ✅ text only | ❌ manual entry |
| X | ✅ text only | ⚠️ may need a paid API tier; otherwise manual |
| Skool | ❌ copy from dashboard | ❌ manual entry |

## Setup

1. Create a Postgres database and run `db/schema.sql` on it.
2. Deploy to Vercel. Copy `.env.example` into the project's Environment Variables and fill it in.
3. The crons are in `vercel.json`. The hourly publish cron needs a **Vercel Pro** plan, because Hobby only allows daily crons. On Hobby, call `/api/cron/publish` hourly from an external scheduler (e.g. cron-job.org) with the header `Authorization: Bearer $CRON_SECRET`.
4. Open the app and log in with `DASHBOARD_PASSWORD`.

## Development

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # strategy + OAuth tests
npm run typecheck
```
