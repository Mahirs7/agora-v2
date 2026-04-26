"use client";

import { useEffect, useRef, useState } from "react";

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

export type RegionActivity = {
  country: string;
  region_group?: string;
  name?: string;
  active_markets?: number;
  active_signals?: number;
  total_volume_24h?: number;
  heat_score?: number;
  top_signal_id?: string | null;
  top_market_id?: string | null;
};

export type RegionSignalRow = {
  id: string;
  title: string;
  primary_category?: string | null;
  severity: number;
  confidence?: number | null;
  last_evidence_at?: string;
};

export type RegionMarketRow = {
  id: string;
  title: string;
  platform: string;
  volume_24h?: number;
  yes_price?: number | null;
  closes_at?: string | null;
};

export type RegionDetail = {
  activity: RegionActivity;
  signals: RegionSignalRow[];
  markets: RegionMarketRow[];
};

export async function fetchRegionDetail(
  iso2: string,
): Promise<RegionDetail | null> {
  try {
    const res = await fetch(
      `/api/kosmos/globe/region/${encodeURIComponent(iso2)}`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    return (await res.json()) as RegionDetail;
  } catch {
    return null;
  }
}

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
  last_synced_at?: string | null;
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

/* ───────────────  WebSocket live prices  ─────────────── */

const WS_URL = "wss://api.kosmos.fyi/ws";

export type LivePriceTick = {
  yes_price: number | null;
  no_price: number | null;
  ts: number;
};

export type LiveTradeTick = {
  price: number | null;
  size: number;
  side: string | null;
  ts: number;
};

export type LiveMarketState = {
  connected: boolean;
  price: LivePriceTick | null;
  lastTrade: LiveTradeTick | null;
  /** Wall-clock time of the most recent update from server (used to flash) */
  pulseAt: number;
};

export function useMarketLivePrice(
  marketId: string | null,
): LiveMarketState {
  const [state, setState] = useState<LiveMarketState>({
    connected: false,
    price: null,
    lastTrade: null,
    pulseAt: 0,
  });
  const wsRef = useRef<WebSocket | null>(null);
  const idRef = useRef<string | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    if (!marketId || typeof window === "undefined") return;

    idRef.current = marketId;
    setState({ connected: false, price: null, lastTrade: null, pulseAt: 0 });

    function connect() {
      if (cancelledRef.current || idRef.current !== marketId) return;
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        if (cancelledRef.current || idRef.current !== marketId) {
          ws.close();
          return;
        }
        try {
          ws.send(JSON.stringify({ type: "subscribe", marketId }));
        } catch {
          /* ignore */
        }
        setState((s) => ({ ...s, connected: true }));
      };

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data) as {
            type: string;
            marketId?: string;
            data?: unknown;
          };
          if (msg.marketId && msg.marketId !== marketId) return;
          if (msg.type === "price" && msg.data) {
            const d = msg.data as LivePriceTick;
            setState((s) => ({
              ...s,
              price: d,
              pulseAt: Date.now(),
            }));
          } else if (msg.type === "trade" && msg.data) {
            const d = msg.data as LiveTradeTick;
            setState((s) => ({
              ...s,
              lastTrade: d,
              pulseAt: Date.now(),
            }));
          } else if (msg.type === "snapshot" && msg.data) {
            const d = msg.data as { price?: LivePriceTick };
            if (d.price) {
              setState((s) => ({ ...s, price: d.price ?? s.price }));
            }
          }
        } catch {
          /* ignore */
        }
      };

      ws.onerror = () => {
        /* let onclose handle reconnect */
      };

      ws.onclose = () => {
        setState((s) => ({ ...s, connected: false }));
        if (cancelledRef.current || idRef.current !== marketId) return;
        // Reconnect with backoff
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = setTimeout(connect, 2000);
      };
    }

    connect();

    return () => {
      cancelledRef.current = true;
      idRef.current = null;
      clearTimeout(reconnectTimerRef.current);
      const ws = wsRef.current;
      if (ws) {
        try {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "unsubscribe", marketId }));
          }
          ws.close();
        } catch {
          /* ignore */
        }
        wsRef.current = null;
      }
    };
  }, [marketId]);

  return state;
}

export type LiveMarketMap = Record<string, LiveMarketState>;

/**
 * Subscribe to multiple markets over one shared WebSocket. Diff-subscribes when
 * the id list changes — adds new ids, unsubscribes removed ones, never tears
 * the connection down for a partial change.
 */
