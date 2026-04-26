export const API_BASE = "https://api.kosmos.fyi";

export type ApiResult<T> = {
  data: T;
  error?: string;
  ok: boolean;
};

export type Signal = {
  id: string;
  title: string;
  summary?: string | null;
  status?: string;
  primary_category?: string | null;
  primary_region?: string | null;
  primary_country?: string | null;
  primary_region_group?: string | null;
  primary_evidence_type?: string | null;
  geo_tags?: Array<{ country: string; region?: string; name?: string }>;
  severity?: number;
  confidence?: number;
  momentum?: number;
  source_diversity_count?: number;
  evidence_type_diversity_count?: number;
  evidence_count?: number;
  market_link_count?: number;
  primary_market_count?: number;
  discussion_count?: number;
  recent_discussion_count?: number;
  evidence_velocity_6h?: number;
  evidence_velocity_24h?: number;
  top_sources?: string | null;
  freshness_hours?: number;
  rank_score?: number;
  x_volume_1h?: number;
  x_volume_24h?: number;
  x_volume_24h_delta?: number;
  x_volume_24h_delta_pct?: number | null;
  first_seen_at?: string;
  last_evidence_at?: string;
  markets?: SignalMarket[];
  evidence?: SignalEvidence[];
  top_twitter_evidence?: SignalEvidence[];
  posts?: unknown[];
  quality?: Record<string, unknown>;
  narrative_theme?: string | null;
  narrative_summary?: string | null;
  narrative_tags?: string[] | null;
  novelty_score?: number | null;
  narrative_confidence?: number | null;
  enriched_at?: string | null;
};

export type SignalMarket = {
  market_id: string;
  title: string;
  platform: string;
  yes_price?: number | null;
  no_price?: number | null;
  volume_24h?: number | null;
  category?: string | null;
  relevance?: number;
  is_primary?: boolean;
  added_at?: string;
};

export type SignalEvidence = {
  id: string;
  signal_id?: string;
  evidence_type?: string;
  evidence_id?: string;
  source_name?: string | null;
  source_type?: string | null;
  title?: string | null;
  summary?: string | null;
  url?: string | null;
  author?: string | null;
  published_at?: string | null;
  occurred_at?: string | null;
  added_at?: string;
  weight?: number;
  impact_severity?: number | null;
  corroborated?: boolean | null;
  corroboration_count?: number | null;
  cluster_id?: string | null;
};

export type Market = {
  id: string;
  platform: "kalshi" | "polymarket" | string;
  external_id?: string;
  event_id?: string | null;
  title: string;
  subtitle?: string | null;
  category?: string | null;
  yes_price?: number | null;
  no_price?: number | null;
  movement_1h?: number | null;
  volume_24h?: number | null;
  volume_total?: number | null;
  closes_at?: string | null;
  image_url?: string | null;
  priceHistory?: PricePoint[];
  siblings?: Market[];
  high_24h?: number | null;
  low_24h?: number | null;
};

export type PricePoint = {
  yes_price?: number | null;
  no_price?: number | null;
  price?: number | null;
  recorded_at?: string;
  ts?: string;
};

export type GlobeCountry = {
  country: string;
  region_group: string;
  name: string;
  active_markets: number;
  active_signals: number;
  total_volume_24h: number;
  heat_score: number;
  top_signal_id?: string | null;
  top_market_id?: string | null;
  updated_at: string;
};

export type GlobeRegionDetail = {
  activity?: GlobeCountry;
  signals?: Signal[];
  markets?: Market[];
};

export type NewsStory = {
  id: string;
  headline?: string;
  title?: string;
  summary?: string | null;
  body?: string | null;
  source_type?: string | null;
  source_name?: string | null;
  source_url?: string | null;
  source_region?: string | null;
  market_id?: string | null;
  markets?: SignalMarket | Market | null;
  geo_tags?: Array<{ country: string; region?: string; name?: string }>;
  event_types?: string[];
  impact_severity?: number | null;
  corroborated?: boolean | null;
  corroboration_count?: number | null;
  created_at?: string;
  updated_at?: string;
  view_count?: number;
};

export type League = {
  code?: string;
  display_name?: string;
  sport_group?: string;
  image_url?: string | null;
  volume_3d?: number | null;
  market_count?: number | null;
  game_count?: number | null;
  live_game_count?: number | null;
  has_live?: boolean | null;
};

