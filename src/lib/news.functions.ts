import { createServerFn } from "@tanstack/react-start";

export type NewsItem = {
  id: string;
  title: string;
  link: string;
  source: string;
  sourceId: string;
  region: string;
  pubDate: string;
  description: string;
};

type Feed = { id: string; name: string; region: string; url: string };

const FEEDS: Feed[] = [
  { id: "bbc", name: "BBC World", region: "UK", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
  { id: "aje", name: "Al Jazeera", region: "Qatar", url: "https://www.aljazeera.com/xml/rss/all.xml" },
  { id: "npr", name: "NPR World", region: "US", url: "https://feeds.npr.org/1004/rss.xml" },
  { id: "dw", name: "Deutsche Welle", region: "Germany", url: "https://rss.dw.com/rdf/rss-en-world" },
  { id: "france24", name: "France 24", region: "France", url: "https://www.france24.com/en/rss" },
  { id: "guardian", name: "The Guardian", region: "UK", url: "https://www.theguardian.com/world/rss" },
  { id: "nyt", name: "New York Times", region: "US", url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml" },
  { id: "reuters", name: "Reuters (via GN)", region: "Global", url: "https://news.google.com/rss/search?q=when:24h+site:reuters.com&hl=en-US&gl=US&ceid=US:en" },
];

function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&nbsp;/g, " ");
}

function stripTags(s: string): string {
  return decodeEntities(s).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function pick(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return m ? decodeEntities(m[1]).trim() : "";
}

function parseItems(xml: string, feed: Feed): NewsItem[] {
  const items: NewsItem[] = [];
  const re = /<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(xml)) && i < 25) {
    const block = m[2];
    const title = stripTags(pick(block, "title"));
    let link = pick(block, "link");
    if (link.startsWith("<")) link = "";
    if (!link) {
      const lm = block.match(/<link[^>]*href=["']([^"']+)["']/i);
      if (lm) link = lm[1];
    }
    const description = stripTags(pick(block, "description") || pick(block, "summary") || pick(block, "content"));
    const pubDate = pick(block, "pubDate") || pick(block, "published") || pick(block, "updated") || pick(block, "dc:date");
    if (!title || !link) continue;
    items.push({
      id: `${feed.id}-${i}-${link.slice(-40)}`,
      title,
      link,
      source: feed.name,
      sourceId: feed.id,
      region: feed.region,
      pubDate: pubDate || new Date().toISOString(),
      description: description.slice(0, 280),
    });
    i++;
  }
  return items;
}

async function fetchFeed(feed: Feed): Promise<NewsItem[]> {
  try {
    const res = await fetch(feed.url, {
      headers: { "user-agent": "Mozilla/5.0 MeridianBot/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseItems(xml, feed);
  } catch {
    return [];
  }
}

export const getWorldNews = createServerFn({ method: "GET" }).handler(async () => {
  const all = await Promise.all(FEEDS.map(fetchFeed));
  const items = all.flat();
  items.sort((a, b) => {
    const ta = Date.parse(a.pubDate) || 0;
    const tb = Date.parse(b.pubDate) || 0;
    return tb - ta;
  });
  return {
    fetchedAt: new Date().toISOString(),
    sources: FEEDS.map((f) => ({ id: f.id, name: f.name, region: f.region })),
    items: items.slice(0, 120),
  };
});