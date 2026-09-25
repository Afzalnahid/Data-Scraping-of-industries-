"""Scrape member directories of Bangladeshi export associations and count members.

Usage:
    python scraper/scrape_members.py                 # all associations
    python scraper/scrape_members.py bgmea bcmea     # selected ones
    python scraper/scrape_members.py bgmea --sample 10

Writes one CSV per association to output/<assoc>_members.csv and a summary to
output/member_counts_scraped.csv.

--sample N stops after N members, opens each member's detail page and writes
the lead fields (company, reg no, contact person, email, director, MD name,
mobile, address) to output/<assoc>_sample.csv. The field labels on each site
have not been verified; the "raw_fields" column keeps every label/value found
on the page so the mapping can be fixed.

The directory URL patterns below were derived from each site's indexed pages
(September 2026). Websites change; if an association returns 0 members, open its
list URL in a browser and adjust the pattern in ASSOCIATIONS.
"""

import argparse
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
LIMIT = None  # set by --sample; crawlers stop once this many members are found

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
        if new == 0 or (LIMIT and len(members) >= LIMIT):
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


LEAD_FIELDS = {
    "company_name": ["company name", "name of company", "company", "factory name", "member name"],
    "reg_no": ["reg. no", "reg no", "registration", "membership no", "membership", "member no", "reg"],
    "contact_person": ["contact person", "contact name", "contact"],
    "email": ["e-mail", "email", "mail"],
    "director_info": ["designation", "director information", "director"],
    "md_name": ["managing director", "md name", "md", "chairman", "owner"],
    "mobile": ["mobile", "cell", "phone", "telephone", "tel"],
    "address": ["factory address", "office address", "address"],
}
EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
PHONE_RE = re.compile(r"(?:\+?88)?01[3-9]\d{2}[-\s]?\d{6}")


def extract_label_values(soup):
    """Collect label/value pairs from tables, definition lists and 'Label: value' text."""
    pairs = []
    for tr in soup.find_all("tr"):
        cells = [c.get_text(" ", strip=True) for c in tr.find_all(["th", "td"])]
        cells = [c for c in cells if c and c != ":"]
        for i in range(0, len(cells) - 1, 2):
            pairs.append((cells[i], cells[i + 1]))
    for dt in soup.find_all("dt"):
        dd = dt.find_next_sibling("dd")
        if dd:
            pairs.append((dt.get_text(" ", strip=True), dd.get_text(" ", strip=True)))
    for line in soup.get_text("\n").splitlines():
        if ":" in line:
            label, _, value = line.partition(":")
            if 0 < len(label.strip()) <= 40 and value.strip():
                pairs.append((label.strip(), value.strip()))
    return [(l.rstrip(" :"), v.lstrip(": ")) for l, v in pairs]


def extract_lead(url):
    soup = get_soup(url)
    if soup is None:
        return {"url": url}
    pairs = extract_label_values(soup)
    lead = {"url": url}
    for field, keys in LEAD_FIELDS.items():
        for key in keys:
            match = next((v for l, v in pairs if key in l.lower()), None)
            if match:
                lead[field] = match
                break
    text = soup.get_text(" ")
    if "email" not in lead and (m := EMAIL_RE.search(text)):
        lead["email"] = m.group(0)
    if "mobile" not in lead and (m := PHONE_RE.search(text)):
        lead["mobile"] = m.group(0)
    if "company_name" not in lead and soup.title:
        lead["company_name"] = soup.title.get_text(strip=True)
    lead["raw_fields"] = " | ".join(f"{l}: {v}" for l, v in dict(pairs).items())[:2000]
    return lead


ASSOCIATIONS = {
    "bgmea": scrape_bgmea,
    "bkmea": scrape_bkmea,
    "bpamea": scrape_bpamea,
    "bcmea": scrape_bcmea,
    "flaxa": scrape_flaxa,
}


def write_csv(path, rows, fields=None):
    fields = fields or sorted({k for r in rows for k in r}) or ["name", "url"]
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)


def main(selected, sample=None):
    global LIMIT
    LIMIT = sample
    OUTPUT_DIR.mkdir(exist_ok=True)
    summary = []
    for key in selected:
        print(f"== {key.upper()}")
        rows = ASSOCIATIONS[key]()
        if sample:
            rows = rows[:sample]
            leads = []
            for i, row in enumerate(rows, 1):
                if row.get("url"):
                    print(f"  detail {i}/{len(rows)}: {row['url']}")
                    lead = extract_lead(row["url"])
                else:
                    lead = {"company_name": row.get("name", ""), "raw_fields": row.get("cells", "")}
                lead.setdefault("company_name", row.get("name", ""))
                leads.append(lead)
            fields = list(LEAD_FIELDS) + ["url", "raw_fields"]
            write_csv(OUTPUT_DIR / f"{key}_sample.csv", leads, fields)
            print(f"  -> {len(leads)} sample leads written to output/{key}_sample.csv")
            continue
        write_csv(OUTPUT_DIR / f"{key}_members.csv", rows)
        print(f"  -> {len(rows)} members")
        summary.append({"association": key.upper(), "members_scraped": len(rows)})
    if sample:
        return
    total = sum(s["members_scraped"] for s in summary)
    summary.append({"association": "TOTAL", "members_scraped": total})
    write_csv(OUTPUT_DIR / "member_counts_scraped.csv", summary)
    print(f"\nTOTAL members scraped: {total}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("associations", nargs="*",
                        help=f"any of: {', '.join(ASSOCIATIONS)} (default: all)")
    parser.add_argument("--sample", type=int, metavar="N",
                        help="scrape only N members and extract their lead details")
    args = parser.parse_args()
    unknown = [a for a in args.associations if a.lower() not in ASSOCIATIONS]
    if unknown:
        parser.error(f"unknown association(s): {', '.join(unknown)}")
    if args.sample is not None and args.sample < 1:
        parser.error("--sample must be at least 1")
    main([a.lower() for a in args.associations] or list(ASSOCIATIONS), args.sample)