export type Jurisdiction = {
  code?: string;
  display_name?: string;
  country?: string | null;
  race_count?: number | null;
  market_count?: number | null;
  live_race_count?: number | null;
  volume_3d?: number | null;
};

export type LeaderboardTrader = {
  wallet?: string;
  address?: string;
  username?: string | null;
  display_name?: string | null;
  name?: string | null;
  profit?: number | null;
  pnl?: number | null;
  volume?: number | null;
  rank?: number | null;
  positions_count?: number | null;
};

export type Health = {
  ok?: boolean;
  ts?: string;
};

export type KosmosSnapshot = {
  health: ApiResult<Health | null>;
  signals: ApiResult<Signal[]>;
  homeSignals: ApiResult<Signal[]>;
  markets: ApiResult<Market[]>;
  globe: ApiResult<GlobeCountry[]>;
  topCountries: ApiResult<GlobeCountry[]>;
  newsFeed: ApiResult<NewsStory[]>;
  newsIntel: ApiResult<NewsStory[]>;
  leagues: ApiResult<League[]>;
  jurisdictions: ApiResult<Jurisdiction[]>;
  leaderboard: ApiResult<LeaderboardTrader[]>;
};

export const EMPTY_SNAPSHOT: KosmosSnapshot = {
  health: { data: null, ok: false },
  signals: { data: [], ok: false },
  homeSignals: { data: [], ok: false },
  markets: { data: [], ok: false },
  globe: { data: [], ok: false },
  topCountries: { data: [], ok: false },
  newsFeed: { data: [], ok: false },
  newsIntel: { data: [], ok: false },
  leagues: { data: [], ok: false },
  jurisdictions: { data: [], ok: false },
  leaderboard: { data: [], ok: false },
};

export function normalizeApiPath(path: string): string {
  const trimmed = path.trim();

  if (trimmed.startsWith("/api/")) {
    return trimmed;
  }

  if (trimmed.startsWith("api/")) {
    return `/${trimmed}`;
  }

  return `/api/${trimmed.replace(/^\/+/, "")}`;
}

export function toProxyPath(path: string): string {
  return `/api/kosmos${normalizeApiPath(path).slice(4)}`;
}

export async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");

  const url =
    typeof window === "undefined"
      ? `${API_BASE}${normalizeApiPath(path)}`
      : toProxyPath(path);

  const res = await fetch(url, {
    ...init,
    cache: "no-store",
    headers,
  });

  if (!res.ok) {
    const message = await readErrorMessage(res);
    throw new Error(`${normalizeApiPath(path)} failed: ${message}`);
  }

  return (await res.json()) as T;
}

async function readErrorMessage(res: Response): Promise<string> {
  const text = await res.text().catch(() => "");

  if (!text) {
    return `${res.status} ${res.statusText}`;
  }

  try {
    const parsed = JSON.parse(text) as { error?: string; message?: string };
    return parsed.error ?? parsed.message ?? `${res.status} ${res.statusText}`;
  } catch {
    return text.slice(0, 240);
  }
}

export async function safeGet<T>(
  path: string,
  normalize: (payload: unknown) => T,
): Promise<ApiResult<T>> {
  try {
    const payload = await getJson<unknown>(path);
    return { data: normalize(payload), ok: true };
  } catch (error) {
    return {
      data: normalize(undefined),
      error: error instanceof Error ? error.message : "Unknown API error",
      ok: false,
    };
  }
}

export async function loadKosmosSnapshot(): Promise<KosmosSnapshot> {
  const [
    health,
    markets,
    signals,
    homeSignals,
    globe,
    topCountries,
    newsFeed,
    newsIntel,
    leagues,
    jurisdictions,
    leaderboard,
  ] = await Promise.all([
    safeGet("/api/health", extractHealth),
    safeGet("/api/markets?limit=50&sort=movers", extractMarkets),
    safeGet("/api/signals?limit=25&status=active&sort=severity", extractSignals),
    safeGet("/api/home/signals?limit=50", extractSignals),
    safeGet("/api/globe/activity", extractCountries),
    safeGet("/api/globe/top-countries?limit=10", extractCountries),
    safeGet("/api/news/feed?limit=20", extractNewsStories),
    safeGet("/api/news/intel?limit=20", extractNewsStories),
    safeGet("/api/sports/leagues", extractLeagues),
    safeGet("/api/politics/jurisdictions", extractJurisdictions),
    safeGet("/api/pm/leaderboard?limit=25", extractLeaderboard),
  ]);

  return {
    health,
    markets,
    signals,
    homeSignals,
    globe,
    topCountries,
    newsFeed,
    newsIntel,
    leagues,
    jurisdictions,
    leaderboard,
  };
}