export function useMarketLivePrices(marketIds: string[]): LiveMarketMap {
  const [state, setState] = useState<LiveMarketMap>({});
  const wsRef = useRef<WebSocket | null>(null);
  const subscribedRef = useRef<Set<string>>(new Set());
  const pendingIdsRef = useRef<string[]>([]);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const cancelledRef = useRef(false);

  // Memoize stable key for ids
  const idsKey = marketIds.slice().sort().join(",");

  useEffect(() => {
    cancelledRef.current = false;
    if (typeof window === "undefined") return;

    const wantIds = idsKey ? idsKey.split(",").filter(Boolean) : [];
    pendingIdsRef.current = wantIds;

    function send(msg: object) {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify(msg));
        } catch {
          /* ignore */
        }
      }
    }

    function syncSubscriptions() {
      const want = new Set(pendingIdsRef.current);
      const have = subscribedRef.current;
      // Subscribe new
      for (const id of want) {
        if (!have.has(id)) {
          send({ type: "subscribe", marketId: id });
          have.add(id);
        }
      }
      // Unsubscribe removed
      for (const id of [...have]) {
        if (!want.has(id)) {
          send({ type: "unsubscribe", marketId: id });
          have.delete(id);
        }
      }
    }

    function ensureConnection() {
      if (cancelledRef.current) return;
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        syncSubscriptions();
        return;
      }
      if (
        wsRef.current &&
        (wsRef.current.readyState === WebSocket.CONNECTING ||
          wsRef.current.readyState === WebSocket.CLOSING)
      ) {
        return;
      }

      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        if (cancelledRef.current) {
          ws.close();
          return;
        }
        subscribedRef.current.clear();
        syncSubscriptions();
      };

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data) as {
            type: string;
            marketId?: string;
            data?: unknown;
          };
          const id = msg.marketId;
          if (!id) return;
          if (msg.type === "price" && msg.data) {
            const d = msg.data as LivePriceTick;
            setState((s) => ({
              ...s,
              [id]: {
                connected: true,
                price: d,
                lastTrade: s[id]?.lastTrade ?? null,
                pulseAt: Date.now(),
              },
            }));
          } else if (msg.type === "trade" && msg.data) {
            const d = msg.data as LiveTradeTick;
            setState((s) => ({
              ...s,
              [id]: {
                connected: true,
                price: s[id]?.price ?? null,
                lastTrade: d,
                pulseAt: Date.now(),
              },
            }));
          } else if (msg.type === "snapshot" && msg.data) {
            const d = msg.data as { price?: LivePriceTick };
            if (d.price) {
              setState((s) => ({
                ...s,
                [id]: {
                  connected: true,
                  price: d.price ?? null,
                  lastTrade: s[id]?.lastTrade ?? null,
                  pulseAt: s[id]?.pulseAt ?? 0,
                },
              }));
            }
          }
        } catch {
          /* ignore */
        }
      };

      ws.onerror = () => {
        /* let onclose handle reconnect */
      };

      ws.onclose = () => {
        subscribedRef.current.clear();
        if (cancelledRef.current) return;
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = setTimeout(ensureConnection, 2000);
      };
    }

    if (wantIds.length === 0) {
      // Nothing to subscribe — close any existing connection
      const ws = wsRef.current;
      if (ws) {
        try {
          ws.close();
        } catch {
          /* ignore */
        }
        wsRef.current = null;
        subscribedRef.current.clear();
      }
      return;
    }

    ensureConnection();

    return () => {
      cancelledRef.current = true;
      clearTimeout(reconnectTimerRef.current);
      const ws = wsRef.current;
      if (ws) {
        try {
          for (const id of subscribedRef.current) {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "unsubscribe", marketId: id }));
            }
          }
          ws.close();
        } catch {
          /* ignore */
        }
        wsRef.current = null;
        subscribedRef.current.clear();
      }
    };
  }, [idsKey]);

  return state;
}

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

export type PmComment = {
  id: string;
  body: string;
  created_at: string;
  reaction_count?: number;
  parent_comment_id?: string | null;
  user_address?: string;
  author?: {
    username?: string | null;
    avatar_url?: string | null;
  };
};

