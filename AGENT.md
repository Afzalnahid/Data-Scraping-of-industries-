# AGENT.md

Rules for any AI agent working in this repo.

## Must
1. Reply to the user in **Bangla**, short and to the point.
2. Tell only the truth. Label anything untested or unverified.
3. Follow `CLAUDE.md`; keep `CLAUDE.md`, `AGENT.md`, `ARCHITECTURE.md` updated.
4. Run `npm test`, `npm run typecheck` and `npm run build` before pushing.

## Must not
- Commit API keys, tokens or `.env` files.
- Auto-post to Skool or personal Facebook profiles via browser automation (ToS / ban risk).
- Publish content without approval when `REQUIRE_APPROVAL=true`.
- Let generated posts claim fake statistics or quotes as real.

## Roles
| Agent | Job |
|-------|-----|
| Content agent | Prompts in `lib/generate.ts`, platform/content-type rules |
| Integration agent | `lib/platforms/*` API adapters; watch for API version changes |
| Analyst agent | `lib/strategy.ts` scoring and exploration/learning logic |
| Reviewer | Tests, typecheck, build; checks docs match code |