export function extractHealth(payload: unknown): Health | null {
  return isRecord(payload) ? (payload as Health) : null;
}

export function extractSignals(payload: unknown): Signal[] {
  if (isRecord(payload)) {
    return normalizeArray<Signal>(payload.signals);
  }

  return normalizeArray<Signal>(payload);
}

export function extractSignal(payload: unknown): Signal | null {
  if (isRecord(payload) && isRecord(payload.signal)) {
    return normalizeSignal(payload.signal);
  }

  return normalizeSignal(payload);
}

export function extractMarkets(payload: unknown): Market[] {
  if (isRecord(payload)) {
    return normalizeArray<Market>(payload.markets ?? payload.results ?? payload.data);
  }

  return normalizeArray<Market>(payload);
}

export function extractMarket(payload: unknown): Market | null {
  if (isRecord(payload) && isRecord(payload.market)) {
    return normalizeMarket(payload.market);
  }

  return normalizeMarket(payload);
}

export function extractPricePoints(payload: unknown): PricePoint[] {
  if (isRecord(payload)) {
    return normalizeArray<PricePoint>(
      payload.prices ?? payload.priceHistory ?? payload.history ?? payload.data,
    );
  }

  return normalizeArray<PricePoint>(payload);
}

export function extractCountries(payload: unknown): GlobeCountry[] {
  if (isRecord(payload)) {
    return normalizeArray<GlobeCountry>(
      payload.countries ?? payload.activity ?? payload.regions ?? payload.data,
    );
  }

  return normalizeArray<GlobeCountry>(payload);
}

export function extractRegion(payload: unknown): GlobeRegionDetail | null {
  if (!isRecord(payload)) {
    return null;
  }

  return {
    activity: isRecord(payload.activity)
      ? (payload.activity as GlobeCountry)
      : undefined,
    signals: normalizeArray<Signal>(payload.signals),
    markets: normalizeArray<Market>(payload.markets),
  };
}

export function extractNewsStories(payload: unknown): NewsStory[] {
  if (isRecord(payload)) {
    return normalizeArray<NewsStory>(payload.stories ?? payload.news ?? payload.data);
  }

  return normalizeArray<NewsStory>(payload);
}

export function extractLeagues(payload: unknown): League[] {
  if (isRecord(payload)) {
    return normalizeArray<League>(payload.leagues ?? payload.data);
  }

  return normalizeArray<League>(payload);
}

export function extractJurisdictions(payload: unknown): Jurisdiction[] {
  if (isRecord(payload)) {
    return normalizeArray<Jurisdiction>(payload.jurisdictions ?? payload.data);
  }

  return normalizeArray<Jurisdiction>(payload);
}

export function extractLeaderboard(payload: unknown): LeaderboardTrader[] {
  if (isRecord(payload)) {
    return normalizeArray<LeaderboardTrader>(
      payload.leaderboard ?? payload.users ?? payload.traders ?? payload.data,
    );
  }

  return normalizeArray<LeaderboardTrader>(payload);
}

export function normalizeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value.filter(Boolean) as T[]) : [];
}

function normalizeSignal(value: unknown): Signal | null {
  if (!isRecord(value) || typeof value.id !== "string") {
    return null;
  }

  return {
    ...(value as Signal),
    markets: normalizeArray<SignalMarket>(value.markets),
    evidence: normalizeArray<SignalEvidence>(value.evidence),
    top_twitter_evidence: normalizeArray<SignalEvidence>(
      value.top_twitter_evidence,
    ),
  };
}

function normalizeMarket(value: unknown): Market | null {
  if (!isRecord(value) || typeof value.id !== "string") {
    return null;
  }

  return {
    ...(value as Market),
    priceHistory: extractPricePoints(value.priceHistory),
    siblings: normalizeArray<Market>(value.siblings),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
