# STATUS.md — handoff for the next session

Last updated: 2026-09-26. Read this together with `CLAUDE.md` and `ARCHITECTURE.md`.

## Live infrastructure
| What | Where |
|---|---|
| App (production) | https://social-autopilot-ebon.vercel.app (Basic auth, password = Vercel env `DASHBOARD_PASSWORD`) |
| Vercel project | `social-autopilot` (id `prj_msXcVOQdRhM20BWJCowvRqsHAl5l`), team `nahidafzal97-8778s-projects`, region bom1, Hobby plan |
| Database | Supabase project `social-autopilot` (ref `lzbuvsfnircapwacwdaf`, ap-south-1), tables `posts`, `settings` |
| DB role used by app | `social_app` (RLS policies on both tables), via transaction pooler `aws-0-ap-south-1.pooler.supabase.com:6543` |
| Vercel env vars set | DATABASE_URL, CRON_SECRET, DASHBOARD_PASSWORD, APP_URL, TZ_OFFSET_HOURS, REQUIRE_APPROVAL, ENABLED_PLATFORMS |
| Crons | Vercel: plan 16:00 UTC, metrics 03:30 UTC. Hourly publish: `.github/workflows/publish-cron.yml` |

Secrets are NOT in this file. Get them from Vercel env / the owner.

## Done
- Dashboard: Overview, Posts (review/approve/post now/Skool/metrics/retry), Insights, Settings (encrypted keys, test connection).
- Claude post generation (EN + BN), Facebook/LinkedIn/X adapters, explore→exploit learning.
- Tested locally end-to-end with Playwright against a local Postgres.

## Not yet verified
- Live site with the real database (never opened from the cloud session — vercel.app was blocked there).
- Real Claude generation and real Facebook/LinkedIn/X publishing (no keys entered yet).

## Next steps (owner)
1. Log in to the app, Settings → paste Claude API key + niches → Test connection.
2. Facebook Page ID + Page token → Test connection.
3. GitHub repo secrets `APP_URL`, `CRON_SECRET` for the hourly publish workflow.
4. Overview → "Generate tomorrow's posts", then approve on Posts.

## Ideas discussed
- Use Blotato (one API for many platforms) instead of per-platform tokens.
- Grow into a multi-user Blotato-like SaaS (needs OAuth connect, platform app reviews, billing).
