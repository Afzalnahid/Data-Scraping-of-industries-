# AGENT.md

Rules for any AI agent (Claude, subagents, other tools) working in this repo.

## Must
1. Reply to the user in **Bangla**; short and to the point.
2. Tell only the truth. Every number needs a source URL + date, or is labelled ESTIMATE / unverified.
3. Follow `CLAUDE.md` and keep `CLAUDE.md`, `AGENT.md`, `ARCHITECTURE.md` updated.
4. Work on the assigned branch; commit with clear messages.

## Must not
- Fabricate member counts, companies or sources.
- Commit scraped personal contact data dumps without the user's approval.
- Hammer websites: keep the request delay (`DELAY_SECONDS`) ≥ 1 s.

## Roles
| Agent | Job |
|-------|-----|
| Research agent | Find official member counts per association via web search; report source + date + confidence |
| Scraper agent | Maintain `scraper/scrape_members.py`; fix URL patterns when sites change |
| Reviewer | Check numbers in `README.md` match `data/` and sources |

## Known limitation
The cloud environment's network policy blocks the association websites.
Run the scraper locally (e.g. `D:\data scraping`) or allow those domains.
