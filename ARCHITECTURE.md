# ARCHITECTURE.md

## Layout
```
app/
  page.tsx               dashboard: approve drafts, Skool copy, metrics entry, insights
  actions.ts             server actions (approve, reject, manual metrics)
  api/cron/plan          daily  -> lib/jobs.planTomorrow
  api/cron/publish       hourly -> lib/jobs.publishDue
  api/cron/metrics       daily  -> lib/jobs.collectMetrics
  api/poster             1080x1080 PNG poster (next/og), public
lib/
  config.ts              env config, platforms, content types, slots
  db.ts                  Postgres client + Post type
  generate.ts            Claude: writes a post (structured output)
  strategy.ts            explore/exploit choice of slot, type, language, niche
  jobs.ts                plan / publish / metrics jobs
  cron.ts                CRON_SECRET check
  platforms/             facebook.ts, linkedin.ts, x.ts (+ types, index)
db/schema.sql            posts table
proxy.ts                 Basic-auth for the dashboard
vercel.json              cron schedules (UTC)
```

## Data flow
```
plan cron ─> strategy.chooseArms ─> generate (Claude) ─> posts[draft]
dashboard approve ─> posts[approved]
publish cron ─> platform adapter ─> posts[published]   (skool -> posts[manual] -> "I posted it")
metrics cron / manual entry ─> reach, reactions, comments, shares, score
score history ─> strategy (next day's choices) + dashboard insights
```

## Post status
`draft → approved → published` · `draft → rejected` · `approved → failed` (API error or missed 6h window) · skool: `approved → manual → published`

## Learning
- Arms per platform: slot_hour (8 options), content_type (8), language (en/bn), niche (NICHES).
- Days 1–EXPLORE_DAYS: pick least-tried option per dimension.
- Afterwards: best mean score (≥2 measured posts), with EXPLORE_RATE chance of least-tried.
- Score = reactions + 2·comments + 3·shares + reach/100 (compared within one platform).
