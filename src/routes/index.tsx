import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowUpRight, Globe2, Radio } from "lucide-react";
import { getWorldNews, type NewsItem } from "@/lib/news.functions";
import { cn } from "@/lib/utils";
import meridianSymbol from "@/assets/meridian-symbol.png";

const newsQuery = () =>
  queryOptions({
    queryKey: ["world-news"],
    queryFn: () => getWorldNews(),
    staleTime: 1000 * 60 * 5,
  });

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "newsofia — World News from Many Sources" },
      {
        name: "description",
        content:
          "A real-time, source-by-source digest of world news from BBC, Al Jazeera, NPR, DW, France 24, Guardian, NYT and Reuters.",
      },
      { property: "og:title", content: "newsofia — World News from Many Sources" },
      {
        property: "og:description",
        content: "Read the world's headlines side-by-side, without picking a single point of view.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(newsQuery()),
  component: Index,
});

function formatAgo(iso: string): string {
  const t = Date.parse(iso);
  if (!t) return "";
  const diff = Math.max(0, Date.now() - t);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function Index() {
  const { data } = useSuspenseQuery(newsQuery());
  const [activeSource, setActiveSource] = useState<string>("all");

  const filtered = useMemo(() => {
    if (activeSource === "all") return data.items;
    return data.items.filter((i) => i.sourceId === activeSource);
  }, [activeSource, data.items]);

  const lead = filtered[0];
  const rest = filtered.slice(1);
  const tickerItems = data.items.slice(0, 14);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Ticker */}
      <div className="border-b border-border bg-card/40">
        <div className="ticker-mask overflow-hidden">
          <div className="flex animate-[ticker_60s_linear_infinite] gap-10 whitespace-nowrap py-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {[...tickerItems, ...tickerItems].map((t, idx) => (
              <span key={idx} className="flex items-center gap-3">
                <span className="text-primary">●</span>
                <span className="text-foreground/80">{t.source}</span>
                <span>{t.title}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Masthead */}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-end justify-between gap-6 px-6 py-8 md:px-10">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.32em] text-primary">
              <Globe2 className="h-3.5 w-3.5" />
              <span>Vol. I · {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</span>
            </div>
            <div className="mt-3 flex items-center gap-4">
              <img
                src={meridianSymbol}
                alt="newsofia emblem"
                width={64}
                height={64}
                className="h-12 w-12 md:h-16 md:w-16"
              />
              <h1 className="font-display text-5xl font-bold leading-none tracking-tight md:text-7xl">
                newsofia
              </h1>
            </div>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              The world's headlines, gathered from every direction. Eight wire rooms, one page.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <Radio className="h-4 w-4 text-primary" />
            <span>Live · {data.items.length} stories</span>
            <span className="text-foreground/40">·</span>
            <span>Updated {formatAgo(data.fetchedAt)}</span>
          </div>
        </div>
        <div className="gold-rule h-px w-full opacity-60" />
      </header>

      {/* Split screen layout */}
      <main className="mx-auto grid max-w-[1400px] gap-0 px-6 py-10 md:grid-cols-[280px_1fr] md:px-10">
        {/* Sidebar: sources */}
        <aside className="md:sticky md:top-6 md:h-fit md:border-r md:border-border md:pr-8">
          <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">Wire rooms</div>
          <nav className="mt-4 flex flex-wrap gap-2 md:flex-col md:gap-1">
            <SourceButton
              active={activeSource === "all"}
              onClick={() => setActiveSource("all")}
              label="All sources"
              meta={`${data.items.length}`}
            />
            {data.sources.map((s) => {
              const count = data.items.filter((i) => i.sourceId === s.id).length;
              return (
                <SourceButton
                  key={s.id}
                  active={activeSource === s.id}
                  onClick={() => setActiveSource(s.id)}
                  label={s.name}
                  sub={s.region}
                  meta={`${count}`}
                />
              );
            })}
          </nav>
          <div className="mt-10 hidden border-t border-border pt-6 text-xs text-muted-foreground md:block">
            Headlines are pulled directly from each publisher's public feed. Click any story to read it at the source.
          </div>
        </aside>

        {/* Content */}
        <section className="md:pl-10">
          {lead && <LeadStory item={lead} />}

          <div className="mt-10 grid gap-px bg-border sm:grid-cols-2">
            {rest.slice(0, 30).map((item) => (
              <StoryCard key={item.id} item={item} />
            ))}
          </div>

          {rest.length > 30 && (
            <div className="mt-10 border-t border-border pt-6">
              <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
                More from the wires
              </div>
              <ul className="mt-4 divide-y divide-border">
                {rest.slice(30).map((item) => (
                  <li key={item.id}>
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="group flex items-baseline justify-between gap-6 py-3 text-sm"
                    >
                      <span className="font-medium text-foreground transition-colors group-hover:text-primary">
                        {item.title}
                      </span>
                       <span suppressHydrationWarning className="shrink-0 text-xs uppercase tracking-widest text-muted-foreground">
                        {item.source} · {formatAgo(item.pubDate)}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </main>

      <footer className="mt-16 border-t border-border">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-6 py-6 text-xs uppercase tracking-[0.2em] text-muted-foreground md:px-10">
          <span>© newsofia — A world news aggregator</span>
          <span className="text-primary">Pressed daily, around the clock.</span>
        </div>
      </footer>

      <style>{`@keyframes ticker { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>
    </div>
  );
}

function SourceButton({
  active,
  onClick,
  label,
  sub,
  meta,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  sub?: string;
  meta: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex w-full items-center justify-between gap-3 border-l-2 px-3 py-2 text-left text-sm transition-colors",
        active
          ? "border-primary bg-primary/5 text-foreground"
          : "border-transparent text-muted-foreground hover:border-primary/40 hover:text-foreground",
      )}
    >
      <span className="flex flex-col">
        <span className="font-medium tracking-tight">{label}</span>
        {sub && <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">{sub}</span>}
      </span>
      <span
        className={cn(
          "font-mono text-[10px] tabular-nums",
          active ? "text-primary" : "text-muted-foreground/60",
        )}
      >
        {meta}
      </span>
    </button>
  );
}

function LeadStory({ item }: { item: NewsItem }) {
  return (
    <a
      href={item.link}
      target="_blank"
      rel="noreferrer noopener"
      className="group block border border-border bg-card/40 p-6 transition-colors hover:border-primary/60 hover:bg-card md:p-10"
    >
      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.32em] text-primary">
        <span>Top of the wire · {item.source}</span>
        <span suppressHydrationWarning className="text-muted-foreground">{formatAgo(item.pubDate)}</span>
      </div>
      <h2 className="mt-5 font-display text-3xl font-semibold leading-[1.05] tracking-tight text-foreground transition-colors group-hover:text-primary md:text-5xl">
        {item.title}
      </h2>
      {item.description && (
        <p className="mt-5 max-w-3xl text-base leading-relaxed text-muted-foreground md:text-lg">
          {item.description}
        </p>
      )}
      <div className="mt-6 inline-flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-primary">
        Read at {item.source} <ArrowUpRight className="h-4 w-4" />
      </div>
    </a>
  );
}

function StoryCard({ item }: { item: NewsItem }) {
  return (
    <a
      href={item.link}
      target="_blank"
      rel="noreferrer noopener"
      className="group flex flex-col justify-between gap-4 bg-background p-5 transition-colors hover:bg-card"
    >
      <div>
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.24em] text-primary/90">
          <span>{item.source}</span>
          <span className="text-muted-foreground">{item.region}</span>
        </div>
        <h3 className="mt-3 font-display text-lg font-medium leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary">
          {item.title}
        </h3>
        {item.description && (
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
        )}
      </div>
      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        <span suppressHydrationWarning>{formatAgo(item.pubDate)}</span>
        <ArrowUpRight className="h-3.5 w-3.5 text-primary opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
    </a>
  );
}
