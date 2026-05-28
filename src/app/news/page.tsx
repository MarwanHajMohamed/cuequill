"use client";
import { withAuth } from "@/lib/withAuth";
import React, { useCallback, useEffect, useRef, useState } from "react";
import type { NewsArticle } from "@/app/api/news/route";

const POLL_INTERVAL_MS = 30_000;
const PAGE_LIMIT = 50;

type Source = "markets" | "world";

function Page() {
  const [source, setSource] = useState<Source>("markets");
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [appliedFilter, setAppliedFilter] = useState("");
  const [newCount, setNewCount] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const newestIdRef = useRef<string | null>(null);

  const buildUrl = useCallback(
    (src: Source, filterVal: string) => {
      const qs = new URLSearchParams({ source: src, limit: String(PAGE_LIMIT) });
      if (filterVal) {
        if (src === "markets") qs.set("symbols", filterVal);
        else qs.set("q", filterVal);
      }
      return `/api/news?${qs.toString()}`;
    },
    []
  );

  const fetchInitial = useCallback(
    async (src: Source, filterVal: string) => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(buildUrl(src, filterVal));
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load");
        const list: NewsArticle[] = data.news ?? [];
        setArticles(list);
        newestIdRef.current = list[0]?.id ?? null;
        setNewCount(0);
        setLastUpdated(new Date());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    },
    [buildUrl]
  );

  const fetchIncremental = useCallback(
    async (src: Source, filterVal: string) => {
      try {
        const res = await fetch(buildUrl(src, filterVal));
        const data = await res.json();
        if (!res.ok) return;
        const fresh: NewsArticle[] = data.news ?? [];
        if (fresh.length === 0) return;
        setArticles((prev) => {
          const existingIds = new Set(prev.map((a) => a.id));
          const truly = fresh.filter((a) => !existingIds.has(a.id));
          if (truly.length === 0) return prev;
          setNewCount((c) => c + truly.length);
          return [...truly, ...prev].slice(0, 200);
        });
        setLastUpdated(new Date());
      } catch {
        // silent — keep showing whatever we have
      }
    },
    [buildUrl]
  );

  useEffect(() => {
    fetchInitial(source, appliedFilter);
  }, [source, appliedFilter, fetchInitial]);

  useEffect(() => {
    const id = setInterval(() => {
      fetchIncremental(source, appliedFilter);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [source, appliedFilter, fetchIncremental]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") {
        fetchIncremental(source, appliedFilter);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [source, appliedFilter, fetchIncremental]);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = filter.trim();
    setAppliedFilter(source === "markets" ? trimmed.toUpperCase() : trimmed);
  };

  const clearFilter = () => {
    setFilter("");
    setAppliedFilter("");
  };

  const handleSourceChange = (next: Source) => {
    if (next === source) return;
    setSource(next);
    setFilter("");
    setAppliedFilter("");
    setArticles([]);
  };

  const placeholder =
    source === "markets" ? "Filter (e.g. SPY,AAPL)" : "Search (e.g. Iran)";

  return (
    <div className="md:mt-[100px] mt-19 flex flex-col items-center">
      <div className="bg-[#0e0e10] w-full rounded-sm min-h-[calc(100vh-77px)] md:min-h-[calc(100vh-105px)] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-white/10 shrink-0 flex-wrap">
          <h1 className="text-base font-semibold text-white">News</h1>

          <div className="inline-flex items-center bg-[#16151B] border border-white/10 rounded-md p-0.5 text-xs">
            {(["markets", "world"] as Source[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleSourceChange(s)}
                className={`px-3 py-1 rounded transition capitalize ${
                  source === s
                    ? "bg-white/10 text-white"
                    : "text-white/50 hover:text-white"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <form
            onSubmit={handleFilterSubmit}
            className="flex items-center gap-2"
          >
            <div className="relative">
              <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-white/40"></i>
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder={placeholder}
                className={`bg-[#16151B] border border-white/10 text-white text-xs pl-7 pr-3 py-1.5 rounded-md focus:outline-none focus:border-white/30 w-52 ${
                  source === "markets"
                    ? "uppercase placeholder:normal-case"
                    : ""
                } placeholder:text-white/30`}
              />
            </div>
            {appliedFilter && (
              <button
                type="button"
                onClick={clearFilter}
                className="text-xs text-white/50 hover:text-white"
              >
                Clear
              </button>
            )}
          </form>
          <div className="ml-auto flex items-center gap-3 text-xs text-white/40">
            <a
              href="https://www.forexfactory.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-white/60 hover:text-white transition border border-white/10 rounded-md px-2.5 py-1"
            >
              <i className="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
              Forex Factory
            </a>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
              Live
            </span>
            {lastUpdated && (
              <span>Updated {lastUpdated.toLocaleTimeString()}</span>
            )}
          </div>
        </div>

        {/* New articles banner */}
        {newCount > 0 && (
          <button
            onClick={() => {
              setNewCount(0);
              if (typeof window !== "undefined") {
                window.scrollTo({ top: 0, behavior: "smooth" });
              }
            }}
            className="bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 text-xs py-2 px-4 border-b border-blue-500/30 transition"
          >
            {newCount} new article{newCount === 1 ? "" : "s"} — click to dismiss
          </button>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading && articles.length === 0 ? (
            <div className="p-8 text-center text-white/40 text-sm">
              Loading news…
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-400 text-sm">{error}</div>
          ) : articles.length === 0 ? (
            <div className="p-8 text-center text-white/40 text-sm">
              No articles{appliedFilter ? ` for "${appliedFilter}"` : ""}.
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {articles.map((a) => (
                <NewsRow key={a.id} article={a} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function NewsRow({ article }: { article: NewsArticle }) {
  const thumb =
    article.images.find((i) => i.size === "thumb") ||
    article.images.find((i) => i.size === "small") ||
    article.images[0];
  const when = formatRelative(article.created_at);
  return (
    <li>
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex gap-3 p-4 hover:bg-white/5 transition"
      >
        {thumb && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb.url}
            alt=""
            className="w-20 h-20 md:w-28 md:h-28 object-cover rounded shrink-0 bg-white/5"
          />
        )}
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-white/40">
            <span>{article.source}</span>
            <span>·</span>
            <span>{when}</span>
            {article.author && (
              <>
                <span>·</span>
                <span className="truncate">{article.author}</span>
              </>
            )}
          </div>
          <div className="text-sm md:text-base font-medium text-white leading-snug">
            {article.headline}
          </div>
          {article.summary && (
            <div className="text-xs md:text-sm text-white/60 line-clamp-2">
              {article.summary}
            </div>
          )}
          {article.symbols.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-0.5">
              {article.symbols.slice(0, 8).map((s) => (
                <span
                  key={s}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/60"
                >
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      </a>
    </li>
  );
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, Math.floor((now - then) / 1000));
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 7 * 86400) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default withAuth(Page);
