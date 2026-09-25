"""Scrape member directories of Bangladeshi export associations and count members.

Usage:
    python scraper/scrape_members.py                 # all associations
    python scraper/scrape_members.py bgmea bcmea     # selected ones

Writes one CSV per association to output/<assoc>_members.csv and a summary to
output/member_counts_scraped.csv.

The directory URL patterns below were derived from each site's indexed pages
(September 2026). Websites change; if an association returns 0 members, open its
list URL in a browser and adjust the pattern in ASSOCIATIONS.
"""

import csv
import re
import sys
import time
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

OUTPUT_DIR = Path(__file__).resolve().parent.parent / "output"
HEADERS = {"User-Agent": "Mozilla/5.0 (research; member-count scraper)"}
DELAY_SECONDS = 1.0
MAX_PAGES = 500

session = requests.Session()
session.headers.update(HEADERS)


def get_soup(url):
    try:
        resp = session.get(url, timeout=30)
    except requests.RequestException as exc:
        print(f"  ! {url}: {exc}")
        return None
    time.sleep(DELAY_SECONDS)
    if resp.status_code != 200:
        print(f"  ! {url}: HTTP {resp.status_code}")
        return None
    return BeautifulSoup(resp.text, "html.parser")


def crawl_paginated(page_url, detail_pattern, pages):
    """Walk list pages, collecting links that match detail_pattern.

    Stops when a page yields no new member links.
    """
    regex = re.compile(detail_pattern)
    members = {}
    for page in pages:
        url = page_url.format(page=page)
        soup = get_soup(url)
        if soup is None:
            break
        new = 0
        for a in soup.find_all("a", href=True):
            href = urljoin(url, a["href"]).split("#")[0]
            if regex.search(href) and href not in members:
                members[href] = a.get_text(" ", strip=True)
                new += 1
        print(f"  page {page}: +{new} (total {len(members)})")
        if new == 0:
            break
    return [{"name": name, "url": href} for href, name in members.items()]


def scrape_bgmea():
    # https://www.bgmea.com.bd/page/member-list?page=N -> /member/{id}
    return crawl_paginated(
        "https://www.bgmea.com.bd/page/member-list?page={page}",
        r"bgmea\.com\.bd/member/\d+",
        range(1, MAX_PAGES),
    )


def scrape_bkmea():
    # Legacy PHP directory; the newer portal (member.bkmea.com) may need login.
    return crawl_paginated(
        "https://www.bkmea.com/member/index.php?Index=all&Page={page}",
        r"member_details\.php\?.*MID=\d+|member\.bkmea\.com/member/details/\d+",
        range(1, MAX_PAGES),
    )


def scrape_bpamea():
    # CodeIgniter list paginated by record offset -> member_details/{id}
    return crawl_paginated(
        "https://www.bgapmea.org/index.php/member/index/{page}",
        r"member/member_details/\d+",
        range(0, MAX_PAGES * 20, 20),
    )


def scrape_bcmea():
    # Single table page: Company | Products | Membership No | Date | Address | Status
    soup = get_soup("https://bcmea.org.bd/member-list/")
    if soup is None:
        return []
    rows = []
    for table in soup.find_all("table"):
        headers = [th.get_text(" ", strip=True) for th in table.find_all("th")]
        for tr in table.find_all("tr"):
            cells = [td.get_text(" ", strip=True) for td in tr.find_all("td")]
            if not cells or not any(cells):
                continue
            row = dict(zip(headers, cells)) if headers else {}
            row.setdefault("name", cells[0])
            row["cells"] = " | ".join(cells)
            rows.append(row)
    return rows


def scrape_flaxa():
    # WordPress: try REST API first, fall back to /memberlist/page/N/
    api = "https://flaxa.org.bd/wp-json/wp/v2/memberlist?per_page=100&page={page}"
    members = []
    for page in range(1, 50):
        try:
            resp = session.get(api.format(page=page), timeout=30)
        except requests.RequestException:
            break
        if resp.status_code != 200:
            break
        items = resp.json()
        if not items:
            break
        for item in items:
            members.append({"name": item.get("title", {}).get("rendered", ""),
                            "url": item.get("link", "")})
        time.sleep(DELAY_SECONDS)
    if members:
        return members
    first = crawl_paginated("https://flaxa.org.bd/index.php/memberlist/",
                            r"/memberlist/(?!page/)[a-z0-9-]+/?$", [1])
    rest = crawl_paginated("https://flaxa.org.bd/index.php/memberlist/page/{page}/",
                           r"/memberlist/(?!page/)[a-z0-9-]+/?$", range(2, MAX_PAGES))
    seen = {m["url"] for m in first}
    return first + [m for m in rest if m["url"] not in seen]


ASSOCIATIONS = {
    "bgmea": scrape_bgmea,
    "bkmea": scrape_bkmea,
    "bpamea": scrape_bpamea,
    "bcmea": scrape_bcmea,
    "flaxa": scrape_flaxa,
}


def write_csv(path, rows):
    fields = sorted({k for r in rows for k in r}) or ["name", "url"]
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)


def main(selected):
    OUTPUT_DIR.mkdir(exist_ok=True)
    summary = []
    for key in selected:
        print(f"== {key.upper()}")
        rows = ASSOCIATIONS[key]()
        write_csv(OUTPUT_DIR / f"{key}_members.csv", rows)
        print(f"  -> {len(rows)} members")
        summary.append({"association": key.upper(), "members_scraped": len(rows)})
    total = sum(s["members_scraped"] for s in summary)
    summary.append({"association": "TOTAL", "members_scraped": total})
    write_csv(OUTPUT_DIR / "member_counts_scraped.csv", summary)
    print(f"\nTOTAL members scraped: {total}")


if __name__ == "__main__":
    args = [a.lower() for a in sys.argv[1:]] or list(ASSOCIATIONS)
    unknown = [a for a in args if a not in ASSOCIATIONS]
    if unknown:
        sys.exit(f"Unknown association(s): {', '.join(unknown)}. Choose from {', '.join(ASSOCIATIONS)}")
    main(args)
