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
Scrape member-company directories of Bangladeshi export associations
(BGMEA, BKMEA, BPAMEA, BCMEA, FLAXA) and count members.
See `ARCHITECTURE.md` for layout.

## Commands
```bash
pip install -r requirements.txt
python scraper/scrape_members.py [bgmea|bkmea|bpamea|bcmea|flaxa ...]
python scraper/scrape_members.py bgmea --sample 10   # lead details for 10 members
```

## Conventions
- Research figures go in `data/member_counts_research.csv` with source URL and date.
- Scraped output goes in `output/` (git-ignored).
- Mark estimates clearly as ESTIMATE.
