# ARCHITECTURE.md

## Layout
```
.
├── CLAUDE.md                     # rules for Claude (Bangla, truthful, concise)
├── AGENT.md                      # rules/roles for AI agents
├── ARCHITECTURE.md               # this file
├── README.md                     # results table + calculation + usage
├── requirements.txt              # requests, beautifulsoup4
├── data/
│   └── member_counts_research.csv  # researched counts with sources
├── scraper/
│   └── scrape_members.py         # directory crawler for 5 associations
└── output/                       # generated CSVs (git-ignored)
```

## Data flow
```
association website ──HTTP──> scrape_members.py ──> output/<assoc>_members.csv
                                               ├──> output/member_counts_scraped.csv (totals)
                                               └──> output/<assoc>_sample.csv (--sample N: lead details)
web/news research ───────────────────────────────> data/member_counts_research.csv ──> README.md
```

## Scraper design (`scraper/scrape_members.py`)
- `get_soup(url)` – fetch + parse, 1 s delay, errors logged not raised.
- `crawl_paginated(page_url, detail_pattern, pages)` – walks list pages, collects member detail links, stops when a page adds nothing new.
- `extract_lead(url)` – (`--sample` only) opens a member detail page, collects label/value pairs (tables, `<dl>`, "Label: value" lines), maps them to `LEAD_FIELDS`, falls back to email/BD-mobile regex, keeps everything in `raw_fields`.
- One function per association, registered in `ASSOCIATIONS`:

| Key | Site | Method |
|-----|------|--------|
| bgmea | bgmea.com.bd/page/member-list?page=N | paginated links `/member/{id}` |
| bkmea | bkmea.com/member/index.php?Index=all&Page=N | paginated links `MID=` |
| bpamea | bgapmea.org/index.php/member/index/{offset} | offset pagination (step 20) |
| bcmea | bcmea.org.bd/member-list/ | single HTML table |
| flaxa | flaxa.org.bd | WordPress REST API, fallback `/memberlist/page/N/` |

To add an association: write a `scrape_<name>()` returning a list of dicts (`name`, `url`, …) and add it to `ASSOCIATIONS`.
