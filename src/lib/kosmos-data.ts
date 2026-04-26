"use client";

import { useEffect, useState } from "react";

/* ───────────────  Types  ─────────────── */

export type Market = {
  id: string;
  title: string;
  subtitle?: string | null;
  category: string;
  platform: string;
  yes_price: number;
  no_price?: number | null;
  volume_24h: number;
  volume_total?: number | null;
  movement_1h: number | null;
  image_url?: string | null;
  closes_at?: string | null;
  outcome?: string | null;
};

export type GeoTag = { name: string; country: string; region: string };

export type SignalMarket = {
  market_id: string;
  title: string;
  platform: string;
  yes_price?: number | null;
  volume_24h?: number | null;
  category?: string | null;
  relevance?: number | null;
  is_primary?: boolean;
};

export type SignalEvidence = {
  id: string;
  evidence_type?: string;
  source_name?: string | null;
  source_type?: string | null;
  title?: string | null;
  summary?: string | null;
  url?: string | null;
  author?: string | null;
  published_at?: string | null;
  occurred_at?: string | null;
  impact_severity?: number | null;
  corroborated?: boolean;
  corroboration_count?: number;
};

export type Signal = {
  id: string;
  title: string;
  summary?: string | null;
  narrative_summary?: string | null;
  narrative_theme?: string | null;
  narrative_tags?: string[] | null;
  category: string;
  severity: number;
  confidence?: number | null;
  momentum?: number | null;
  freshness_hours?: number | null;
  evidence_count?: number | null;
  market_link_count?: number | null;
  discussion_count?: number | null;
  geo_tags?: GeoTag[];
  markets?: SignalMarket[];
  evidence?: SignalEvidence[];
  top_twitter_evidence?: SignalEvidence[];
};

export async function fetchSignalDetail(id: string): Promise<Signal | null> {
  try {
    const res = await fetch(`/api/kosmos/signals/${id}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Signal;
    return data && data.id ? data : null;
  } catch {
    return null;
  }
}

export type PricePoint = {
  yes_price: number | null;
  no_price?: number | null;
  recorded_at: string;
};

export type MarketSibling = {
  id: string;
  title: string;
  yes_price?: number | null;
  platform?: string;
};

export type MarketDetail = Market & {
  description?: string | null;
  high_24h?: number | null;
  low_24h?: number | null;
  best_bid?: number | null;
  best_ask?: number | null;
  spread?: number | null;
  open_interest?: number | null;
  liquidity?: number | null;
  unique_traders?: number | null;
  resolved_at?: string | null;
  outcome?: string | null;
  tags?: string[] | null;
  priceHistory?: PricePoint[] | null;
  siblings?: MarketSibling[] | null;
};

export async function fetchMarketDetail(
  id: string,
): Promise<MarketDetail | null> {
  try {
    const res = await fetch(`/api/kosmos/markets/${id}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as MarketDetail;
    return data && data.id ? data : null;
  } catch {
    return null;
  }
}

export type FeedUser = { username: string; avatar_url?: string | null };

export type FeedTrade = {
  side: "yes" | "no";
  price: number;
  size?: number | null;
};

export type FeedItem = {
  id: string;
  type?: string;
  post_type: string;
  body: string;
  content?: string;
  created_at: string;
  image_url?: string | null;
  is_verified: boolean;
  user?: FeedUser;
  market?: {
    title: string;
    platform: string;
    yes_price: number;
    volume_24h: number;
  } | null;
  signal?: Signal | null;
  trade?: FeedTrade | null;
};

/* ───────────────  Endpoints (use local proxy)  ─────────────── */

async function safeJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/* ───────────────  Hook  ─────────────── */

export type KosmosData = {
  markets: Market[];
  signals: Signal[];
  feed: FeedItem[];
  ready: boolean;
  online: boolean;
  lastUpdated: Date | null;
};

export function useKosmosData(pollMs = 45_000): KosmosData {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [ready, setReady] = useState(false);
  const [online, setOnline] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [mRes, sRes, fRes] = await Promise.all([
        safeJson<Market[] | { markets: Market[] }>(
          "/api/kosmos/markets?limit=100&sort=volume",
        ),
        safeJson<{ signals: Signal[] } | Signal[]>(
          "/api/kosmos/signals?limit=50&status=active",
        ),
        safeJson<FeedItem[]>("/api/kosmos/feed?limit=40"),
      ]);

      if (cancelled) return;

      const ok = Boolean(mRes || sRes || fRes);
      setOnline(ok);

      const mList: Market[] = Array.isArray(mRes)
        ? mRes
        : Array.isArray(mRes?.markets)
          ? mRes.markets
          : [];
      if (mList.length) {
        setMarkets(
          mList
            .filter((m) => m.title && typeof m.yes_price === "number")
            .sort((a, b) => (b.volume_24h || 0) - (a.volume_24h || 0)),
        );
      }

      if (sRes) {
        const arr = Array.isArray(sRes) ? sRes : (sRes.signals ?? []);
        setSignals(
          arr
            .filter((s) => s && s.title)
            .map((s) => ({
              ...s,
              severity: typeof s.severity === "number" ? s.severity : 0.5,
            }))
            .sort((a, b) => (b.severity ?? 0) - (a.severity ?? 0)),
        );
      }

      if (Array.isArray(fRes)) {
        setFeed(fRes.filter((p) => p && p.id));
      }

      setLastUpdated(new Date());
      setReady(true);
    }

    load();
    const t = setInterval(load, pollMs);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [pollMs]);

  return { markets, signals, feed, ready, online, lastUpdated };
}

/* ───────────────  Format helpers  ─────────────── */

export function formatVolume(n: number) {
  if (!n) return "$0";
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

export function formatPercent(n: number) {
  return `${(n * 100).toFixed(0)}%`;
}

export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const sec = Math.max(1, Math.round(diff / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function severityLabel(s: number) {
  if (s >= 0.85) return "CRITICAL";
  if (s >= 0.7) return "HIGH";
  if (s >= 0.5) return "ELEVATED";
  return "ROUTINE";
}

/* No-blue palette: routine severity uses neutral gray, not blue. */
export function severityColor(s: number) {
  if (s >= 0.85) return "#F03E17";
  if (s >= 0.7) return "#F07C00";
  if (s >= 0.5) return "#D9A441";
  return "#8a8a86";
}

/* No-blue palette: macro/finance/crypto uses amber, not blue. */
export function categoryAccent(cat: string | null | undefined) {
  const c = (cat ?? "").toLowerCase();
  if (/(geo|conflict|war|defense|military)/.test(c)) return "#F03E17";
  if (/(macro|finance|fed|cpi|rate|capital|crypto|stock)/.test(c))
    return "#F07C00";
  if (/(politic|election|gov)/.test(c)) return "#9B7FD4";
  if (/(climate|energy|oil|gas|supply|trade)/.test(c)) return "#4CAF7D";
  if (/(sport|nba|mlb|nfl|tennis|game|culture)/.test(c)) return "#D9A441";
  return "#888";
}

export function platformLabel(p: string | null | undefined) {
  const v = (p ?? "").toLowerCase();
  if (v === "kalshi") return "Kalshi";
  if (v === "polymarket") return "Polymarket";
  if (v === "manifold") return "Manifold";
  return p ?? "—";
}
