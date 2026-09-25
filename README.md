# Data-Scraping-of-industries-
this is a data scraping project of textile industries and the companies

## Member companies of Bangladeshi export associations

Research date: 25 September 2026. Raw figures: [`data/member_counts_research.csv`](data/member_counts_research.csv).

| # | Association | Registered / claimed members | Active / working members | Source & date |
|---|-------------|-----------------------------:|-------------------------:|---------------|
| 1 | **BGMEA** – Bangladesh Garment Manufacturers and Exporters Association | 4,275 | 1,806 | Member-list counter on bgmea.com.bd (another crawl showed 4,248); active = 2025 audit (Dhaka 1,482 + Chattogram 324), TBS News |
| 2 | **BKMEA** – Bangladesh Knitwear Manufacturers and Exporters Association | 2,540 | ~2,420 *(estimate)* | bkmea.com "At a Glance"; Just Style, Jul 2025. Active = 2,540 − ~120 closures (Jul 2023–Jun 2026) |
| 3 | **BPAMEA** – Bangladesh Packaging & Accessories Manufacturers & Exporters Association (formerly BGAPMEA) | ~2,100 | ~2,100 *(no split published)* | bgapmea.org homepage (2025); TBS News "more than 2,100" |
| 4 | **BCMEA** – Bangladesh Ceramic Manufacturers & Exporters Association | 75 | 75 | TBS supplement, mid-2026: 31 tiles + 20 tableware + 20 sanitaryware + 4 bricks |
| 5 | **FLAXA** – Footwear Leathergoods & Accessories Exporters Association (formerly LFMEAB, renamed 5 Mar 2026) | ~190 *(estimate)* | ~190 | flaxa.org.bd directory has 19 pages × ~10 entries (181–190); no published total |

### Calculation

**Total registered / claimed members**

```
BGMEA 4,275 + BKMEA 2,540 + BPAMEA 2,100 + BCMEA 75 + FLAXA 190 = 9,180
```

**Total active / working members**

```
BGMEA 1,806 + BKMEA 2,420 + BPAMEA 2,100 + BCMEA 75 + FLAXA 190 = 6,591
```

So the five associations together have **about 9,180 member companies on their books**, of which **about 6,600 are active**.

### Caveats

- The official websites were not reachable from the research environment (network policy), so these figures come from search-engine indexes of the official pages and from news reports. They have not been checked against the live directories. Run the scraper below to get exact counts.
- BGMEA's 4,275 includes closed/inactive factories. Its "at a glance" page still says "around 4,500", which is an older figure.
- BKMEA's active number and the FLAXA total are estimates, not published figures.
- BPAMEA's ~2,100 is a rounded figure the association publishes. Its online directory appears to hold only ~1,400 records.
- Some companies belong to both BGMEA and BKMEA, so the grand total may count them twice.

## Scraper

`scraper/scrape_members.py` crawls each association's online member directory. It saves one CSV per association and a count summary into `output/`.

```bash
pip install -r requirements.txt
python scraper/scrape_members.py            # all five
python scraper/scrape_members.py bcmea      # just one
python scraper/scrape_members.py bgmea --sample 10   # 10 leads with contact details
```

`--sample N` opens each member's detail page and writes `output/<assoc>_sample.csv` with: company name, reg. no, contact person, email, director info, MD name, mobile, address. The field labels on the live sites are not verified yet; check the `raw_fields` column and adjust `LEAD_FIELDS` in the script if a column is empty.

This needs a normal internet connection. If an association returns 0, its website layout has probably changed. Adjust that association's URL pattern in the script.

### Set up in `D:\data scraping` (Windows)

```powershell
cd D:\
git clone -b claude/bangladesh-industry-scraper-eygd7e https://github.com/afzalnahid/data-scraping-of-industries-.git "data scraping"
cd "data scraping"
pip install -r requirements.txt
python scraper\scrape_members.py
```
