#!/usr/bin/env python3
"""
Microsoft Security News Feed Fetcher

MVP:
- Fetch Microsoft Security Blog RSS feed
- Clean/normalise entries
- Deduplicate
- Generate JSON for frontend
- Generate aggregated RSS feed
"""

import json
import os
import re
from datetime import datetime, timedelta, timezone
from html import unescape
from xml.etree.ElementTree import Element, SubElement, tostring

import feedparser

SITE_NAME = "Microsoft Security News"
SITE_URL = "https://security.libredevops.org"
SITE_DESCRIPTION = "Aggregated Microsoft security news and advisories"

MAX_ARTICLE_AGE_DAYS = 30
MAX_RSS_ITEMS = 50

SOURCES = {
    "mssecurity": {
        "name": "Microsoft Security Blog",
        "url": "https://www.microsoft.com/security/blog/feed/",
        "vendor": "Microsoft",
        "category": "Security",
        "default_author": "Microsoft",
    }
}


def clean_html(text: str) -> str:
    """Strip HTML tags and normalise whitespace."""
    if not text:
        return ""

    text = re.sub(r"<[^>]+>", "", text)
    text = unescape(text)
    text = re.sub(r"\s+", " ", text)

    return text.strip()


def truncate(text: str, max_length: int = 300) -> str:
    """Truncate without cutting words."""
    if len(text) <= max_length:
        return text

    return text[:max_length].rsplit(" ", 1)[0] + "..."


def parse_date(entry) -> str:
    """Convert feed dates into ISO8601 UTC strings."""
    for field in ("published_parsed", "updated_parsed"):
        parsed = entry.get(field)
        if parsed:
            try:
                dt = datetime(*parsed[:6], tzinfo=timezone.utc)
                return dt.isoformat()
            except (ValueError, TypeError):
                pass

    for field in ("published", "updated"):
        value = entry.get(field)
        if value:
            try:
                parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
                return parsed.astimezone(timezone.utc).isoformat()
            except ValueError:
                return value

    return datetime.now(timezone.utc).isoformat()


def fetch_feed(source_id: str, source: dict) -> list[dict]:
    """Fetch and normalise a single RSS/Atom feed."""
    print(f"Fetching {source['name']}...")

    try:
        feed = feedparser.parse(source["url"])

        if feed.bozo and not feed.entries:
            print(f"Failed to parse {source['name']}")
            return []

        articles = []

        for entry in feed.entries:
            summary = clean_html(entry.get("summary", ""))

            article = {
                "title": clean_html(entry.get("title", "Untitled")),
                "link": entry.get("link", ""),
                "published": parse_date(entry),
                "summary": truncate(summary),
                "source": source["name"],
                "source_id": source_id,
                "vendor": source["vendor"],
                "category": source["category"],
                "author": entry.get("author", source["default_author"]),
            }

            articles.append(article)

        print(f"Found {len(articles)} articles")
        return articles

    except Exception as ex:
        print(f"Error fetching {source['name']}: {ex}")
        return []


def deduplicate_articles(articles: list[dict]) -> list[dict]:
    """Remove duplicate links and old articles."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=MAX_ARTICLE_AGE_DAYS)

    seen_links = set()
    unique = []

    for article in articles:
        link = article.get("link")
        published = article.get("published", "")

        if not link or link in seen_links:
            continue

        try:
            published_dt = datetime.fromisoformat(
                published.replace("Z", "+00:00")
            )
        except ValueError:
            continue

        if published_dt < cutoff:
            continue

        seen_links.add(link)
        unique.append(article)

    return unique


def generate_json_feed(articles: list[dict]) -> None:
    """Write frontend JSON feed."""
    os.makedirs("data", exist_ok=True)

    payload = {
        "site": SITE_NAME,
        "lastUpdated": datetime.now(timezone.utc).isoformat(),
        "totalArticles": len(articles),
        "articles": articles,
    }

    output = os.path.join("data", "feeds.json")

    with open(output, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)

    print(f"JSON feed written to {output}")


def generate_rss_feed(articles: list[dict]) -> None:
    """Generate RSS feed from aggregated articles."""
    rss = Element("rss", version="2.0")
    rss.set("xmlns:dc", "http://purl.org/dc/elements/1.1/")

    channel = SubElement(rss, "channel")

    SubElement(channel, "title").text = SITE_NAME
    SubElement(channel, "link").text = SITE_URL
    SubElement(channel, "description").text = SITE_DESCRIPTION
    SubElement(channel, "generator").text = "Microsoft Security News Feed"
    SubElement(channel, "language").text = "en"

    SubElement(channel, "lastBuildDate").text = datetime.now(
        timezone.utc
    ).strftime("%a, %d %b %Y %H:%M:%S GMT")

    for article in articles[:MAX_RSS_ITEMS]:
        item = SubElement(channel, "item")

        SubElement(item, "title").text = article["title"]
        SubElement(item, "link").text = article["link"]
        SubElement(item, "guid").text = article["link"]
        SubElement(item, "description").text = article["summary"]
        SubElement(item, "dc:creator").text = article["author"]
        SubElement(item, "category").text = article["category"]

        try:
            dt = datetime.fromisoformat(
                article["published"].replace("Z", "+00:00")
            )
            SubElement(item, "pubDate").text = dt.strftime(
                "%a, %d %b %Y %H:%M:%S GMT"
            )
        except ValueError:
            pass

    xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml += tostring(rss, encoding="unicode")

    output = os.path.join("data", "feed.xml")

    with open(output, "w", encoding="utf-8") as f:
        f.write(xml)

    print(f"RSS feed written to {output}")


def main():
    print("=" * 60)
    print(SITE_NAME)
    print("=" * 60)

    articles = []

    for source_id, source in SOURCES.items():
        articles.extend(fetch_feed(source_id, source))

    articles.sort(key=lambda x: x["published"], reverse=True)

    unique_articles = deduplicate_articles(articles)

    generate_json_feed(unique_articles)
    generate_rss_feed(unique_articles)

    print("=" * 60)
    print(f"Done. {len(unique_articles)} articles generated.")
    print("=" * 60)


if __name__ == "__main__":
    main()