export async function fetchPmComments(
  marketId: string,
  limit = 20,
): Promise<PmComment[]> {
  try {
    const res = await fetch(
      `/api/kosmos/markets/${marketId}/pm-comments?limit=${limit}`,
      { cache: "no-store" },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as
      | { comments: PmComment[] }
      | PmComment[];
    if (Array.isArray(data)) return data;
    return data.comments ?? [];
  } catch {
    return [];
  }
}

export type FeedUser = { username: string; avatar_url?: string | null };

export type FeedTrade = {
  side: "yes" | "no";
  price: number;
  size?: number | null;
};

/* ───────────────  Sports types  ─────────────── */

export type SportsLeague = {
  code: string;
  display_name: string;
  sport_group?: string;
  image_url?: string | null;
  volume_3d?: number | null;
  market_count?: number | null;
  game_count?: number | null;
  live_game_count?: number | null;
  has_live?: boolean;
};

export type SportsPill = {
  pill_label: string;
  active_market_count?: number;
  pill_order?: number;
};

export type SportsGame = {
  id: string;
  title: string;
  league_code?: string;
  scheduled_at?: string | null;
  status?: string;
  period?: string | null;
  elapsed?: string | null;
  home_abbr?: string;
  away_abbr?: string;
  home_color?: string | null;
  away_color?: string | null;
  home_logo?: string | null;
  away_logo?: string | null;
  home_yes_price?: number | null;
  away_yes_price?: number | null;
  home_yes_market_id?: string | null;
  away_yes_market_id?: string | null;
  score_home?: number | null;
  score_away?: number | null;
  market_count?: number;
  volume_24h?: number;
  sources?: string[];
};

export type SportsMarket = {
  market_id: string;
  question: string;
  yes_price?: number | null;
  no_price?: number | null;
  volume_24h?: number | null;
  platform?: string;
  pill_label?: string;
  group_item_title?: string | null;
  role?: string | null;
  game_id?: string | null;
  game_title?: string | null;
  game_status?: string;
  closes_at?: string | null;
};

/* ───────────────  Politics types  ─────────────── */

export type PoliticsJurisdiction = {
  code: string;
  display_name: string;
  race_count?: number;
  market_count?: number;
  volume_24h?: number;
};

export type PoliticsPill = {
  pill_label: string;
  count?: number;
};

export type PoliticsCandidate = {
  candidate_name?: string | null;
  candidate_party?: string | null;
  market_id: string;
  platform?: string;
  yes_price?: number | null;
  image_url?: string | null;
};

export type PoliticsRace = {
  race_id: string;
  title: string;
  status?: string;
  sub_type?: string;
  race_type?: string;
  cycle?: string;
  election_date?: string | null;
  market_count?: number;
  volume_24h?: number;
  topic?: string;
  topic_label?: string;
  jurisdiction?: string;
  image_url?: string | null;
  top_candidates?: PoliticsCandidate[];
};

export type PoliticsMarket = {
  market_id: string;
  question: string;
  yes_price?: number | null;
  no_price?: number | null;
  volume_24h?: number | null;
  platform?: string;
  image_url?: string | null;
  close_time?: string | null;
  event_id?: string;
};

export type LiveEvent = {
  id: string;
  title: string;
  summary?: string | null;
  category?: string;
  country?: string;
  region_group?: string;
  event_type?: string;
  event_type_confidence?: number;
  live_start_at?: string | null;
  live_end_at?: string | null;
  severity: number;
  confidence_band?: string;
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
  liveEvents: LiveEvent[];
  ready: boolean;
  online: boolean;
  lastUpdated: Date | null;
};

export function useKosmosData(pollMs = 45_000): KosmosData {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [ready, setReady] = useState(false);
  const [online, setOnline] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [mRes, sRes, fRes, lRes] = await Promise.all([
        safeJson<Market[] | { markets: Market[] }>(
          "/api/kosmos/markets?limit=100&sort=volume",
        ),
        safeJson<{ signals: Signal[] } | Signal[]>(
          "/api/kosmos/signals?limit=50&status=active",
        ),
        safeJson<FeedItem[]>("/api/kosmos/feed?limit=40"),
        safeJson<{ events: LiveEvent[] }>(
          "/api/kosmos/home/live-events?limit=20",
        ),
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

      if (lRes && Array.isArray(lRes.events)) {
        setLiveEvents(
          lRes.events
            .filter((e) => e && e.id && e.title)
            .sort((a, b) => (b.severity ?? 0) - (a.severity ?? 0)),
        );
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

  return { markets, signals, feed, liveEvents, ready, online, lastUpdated };
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
