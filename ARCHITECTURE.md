# ARCHITECTURE.md

## Layout
```
app/
  page.tsx               Overview: setup checklist, counts, run-now buttons
  posts/page.tsx         Review / Scheduled / Skool / Published / Failed tabs
  insights/page.tsx      best slot, format, language, niche per platform
  settings/page.tsx      paste keys & tokens, test connections
  ui.tsx                 shared UI pieces
  actions.ts             server actions (settings, approve, publish now, metrics, run jobs)
  api/cron/plan          daily  -> lib/jobs.planTomorrow
  api/cron/publish       hourly (GitHub Actions) -> lib/jobs.publishDue
  api/cron/metrics       daily  -> lib/jobs.collectMetrics
  api/poster             1080x1080 PNG poster (next/og), public
lib/
  config.ts              fixed lists: platforms, content types, slots
  settings.ts            dashboard settings (DB, secrets encrypted, env fallback)
  crypto.ts              AES-256-GCM for saved secrets
  db.ts                  Postgres client + Post type
  generate.ts            Claude: writes a post (structured output)
  strategy.ts            explore/exploit choice of slot, type, language, niche
  jobs.ts                plan / publish / metrics jobs
  cron.ts                CRON_SECRET check
  platforms/             facebook.ts, linkedin.ts, x.ts (+ types, index)
db/schema.sql            posts + settings tables
proxy.ts                 Basic-auth for the dashboard
vercel.json              daily cron schedules (UTC), region bom1
.github/workflows/publish-cron.yml  hourly call to /api/cron/publish
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

## Settings
- Stored in the `settings` table as key/value. Secret fields are encrypted with AES-256-GCM, using a key derived from `SETTINGS_SECRET` (or `CRON_SECRET` if that is not set).
- `getSettings()` reads each value from the DB first. If nothing is saved it falls back to the env var of the same name in upper case, and then to the field's default.
- Platform adapters receive `Settings` and never read `process.env` directly.
