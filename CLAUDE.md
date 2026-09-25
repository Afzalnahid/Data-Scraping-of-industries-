# CLAUDE.md

## Communication rules (mandatory)
- Always reply to the user in **Bangla (বাংলা)**. Code, commands and file names stay in English.
- Always tell the truth. Never invent numbers or sources; say "যাচাই করা যায়নি" when something is unverified.
- Keep replies short and point-to-point. Minimise tokens.

## Mandatory files
Keep these up to date whenever the project changes:
- `CLAUDE.md` – rules for Claude
- `AGENT.md` – rules/roles for any AI agent working here
- `ARCHITECTURE.md` – project structure and data flow

## Project
Social Autopilot: Next.js app on Vercel that writes daily posts (English + Bangla)
with Claude, publishes to Facebook Page / LinkedIn / X (Skool = manual copy),
collects engagement and learns the best time, format, language and niche.
See `ARCHITECTURE.md`.

## Commands
```bash
npm install
npm run dev
npm test          # node --test (strategy, X OAuth)
npm run typecheck
npm run build
```

## Conventions
- All config via env vars (`.env.example`); never commit secrets.
- Platform code lives in `lib/platforms/<name>.ts` implementing `PlatformAdapter`.
- Claude calls only in `lib/generate.ts` (Anthropic TS SDK, structured output, `fallbacks: "default"`).
- Pure logic (strategy) must stay testable without DB or network.
