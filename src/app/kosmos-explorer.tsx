"use client";

import { useEffect, useMemo, useState } from "react";

import {
  EMPTY_SNAPSHOT,
  extractMarket,
  extractMarkets,
  extractPricePoints,
  extractRegion,
  extractSignal,
  extractSignals,
  getJson,
  loadKosmosSnapshot,
  type ApiResult,
  type GlobeCountry,
  type GlobeRegionDetail,
  type Jurisdiction,
  type KosmosSnapshot,
  type LeaderboardTrader,
  type League,
  type Market,
  type NewsStory,
  type PricePoint,
  type Signal,
  type SignalEvidence,
  type SignalMarket,
} from "@/lib/kosmos";

type Tab = "command" | "signals" | "globe" | "markets" | "sports" | "traders";
type LoadStatus = "idle" | "loading" | "ready" | "error";
type SignalSort = "severity" | "recent" | "top" | "x_volume" | "velocity";
type MarketSort = "movers" | "volume" | "closing_soon";
type PlatformFilter = "all" | "kalshi" | "polymarket";

const NAV_ITEMS: Array<{ id: Tab; label: string; kicker: string }> = [
  { id: "command", label: "Command Center", kicker: "Live overview" },
  { id: "signals", label: "Signals", kicker: "Severity feed" },
  { id: "globe", label: "Globe", kicker: "Country heat" },
  { id: "markets", label: "Markets", kicker: "Live odds" },
  { id: "sports", label: "Sports / Politics", kicker: "Taxonomies" },
  { id: "traders", label: "Trader Lens", kicker: "Polymarket" },
];

const SIGNAL_SORTS: Array<{ id: SignalSort; label: string }> = [
  { id: "severity", label: "Severity" },
  { id: "recent", label: "Recent" },
  { id: "top", label: "Top" },
  { id: "x_volume", label: "X-volume" },
  { id: "velocity", label: "Velocity" },
];

const MARKET_SORTS: Array<{ id: MarketSort; label: string }> = [
  { id: "movers", label: "Movers" },
  { id: "volume", label: "Volume" },
  { id: "closing_soon", label: "Closing" },
];

const COUNTRY_POSITIONS: Record<string, [number, number]> = {
  AR: [32, 78],
  AU: [82, 76],
  BR: [36, 70],
  CA: [23, 24],
  CN: [74, 43],
  DE: [51, 32],
  ES: [47, 40],
  FR: [49, 37],
  GB: [47, 30],
  ID: [77, 66],
  IN: [69, 53],
  JP: [84, 44],
  KR: [81, 42],
  MX: [20, 48],
  NG: [51, 59],
  RU: [67, 24],
  SA: [59, 52],
  TR: [56, 42],
  UA: [56, 34],
  US: [22, 40],
  ZA: [54, 78],
};

export default function KosmosExplorer() {
  const [snapshot, setSnapshot] = useState<KosmosSnapshot>(EMPTY_SNAPSHOT);
  const [bootStatus, setBootStatus] = useState<LoadStatus>("loading");
  const [bootError, setBootError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("command");

  const [signalRows, setSignalRows] = useState<Signal[]>([]);
  const [signalSort, setSignalSort] = useState<SignalSort>("severity");
  const [signalsLoading, setSignalsLoading] = useState(false);
  const [signalsError, setSignalsError] = useState<string | null>(null);

  const [selectedSignalId, setSelectedSignalId] = useState<string | null>(null);
  const [signalDetail, setSignalDetail] = useState<Signal | null>(null);
  const [detailStatus, setDetailStatus] = useState<LoadStatus>("idle");
  const [detailError, setDetailError] = useState<string | null>(null);

  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [regionDetail, setRegionDetail] = useState<GlobeRegionDetail | null>(
    null,
  );
  const [regionStatus, setRegionStatus] = useState<LoadStatus>("idle");
  const [regionError, setRegionError] = useState<string | null>(null);

  const [marketRows, setMarketRows] = useState<Market[]>([]);
  const [marketSort, setMarketSort] = useState<MarketSort>("movers");
  const [marketPlatform, setMarketPlatform] = useState<PlatformFilter>("all");
  const [marketSearch, setMarketSearch] = useState("");
  const [marketsLoading, setMarketsLoading] = useState(false);
  const [marketsError, setMarketsError] = useState<string | null>(null);
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);
  const [marketDetail, setMarketDetail] = useState<Market | null>(null);
  const [marketPrices, setMarketPrices] = useState<PricePoint[]>([]);
  const [marketDetailStatus, setMarketDetailStatus] =
    useState<LoadStatus>("idle");

  useEffect(() => {
    let cancelled = false;

    loadKosmosSnapshot()
      .then((nextSnapshot) => {
        if (cancelled) {
          return;
        }

        const preferredSignals = nextSnapshot.homeSignals.data.length
          ? nextSnapshot.homeSignals.data
          : nextSnapshot.signals.data;
        const countries = nextSnapshot.topCountries.data.length
          ? nextSnapshot.topCountries.data
          : nextSnapshot.globe.data;

        setSnapshot(nextSnapshot);
        setSignalRows(nextSnapshot.signals.data);
        setMarketRows(nextSnapshot.markets.data);
        if (preferredSignals[0]?.id) {
          selectSignal(preferredSignals[0].id);
        }
        if (countries[0]?.country) {
          selectCountry(countries[0].country);
        }
        if (nextSnapshot.markets.data[0]?.id) {
          selectMarket(nextSnapshot.markets.data[0].id);
        }
        setBootStatus("ready");
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        setBootError(error instanceof Error ? error.message : "Load failed");
        setBootStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedSignalId) {
      return;
    }

    let cancelled = false;

    getJson<unknown>(`/api/signals/${selectedSignalId}`)
      .then((payload) => {
        if (!cancelled) {
          setSignalDetail(extractSignal(payload));
          setDetailStatus("ready");
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setDetailError(
            error instanceof Error ? error.message : "Signal detail failed",
          );
          setDetailStatus("error");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedSignalId]);

  useEffect(() => {
    if (!selectedCountry) {
      return;
    }

    let cancelled = false;

    getJson<unknown>(`/api/globe/region/${selectedCountry}`)
      .then((payload) => {
        if (!cancelled) {
          setRegionDetail(extractRegion(payload));
          setRegionStatus("ready");
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setRegionError(
            error instanceof Error ? error.message : "Country detail failed",
          );
          setRegionStatus("error");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedCountry]);

  useEffect(() => {
    if (bootStatus === "idle") {
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(() => {
      const params = new URLSearchParams({
        limit: "50",
        sort: marketSort,
      });

      if (marketPlatform !== "all") {
        params.set("platform", marketPlatform);
      }

      if (marketSearch.trim()) {
        params.set("search", marketSearch.trim());
      }

      setMarketsLoading(true);
      setMarketsError(null);

      getJson<unknown>(`/api/markets?${params.toString()}`)
        .then((payload) => {
          if (!cancelled) {
            const rows = extractMarkets(payload);
            setMarketRows(rows);
            setSelectedMarketId((current) => current ?? rows[0]?.id ?? null);
          }
        })
        .catch((error) => {
          if (!cancelled) {
            setMarketsError(
              error instanceof Error ? error.message : "Markets failed",
            );
          }
        })
        .finally(() => {
          if (!cancelled) {
            setMarketsLoading(false);
          }
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [bootStatus, marketPlatform, marketSearch, marketSort]);

  useEffect(() => {
    if (!selectedMarketId) {
      return;
    }

    let cancelled = false;

    Promise.all([
      getJson<unknown>(`/api/markets/${selectedMarketId}`),
      getJson<unknown>(`/api/markets/${selectedMarketId}/prices?window=24h`),
    ])
      .then(([marketPayload, pricePayload]) => {
        if (!cancelled) {
          setMarketDetail(extractMarket(marketPayload));
          setMarketPrices(extractPricePoints(pricePayload));
          setMarketDetailStatus("ready");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMarketDetailStatus("error");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedMarketId]);

  const activeSignals = useMemo(() => {
    const byId = new Map<string, Signal>();
    [...snapshot.homeSignals.data, ...signalRows, ...snapshot.signals.data].forEach(
      (signal) => {
        if (signal?.id) {
          byId.set(signal.id, signal);
        }
      },
    );
    return Array.from(byId.values());
  }, [signalRows, snapshot.homeSignals.data, snapshot.signals.data]);

  const selectedSignal = useMemo(() => {
    if (signalDetail) {
      return signalDetail;
    }

    return activeSignals.find((signal) => signal.id === selectedSignalId) ?? null;
  }, [activeSignals, selectedSignalId, signalDetail]);

  const topSignal = activeSignals[0] ?? null;
  const globeCountries = snapshot.topCountries.data.length
    ? snapshot.topCountries.data
    : snapshot.globe.data;
  const topMarkets = marketRows.length ? marketRows : snapshot.markets.data;

  const endpointErrors = useMemo(() => collectEndpointErrors(snapshot), [snapshot]);

  function handleSignalSort(nextSort: SignalSort) {
    setSignalSort(nextSort);
    setSignalsLoading(true);
    setSignalsError(null);

    getJson<unknown>(
      `/api/signals?limit=25&status=active&sort=${encodeURIComponent(nextSort)}`,
    )
      .then((payload) => {
        const rows = extractSignals(payload);
        setSignalRows(rows);
        setSelectedSignalId((current) => current ?? rows[0]?.id ?? null);
      })
      .catch((error) => {
        setSignalsError(error instanceof Error ? error.message : "Signals failed");
      })
      .finally(() => setSignalsLoading(false));
  }

  function selectSignal(signalId: string) {
    setSignalDetail(null);
    setDetailStatus("loading");
    setDetailError(null);
    setSelectedSignalId(signalId);
  }

  function selectCountry(country: string) {
    setRegionDetail(null);
    setRegionStatus("loading");
    setRegionError(null);
    setSelectedCountry(country);
  }

  function selectMarket(marketId: string) {
    setMarketDetail(null);
    setMarketPrices([]);
    setMarketDetailStatus("loading");
    setSelectedMarketId(marketId);
  }

  return (
    <div className="min-h-screen bg-[#05080a] text-slate-100">
      <div className="terminal-grid min-h-screen">
        <TopBar
          endpointErrors={endpointErrors}
          health={snapshot.health}
          signals={activeSignals}
          markets={topMarkets}
          status={bootStatus}
        />

        <div className="mx-auto w-screen min-w-0 max-w-[100vw] overflow-x-hidden px-3 pb-4 pt-3 lg:px-4 xl:flex xl:w-full xl:max-w-[1800px] xl:gap-3">
          <LeftRail activeTab={activeTab} onTabChange={setActiveTab} />

          <main className="w-full min-w-0 max-w-full overflow-x-hidden xl:flex-1">
            <MobileTabs activeTab={activeTab} onTabChange={setActiveTab} />

            {(bootError || endpointErrors.length > 0) && (
              <ErrorStrip
                errors={[
                  ...(bootError ? [bootError] : []),
                  ...endpointErrors.slice(0, 4),
                ]}
              />
            )}

            {activeTab === "command" && (
              <CommandCenter
                countries={globeCountries}
                loading={bootStatus === "loading"}
                marketRows={topMarkets}
                newsFeed={snapshot.newsFeed.data}
                onCountrySelect={selectCountry}
                onMarketSelect={selectMarket}
                onSignalSelect={selectSignal}
                selectedCountry={selectedCountry}
                signalRows={activeSignals}
                topSignal={topSignal}
              />
            )}

            {activeTab === "signals" && (
              <SignalExplorer
                activeSort={signalSort}
                error={signalsError}
                loading={signalsLoading}
                onSelect={selectSignal}
                onSortChange={handleSignalSort}
                selectedSignalId={selectedSignalId}
                signals={signalRows.length ? signalRows : activeSignals}
              />
            )}

            {activeTab === "globe" && (
              <GlobeExplorer
                countries={globeCountries}
                detail={regionDetail}
                error={regionError}
                loading={regionStatus === "loading"}
                onCountrySelect={selectCountry}
                onSignalSelect={selectSignal}
                selectedCountry={selectedCountry}
              />
            )}

            {activeTab === "markets" && (
              <MarketExplorer
                detail={marketDetail}
                detailStatus={marketDetailStatus}
                error={marketsError}
                loading={marketsLoading}
                marketPlatform={marketPlatform}
                marketPrices={marketPrices}
                marketSearch={marketSearch}
                marketSort={marketSort}
                markets={topMarkets}
                onPlatformChange={setMarketPlatform}
                onSearchChange={setMarketSearch}
                onSelect={selectMarket}
                onSortChange={setMarketSort}
                selectedMarketId={selectedMarketId}
              />
            )}

            {activeTab === "sports" && (
              <SportsPoliticsExplorer
                jurisdictions={snapshot.jurisdictions.data}
                leagues={snapshot.leagues.data}
              />
            )}

            {activeTab === "traders" && (
              <TraderLens traders={snapshot.leaderboard.data} />
            )}

            <div className="mt-3 2xl:hidden">
              <SignalDetailRail
                detailError={detailError}
                detailStatus={detailStatus}
                newsFeed={snapshot.newsFeed.data}
                newsIntel={snapshot.newsIntel.data}
                signal={selectedSignal}
              />
            </div>
          </main>

          <aside className="hidden w-[420px] shrink-0 2xl:block">
            <SignalDetailRail
              detailError={detailError}
              detailStatus={detailStatus}
              newsFeed={snapshot.newsFeed.data}
              newsIntel={snapshot.newsIntel.data}
              signal={selectedSignal}
            />
          </aside>
        </div>
      </div>
    </div>
  );
}

function TopBar({
  endpointErrors,
  health,
  markets,
  signals,
  status,
}: {
  endpointErrors: string[];
  health: ApiResult<{ ok?: boolean; ts?: string } | null>;
  markets: Market[];
  signals: Signal[];
  status: LoadStatus;
}) {
  const totalXVolume = signals.reduce(
    (sum, signal) => sum + (signal.x_volume_24h ?? 0),
    0,
  );
  const heat = average(signals.map((signal) => signal.severity));

  return (
    <header className="sticky top-0 z-30 border-b border-cyan-400/10 bg-[#05080a]/95 backdrop-blur">
      <div className="mx-auto flex min-h-16 w-full max-w-[100vw] flex-wrap items-center gap-3 px-3 py-3 lg:px-4 xl:max-w-[1800px]">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-10 place-items-center border border-cyan-300/30 bg-cyan-300/10 text-sm font-semibold text-cyan-200">
            KS
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-cyan-300/70">
              Kosmos
            </p>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Kosmos Signal Atlas
            </h1>
          </div>
        </div>

        <div className="grid w-full grid-cols-2 gap-2 sm:ml-auto sm:w-auto sm:flex sm:flex-none">
          <StatusPill
            label={health.ok && health.data?.ok ? "Live" : status}
            tone={health.ok && health.data?.ok ? "green" : "amber"}
            value={health.data?.ts ? formatClock(health.data.ts) : "API"}
          />
          <MetricTile label="Markets" value={compactNumber(markets.length)} />
          <MetricTile label="Signals" value={compactNumber(signals.length)} />
          <MetricTile label="X-volume" value={compactNumber(totalXVolume)} />
          <MetricTile label="Severity" value={formatScore(heat)} />
        </div>

        {endpointErrors.length > 0 && (
          <div className="w-full border border-amber-300/20 bg-amber-300/10 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-amber-100 xl:w-auto">
            {endpointErrors.length} endpoint warning
          </div>
        )}
      </div>
    </header>
  );
}

function LeftRail({
  activeTab,
  onTabChange,
}: {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}) {
  return (
    <nav className="sticky top-[76px] hidden h-[calc(100vh-92px)] w-64 shrink-0 flex-col border border-cyan-300/10 bg-[#071013]/90 xl:flex">
      <div className="border-b border-cyan-300/10 p-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">
          Navigation
        </p>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-2">
        {NAV_ITEMS.map((item) => (
          <button
            aria-pressed={activeTab === item.id}
            className={cx(
              "group flex w-full items-center justify-between border px-3 py-3 text-left transition",
              activeTab === item.id
                ? "border-cyan-300/30 bg-cyan-300/10 text-cyan-100"
                : "border-transparent text-slate-400 hover:border-cyan-300/20 hover:bg-slate-900/80 hover:text-slate-100",
            )}
            key={item.id}
            onClick={() => onTabChange(item.id)}
            type="button"
          >
            <span>
              <span className="block text-sm font-medium">{item.label}</span>
              <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                {item.kicker}
              </span>
            </span>
            <span className="font-mono text-xs text-cyan-300/70">/</span>
          </button>
        ))}
      </div>
      <div className="border-t border-cyan-300/10 p-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500">
          System Status
        </p>
        <p className="mt-2 text-sm text-slate-300">
          Public read endpoints, no auth required.
        </p>
      </div>
    </nav>
  );
}

function MobileTabs({
  activeTab,
  onTabChange,
}: {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}) {
  return (
    <div className="mb-3 flex w-full max-w-full gap-2 overflow-x-auto xl:hidden">
      {NAV_ITEMS.map((item) => (
        <button
          className={cx(
            "min-w-fit border px-3 py-2 text-sm",
            activeTab === item.id
              ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-100"
              : "border-slate-700 bg-slate-950/80 text-slate-400",
          )}
          key={item.id}
          onClick={() => onTabChange(item.id)}
          type="button"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function CommandCenter({
  countries,
  loading,
  marketRows,
  newsFeed,
  onCountrySelect,
  onMarketSelect,
  onSignalSelect,
  selectedCountry,
  signalRows,
  topSignal,
}: {
  countries: GlobeCountry[];
  loading: boolean;
  marketRows: Market[];
  newsFeed: NewsStory[];
  onCountrySelect: (country: string) => void;
  onMarketSelect: (marketId: string) => void;
  onSignalSelect: (signalId: string) => void;
  selectedCountry: string | null;
  signalRows: Signal[];
  topSignal: Signal | null;
}) {
  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="grid min-w-0 gap-3">
      <div className="grid min-w-0 gap-3 lg:grid-cols-[1.05fr_1fr]">
        <TopSignalPanel onSignalSelect={onSignalSelect} signal={topSignal} />
        <MarketMoversPanel
          markets={marketRows.slice(0, 7)}
          onMarketSelect={onMarketSelect}
        />
      </div>

      <div className="grid min-w-0 gap-3 lg:grid-cols-[1.2fr_0.8fr]">
        <GlobeHeatPanel
          countries={countries}
          onCountrySelect={onCountrySelect}
          selectedCountry={selectedCountry}
        />
        <NewsPulsePanel newsFeed={newsFeed} />
      </div>

      <SignalTable
        onSelect={onSignalSelect}
        selectedSignalId={topSignal?.id ?? null}
        signals={signalRows.slice(0, 10)}
      />
    </div>
  );
}

function TopSignalPanel({
  onSignalSelect,
  signal,
}: {
  onSignalSelect: (signalId: string) => void;
  signal: Signal | null;
}) {
  if (!signal) {
    return (
      <Panel eyebrow="Top active signal" title="No active signal loaded">
        <EmptyState copy="The active signal feed returned no rows." />
      </Panel>
    );
  }

  const primaryMarket = normalizeSignalMarkets(signal)[0];

  return (
    <Panel
      action={
        <button
          className="border border-cyan-300/20 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-100 transition hover:border-cyan-300/50 hover:bg-cyan-300/10"
          onClick={() => onSignalSelect(signal.id)}
          type="button"
        >
          View Signal
        </button>
      }
      eyebrow="Top active signal"
      title={signal.title}
    >
      <div className="grid w-full min-w-0 max-w-full gap-5 md:grid-cols-[1fr_220px]">
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <SeverityBadge severity={signal.severity} />
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-amber-200">
              High signal priority
            </span>
          </div>
          <p className="line-clamp-3 text-sm leading-6 text-slate-300">
            {signal.summary ??
              signal.narrative_summary ??
              "Kosmos detected related market movement and evidence activity."}
          </p>

          <div className="mt-5 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-4">
            <DataPoint
              label="Category"
              value={signal.primary_category ?? primaryMarket?.category ?? "Unknown"}
            />
            <DataPoint
              label="Region"
              value={
                signal.primary_country ??
                signal.primary_region ??
                signal.primary_region_group ??
                "Global"
              }
            />
            <DataPoint
              label="Market"
              value={primaryMarket?.platform ?? "Linked"}
            />
            <DataPoint label="Evidence" value={signal.evidence_count ?? 0} />
          </div>
        </div>

        <div className="border border-cyan-300/10 bg-[#061217] p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
            Live probability
          </p>
          <p className="mt-2 text-5xl font-light tracking-tight text-cyan-200">
            {formatPrice(primaryMarket?.yes_price)}
          </p>
          <div className="mt-4 h-24">
            <Sparkline
              points={buildSignalSparkline(signal)}
              stroke="rgb(34 211 238)"
            />
          </div>
        </div>
      </div>

      <div className="mt-5 grid min-w-0 grid-cols-1 gap-3 border-t border-cyan-300/10 pt-4 sm:grid-cols-2 md:grid-cols-4">
        <DataPoint label="X-volume 24h" value={compactNumber(signal.x_volume_24h)} />
        <DataPoint
          delta={signal.x_volume_24h_delta_pct}
          label="X delta"
          value={compactNumber(signal.x_volume_24h_delta)}
        />
        <DataPoint label="Confidence" value={formatScore(signal.confidence)} />
        <DataPoint
          label="Last evidence"
          value={formatRelative(signal.last_evidence_at)}
        />
      </div>
    </Panel>
  );
}

function MarketMoversPanel({
  markets,
  onMarketSelect,
}: {
  markets: Market[];
  onMarketSelect: (marketId: string) => void;
}) {
  return (
    <Panel eyebrow="Market movers" title="Live odds board">
      {markets.length === 0 ? (
        <EmptyState copy="No market movers returned from /api/markets." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
              <tr className="border-b border-cyan-300/10">
                <th className="pb-3 pr-3 font-medium">Market</th>
                <th className="pb-3 pr-3 font-medium">Live prob.</th>
                <th className="pb-3 pr-3 font-medium">24h move</th>
                <th className="pb-3 pr-3 font-medium">Volume</th>
                <th className="pb-3 font-medium">Platform</th>
              </tr>
            </thead>
            <tbody>
              {markets.map((market) => (
                <tr
                  className="cursor-pointer border-b border-cyan-300/10 transition hover:bg-cyan-300/5"
                  key={market.id}
                  onClick={() => onMarketSelect(market.id)}
                >
                  <td className="max-w-[300px] py-3 pr-3 text-slate-100">
                    <p className="line-clamp-2">{market.title}</p>
                  </td>
                  <td className="py-3 pr-3 font-mono text-cyan-200">
                    {formatPrice(market.yes_price)}
                  </td>
                  <td className="py-3 pr-3">
                    <Delta value={market.movement_1h} />
                  </td>
                  <td className="py-3 pr-3 font-mono text-slate-300">
                    {formatCurrency(market.volume_24h)}
                  </td>
                  <td className="py-3 font-mono text-[11px] uppercase text-slate-400">
                    {market.platform}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function GlobeHeatPanel({
  countries,
  onCountrySelect,
  selectedCountry,
}: {
  countries: GlobeCountry[];
  onCountrySelect: (country: string) => void;
  selectedCountry: string | null;
}) {
  const hottest = countries.slice(0, 8);

  return (
    <Panel eyebrow="Globe heat map" title="Where prediction-market heat is moving">
      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="relative min-h-[300px] overflow-hidden border border-cyan-300/10 bg-[#061116] p-4">
          <WorldGrid />
          {countries.slice(0, 32).map((country, index) => {
            const [x, y] = getCountryPosition(country.country, index);
            const active = selectedCountry === country.country;
            const heat = Math.max(0.18, Math.min(1, country.heat_score ?? 0));

            return (
              <button
                aria-label={`Open ${country.name}`}
                className={cx(
                  "absolute grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border transition",
                  active
                    ? "border-amber-200 bg-amber-300/30"
                    : "border-cyan-200/30 bg-cyan-300/20 hover:border-cyan-100",
                )}
                key={`${country.country}-${country.name}`}
                onClick={() => onCountrySelect(country.country)}
                style={{
                  height: `${12 + heat * 26}px`,
                  left: `${x}%`,
                  top: `${y}%`,
                  width: `${12 + heat * 26}px`,
                }}
                title={`${country.name}: ${formatScore(country.heat_score)} heat`}
                type="button"
              >
                <span className="size-1.5 rounded-full bg-cyan-100" />
              </button>
            );
          })}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between border border-cyan-300/10 bg-[#020607]/80 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
            <span>Low heat</span>
            <span className="h-1 w-32 bg-gradient-to-r from-cyan-500 via-amber-300 to-red-400" />
            <span>High heat</span>
          </div>
        </div>

        <div>
          <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
            Top countries
          </p>
          <div className="grid gap-2">
            {hottest.map((country, index) => (
              <button
                className={cx(
                  "flex items-center justify-between border px-3 py-2 text-left transition",
                  selectedCountry === country.country
                    ? "border-amber-300/40 bg-amber-300/10"
                    : "border-cyan-300/10 bg-slate-950/40 hover:border-cyan-300/30",
                )}
                key={country.country}
                onClick={() => onCountrySelect(country.country)}
                type="button"
              >
                <span className="min-w-0">
                  <span className="font-mono text-xs text-slate-500">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="ml-3 text-sm text-slate-100">
                    {country.name}
                  </span>
                </span>
                <span className="font-mono text-xs text-cyan-200">
                  {formatScore(country.heat_score)}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}

function NewsPulsePanel({ newsFeed }: { newsFeed: NewsStory[] }) {
  return (
    <Panel eyebrow="Evidence" title="Related news pulse">
      {newsFeed.length === 0 ? (
        <EmptyState copy="No news feed rows returned from /api/news/feed." />
      ) : (
        <div className="grid gap-3">
          {newsFeed.slice(0, 5).map((story) => (
            <a
              className="block border border-cyan-300/10 bg-slate-950/40 p-3 transition hover:border-cyan-300/30 hover:bg-cyan-300/5"
              href={story.source_url ?? undefined}
              key={story.id}
              rel="noreferrer"
              target={story.source_url ? "_blank" : undefined}
            >
              <p className="line-clamp-2 text-sm text-slate-100">
                {story.headline ?? story.title ?? "Untitled story"}
              </p>
              <div className="mt-2 flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">
                <span>{story.source_name ?? story.source_type ?? "Source"}</span>
                <span>{formatRelative(story.created_at ?? story.updated_at)}</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </Panel>
  );
}

function SignalTable({
  onSelect,
  selectedSignalId,
  signals,
}: {
  onSelect: (signalId: string) => void;
  selectedSignalId: string | null;
  signals: Signal[];
}) {
  return (
    <Panel eyebrow="Signal list" title="Active market intelligence">
      {signals.length === 0 ? (
        <EmptyState copy="No active signals returned from /api/signals." />
      ) : (
        <>
          <div className="grid gap-2 md:hidden">
            {signals.map((signal) => {
              const primaryMarket = normalizeSignalMarkets(signal)[0];

              return (
                <button
                  className={cx(
                    "border p-3 text-left transition",
                    selectedSignalId === signal.id
                      ? "border-cyan-300/50 bg-cyan-300/10"
                      : "border-cyan-300/10 bg-slate-950/40",
                  )}
                  key={signal.id}
                  onClick={() => onSelect(signal.id)}
                  type="button"
                >
                  <div className="flex items-start gap-3">
                    <SeverityBadge severity={signal.severity} />
                    <div className="min-w-0">
                      <p className="line-clamp-3 text-sm text-slate-100">
                        {signal.title}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500">
                        <span>
                          {signal.primary_category ??
                            primaryMarket?.category ??
                            "Unknown"}
                        </span>
                        <span className="text-cyan-200">
                          {formatPrice(primaryMarket?.yes_price)}
                        </span>
                        <span>{compactNumber(signal.x_volume_24h)} X 24h</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
              <tr className="border-b border-cyan-300/10">
                <th className="pb-3 pr-3 font-medium">Severity</th>
                <th className="pb-3 pr-3 font-medium">Signal</th>
                <th className="pb-3 pr-3 font-medium">Category</th>
                <th className="pb-3 pr-3 font-medium">Live prob.</th>
                <th className="pb-3 pr-3 font-medium">X-volume</th>
                <th className="pb-3 font-medium">Last seen</th>
              </tr>
            </thead>
            <tbody>
              {signals.map((signal) => {
                const primaryMarket = normalizeSignalMarkets(signal)[0];

                return (
                  <tr
                    className={cx(
                      "cursor-pointer border-b border-cyan-300/10 transition hover:bg-cyan-300/5",
                      selectedSignalId === signal.id && "bg-cyan-300/10",
                    )}
                    key={signal.id}
                    onClick={() => onSelect(signal.id)}
                  >
                    <td className="py-3 pr-3">
                      <SeverityBadge severity={signal.severity} />
                    </td>
                    <td className="max-w-[360px] py-3 pr-3 text-slate-100">
                      <p className="line-clamp-2">{signal.title}</p>
                    </td>
                    <td className="py-3 pr-3 text-slate-400">
                      {signal.primary_category ?? primaryMarket?.category ?? "Unknown"}
                    </td>
                    <td className="py-3 pr-3 font-mono text-cyan-200">
                      {formatPrice(primaryMarket?.yes_price)}
                    </td>
                    <td className="py-3 pr-3 font-mono text-slate-300">
                      {compactNumber(signal.x_volume_24h)}
                    </td>
                    <td className="py-3 font-mono text-xs text-slate-500">
                      {formatRelative(signal.last_evidence_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </>
      )}
    </Panel>
  );
}

function SignalExplorer({
  activeSort,
  error,
  loading,
  onSelect,
  onSortChange,
  selectedSignalId,
  signals,
}: {
  activeSort: SignalSort;
  error: string | null;
  loading: boolean;
  onSelect: (signalId: string) => void;
  onSortChange: (sort: SignalSort) => void;
  selectedSignalId: string | null;
  signals: Signal[];
}) {
  return (
    <div className="grid gap-3">
      <Panel
        action={
          <SegmentedControl
            active={activeSort}
            items={SIGNAL_SORTS}
            onChange={onSortChange}
          />
        }
        eyebrow="Signals"
        title="Active signal explorer"
      >
        <p className="max-w-3xl text-sm leading-6 text-slate-400">
          Sort the live feed by severity, recency, rank, velocity, or X-volume.
          Select any signal to open markets, evidence, tweet rows, and quality
          metadata in the detail rail.
        </p>
        {error && <InlineError message={error} />}
      </Panel>

      {loading ? (
        <DashboardSkeleton compact />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {signals.length === 0 ? (
            <EmptyState copy="No signals matched this filter." />
          ) : (
            signals.map((signal) => (
              <SignalCard
                key={signal.id}
                onSelect={onSelect}
                selected={selectedSignalId === signal.id}
                signal={signal}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function SignalCard({
  onSelect,
  selected,
  signal,
}: {
  onSelect: (signalId: string) => void;
  selected: boolean;
  signal: Signal;
}) {
  const markets = normalizeSignalMarkets(signal);
  const twitterEvidence = normalizeEvidence(signal.top_twitter_evidence);

  return (
    <button
      className={cx(
        "border bg-[#071013]/90 p-4 text-left transition hover:border-cyan-300/40 hover:bg-cyan-300/5",
        selected ? "border-cyan-300/50" : "border-cyan-300/10",
      )}
      onClick={() => onSelect(signal.id)}
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
            {signal.primary_category ?? "Signal"} /{" "}
            {signal.primary_country ?? signal.primary_region_group ?? "Global"}
          </p>
          <h3 className="mt-2 line-clamp-2 text-lg font-semibold leading-6 text-slate-100">
            {signal.title}
          </h3>
        </div>
        <SeverityBadge severity={signal.severity} />
      </div>

      <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-400">
        {signal.summary ??
          signal.narrative_summary ??
          "Signal summary is not available yet."}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <DataPoint label="Confidence" value={formatScore(signal.confidence)} />
        <DataPoint label="Markets" value={signal.market_link_count ?? markets.length} />
        <DataPoint label="Evidence" value={signal.evidence_count ?? 0} />
        <DataPoint label="X 24h" value={compactNumber(signal.x_volume_24h)} />
      </div>

      <div className="mt-4 border-t border-cyan-300/10 pt-3">
        {markets.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {markets.slice(0, 3).map((market) => (
              <span
                className="border border-cyan-300/10 bg-cyan-300/5 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-cyan-100"
                key={market.market_id}
              >
                {market.platform} {formatPrice(market.yes_price)}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No linked markets returned.</p>
        )}
        <p className="mt-3 text-xs text-slate-500">
          {twitterEvidence.length > 0
            ? `${twitterEvidence.length} tweet evidence row${
                twitterEvidence.length === 1 ? "" : "s"
              } available`
            : "No tweet evidence returned for this signal"}
        </p>
      </div>
    </button>
  );
}

function GlobeExplorer({
  countries,
  detail,
  error,
  loading,
  onCountrySelect,
  onSignalSelect,
  selectedCountry,
}: {
  countries: GlobeCountry[];
  detail: GlobeRegionDetail | null;
  error: string | null;
  loading: boolean;
  onCountrySelect: (country: string) => void;
  onSignalSelect: (signalId: string) => void;
  selectedCountry: string | null;
}) {
  const activity =
    detail?.activity ??
    countries.find((country) => country.country === selectedCountry) ??
    null;

  return (
    <div className="grid gap-3">
      <GlobeHeatPanel
        countries={countries}
        onCountrySelect={onCountrySelect}
        selectedCountry={selectedCountry}
      />

      {error && <InlineError message={error} />}

      <div className="grid gap-3 lg:grid-cols-[0.8fr_1.2fr]">
        <Panel
          eyebrow="Country drilldown"
          title={activity?.name ?? selectedCountry ?? "Select a country"}
        >
          {loading ? (
            <SkeletonRows count={4} />
          ) : activity ? (
            <div className="grid gap-3">
              <DataPoint label="Heat score" value={formatScore(activity.heat_score)} />
              <DataPoint
                label="Active signals"
                value={compactNumber(activity.active_signals)}
              />
              <DataPoint
                label="Active markets"
                value={compactNumber(activity.active_markets)}
              />
              <DataPoint
                label="24h volume"
                value={formatCurrency(activity.total_volume_24h)}
              />
            </div>
          ) : (
            <EmptyState copy="Select a country to fetch /api/globe/region/{country}." />
          )}
        </Panel>

        <Panel eyebrow="Regional intelligence" title="Signals and markets">
          {loading ? (
            <SkeletonRows count={6} />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                  Top signals
                </p>
                <div className="grid gap-2">
                  {normalizeSignals(detail?.signals).slice(0, 6).map((signal) => (
                    <button
                      className="border border-cyan-300/10 bg-slate-950/40 p-3 text-left transition hover:border-cyan-300/30"
                      key={signal.id}
                      onClick={() => onSignalSelect(signal.id)}
                      type="button"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="line-clamp-2 text-sm text-slate-100">
                          {signal.title}
                        </p>
                        <SeverityBadge severity={signal.severity} />
                      </div>
                      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">
                        {formatRelative(signal.last_evidence_at)}
                      </p>
                    </button>
                  ))}
                  {normalizeSignals(detail?.signals).length === 0 && (
                    <EmptyState copy="No regional signals returned." />
                  )}
                </div>
              </div>

              <div>
                <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                  Top markets
                </p>
                <div className="grid gap-2">
                  {normalizeMarkets(detail?.markets).slice(0, 6).map((market) => (
                    <div
                      className="border border-cyan-300/10 bg-slate-950/40 p-3"
                      key={market.id}
                    >
                      <p className="line-clamp-2 text-sm text-slate-100">
                        {market.title}
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-3 font-mono text-xs text-slate-400">
                        <span>{market.platform}</span>
                        <span className="text-cyan-200">
                          {formatPrice(market.yes_price)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {normalizeMarkets(detail?.markets).length === 0 && (
                    <EmptyState copy="No regional markets returned." />
                  )}
                </div>
              </div>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function MarketExplorer({
  detail,
  detailStatus,
  error,
  loading,
  marketPlatform,
  marketPrices,
  marketSearch,
  marketSort,
  markets,
  onPlatformChange,
  onSearchChange,
  onSelect,
  onSortChange,
  selectedMarketId,
}: {
  detail: Market | null;
  detailStatus: LoadStatus;
  error: string | null;
  loading: boolean;
  marketPlatform: PlatformFilter;
  marketPrices: PricePoint[];
  marketSearch: string;
  marketSort: MarketSort;
  markets: Market[];
  onPlatformChange: (platform: PlatformFilter) => void;
  onSearchChange: (search: string) => void;
  onSelect: (marketId: string) => void;
  onSortChange: (sort: MarketSort) => void;
  selectedMarketId: string | null;
}) {
  return (
    <div className="grid gap-3">
      <Panel
        action={
          <SegmentedControl
            active={marketSort}
            items={MARKET_SORTS}
            onChange={onSortChange}
          />
        }
        eyebrow="Markets"
        title="Market explorer"
      >
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            className="h-11 border border-cyan-300/10 bg-slate-950/80 px-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-300/50"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search markets, teams, races, countries"
            value={marketSearch}
          />
          <select
            className="h-11 border border-cyan-300/10 bg-slate-950/80 px-3 font-mono text-xs uppercase tracking-[0.14em] text-slate-200 outline-none focus:border-cyan-300/50"
            onChange={(event) =>
              onPlatformChange(event.target.value as PlatformFilter)
            }
            value={marketPlatform}
          >
            <option value="all">All platforms</option>
            <option value="kalshi">Kalshi</option>
            <option value="polymarket">Polymarket</option>
          </select>
        </div>
        {error && <InlineError message={error} />}
      </Panel>

      <div className="grid gap-3 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel eyebrow="Live odds" title="Movers board">
          {loading ? (
            <SkeletonRows count={8} />
          ) : markets.length === 0 ? (
            <EmptyState copy="No markets matched this search." />
          ) : (
            <div className="grid gap-2">
              {markets.map((market) => (
                <button
                  className={cx(
                    "grid gap-3 border p-3 text-left transition sm:grid-cols-[1fr_92px_92px_110px]",
                    selectedMarketId === market.id
                      ? "border-cyan-300/50 bg-cyan-300/10"
                      : "border-cyan-300/10 bg-slate-950/40 hover:border-cyan-300/30",
                  )}
                  key={market.id}
                  onClick={() => onSelect(market.id)}
                  type="button"
                >
                  <span className="min-w-0">
                    <span className="line-clamp-2 text-sm text-slate-100">
                      {market.title}
                    </span>
                    <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">
                      {market.platform} / {market.category ?? "uncategorized"}
                    </span>
                  </span>
                  <DataPoint label="YES" value={formatPrice(market.yes_price)} />
                  <DataPoint label="NO" value={formatPrice(market.no_price)} />
                  <DataPoint
                    label="Volume"
                    value={formatCurrency(market.volume_24h)}
                  />
                </button>
              ))}
            </div>
          )}
        </Panel>

        <Panel eyebrow="Market detail" title={detail?.title ?? "Select a market"}>
          {detailStatus === "loading" ? (
            <SkeletonRows count={5} />
          ) : detail ? (
            <div>
              {detail.image_url && (
                <div
                  aria-hidden="true"
                  className="mb-4 h-36 border border-cyan-300/10 bg-cover bg-center"
                  style={{ backgroundImage: `url(${detail.image_url})` }}
                />
              )}
              <div className="grid grid-cols-2 gap-3">
                <DataPoint label="Platform" value={detail.platform} />
                <DataPoint label="Category" value={detail.category ?? "Unknown"} />
                <DataPoint label="YES" value={formatPrice(detail.yes_price)} />
                <DataPoint label="NO" value={formatPrice(detail.no_price)} />
                <DataPoint label="24h low" value={formatPrice(detail.low_24h)} />
                <DataPoint label="24h high" value={formatPrice(detail.high_24h)} />
                <DataPoint
                  label="Total volume"
                  value={formatCurrency(detail.volume_total)}
                />
                <DataPoint label="Closes" value={formatDate(detail.closes_at)} />
              </div>
              <div className="mt-5 h-36 border border-cyan-300/10 bg-[#061217] p-3">
                <Sparkline
                  points={buildPriceSparkline(marketPrices, detail.yes_price)}
                  stroke="rgb(34 211 238)"
                />
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-500">
                Price history is fetched from /api/markets/{detail.id}/prices
                ?window=24h when available.
              </p>
            </div>
          ) : (
            <EmptyState copy="Select a market to fetch its detail and 24h prices." />
          )}
        </Panel>
      </div>
    </div>
  );
}

function SportsPoliticsExplorer({
  jurisdictions,
  leagues,
}: {
  jurisdictions: Jurisdiction[];
  leagues: League[];
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Panel eyebrow="Sports" title="League surface">
        <div className="grid gap-2">
          {leagues.slice(0, 12).map((league) => (
            <TaxonomyRow
              key={league.code ?? league.display_name}
              label={league.display_name ?? league.code ?? "League"}
              meta={league.sport_group ?? "sports"}
              value={`${compactNumber(league.market_count)} markets`}
            />
          ))}
          {leagues.length === 0 && (
            <EmptyState copy="No sports leagues returned from /api/sports/leagues." />
          )}
        </div>
      </Panel>

      <Panel eyebrow="Politics" title="Jurisdiction surface">
        <div className="grid gap-2">
          {jurisdictions.slice(0, 12).map((jurisdiction) => (
            <TaxonomyRow
              key={jurisdiction.code ?? jurisdiction.display_name}
              label={jurisdiction.display_name ?? jurisdiction.code ?? "Jurisdiction"}
              meta={jurisdiction.country ?? "politics"}
              value={`${compactNumber(jurisdiction.market_count)} markets`}
            />
          ))}
          {jurisdictions.length === 0 && (
            <EmptyState copy="No jurisdictions returned from /api/politics/jurisdictions." />
          )}
        </div>
      </Panel>
    </div>
  );
}

function TraderLens({ traders }: { traders: LeaderboardTrader[] }) {
  return (
    <Panel eyebrow="Trader Lens" title="Polymarket leaderboard">
      {traders.length === 0 ? (
        <EmptyState copy="No leaderboard rows returned from /api/pm/leaderboard." />
      ) : (
        <div className="grid gap-2">
          {traders.slice(0, 18).map((trader, index) => (
            <div
              className="grid gap-3 border border-cyan-300/10 bg-slate-950/40 p-3 sm:grid-cols-[64px_1fr_120px_120px]"
              key={trader.wallet ?? trader.address ?? `${index}`}
            >
              <span className="font-mono text-sm text-slate-500">
                #{trader.rank ?? index + 1}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm text-slate-100">
                  {trader.display_name ??
                    trader.username ??
                    trader.name ??
                    trader.wallet ??
                    trader.address ??
                    "Unknown trader"}
                </span>
                <span className="block truncate font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500">
                  {trader.wallet ?? trader.address ?? "wallet unavailable"}
                </span>
              </span>
              <DataPoint label="Volume" value={formatCurrency(trader.volume)} />
              <DataPoint
                label="PnL"
                value={formatCurrency(trader.profit ?? trader.pnl)}
              />
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function SignalDetailRail({
  detailError,
  detailStatus,
  newsFeed,
  newsIntel,
  signal,
}: {
  detailError: string | null;
  detailStatus: LoadStatus;
  newsFeed: NewsStory[];
  newsIntel: NewsStory[];
  signal: Signal | null;
}) {
  const [detailTab, setDetailTab] = useState<"evidence" | "news" | "tweets">(
    "evidence",
  );
  const markets = normalizeSignalMarkets(signal);
  const evidence = normalizeEvidence(signal?.evidence);
  const tweets = normalizeEvidence(signal?.top_twitter_evidence);
  const relatedNews = [...newsIntel, ...newsFeed].slice(0, 8);

  return (
    <div className="sticky top-[76px] grid gap-3">
      <Panel eyebrow="Signal detail" title={signal?.title ?? "Select a signal"}>
        {detailStatus === "loading" && <SkeletonRows count={5} />}
        {detailError && <InlineError message={detailError} />}
        {!signal && detailStatus !== "loading" && (
          <EmptyState copy="Select a live signal to open the intelligence brief." />
        )}
        {signal && (
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <SeverityBadge severity={signal.severity} />
              <span className="border border-cyan-300/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-100">
                {signal.primary_category ?? "category unknown"}
              </span>
              <span className="border border-cyan-300/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-300">
                {signal.primary_country ?? signal.primary_region ?? "global"}
              </span>
            </div>

            <p className="text-sm leading-6 text-slate-300">
              {signal.summary ??
                signal.narrative_summary ??
                "No narrative summary returned yet."}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <DataPoint label="Confidence" value={formatScore(signal.confidence)} />
              <DataPoint label="Momentum" value={formatScore(signal.momentum)} />
              <DataPoint label="Discussion" value={signal.discussion_count ?? 0} />
              <DataPoint label="Quality" value={qualityLabel(signal.quality)} />
              <DataPoint label="X 1h" value={compactNumber(signal.x_volume_1h)} />
              <DataPoint label="X 24h" value={compactNumber(signal.x_volume_24h)} />
            </div>

            <div className="mt-5">
              <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                Linked markets
              </p>
              <div className="grid gap-2">
                {markets.slice(0, 4).map((market) => (
                  <div
                    className="border border-cyan-300/10 bg-slate-950/40 p-3"
                    key={market.market_id}
                  >
                    <p className="line-clamp-2 text-sm text-slate-100">
                      {market.title}
                    </p>
                    <div className="mt-2 flex items-center justify-between font-mono text-xs text-slate-400">
                      <span>{market.platform}</span>
                      <span className="text-cyan-200">
                        {formatPrice(market.yes_price)}
                      </span>
                    </div>
                  </div>
                ))}
                {markets.length === 0 && (
                  <EmptyState copy="No linked markets returned for this signal." />
                )}
              </div>
            </div>
          </div>
        )}
      </Panel>

      <Panel
        action={
          <SegmentedControl
            active={detailTab}
            items={[
              { id: "evidence", label: "Evidence" },
              { id: "news", label: "News" },
              { id: "tweets", label: "Tweets" },
            ]}
            onChange={setDetailTab}
          />
        }
        eyebrow="Evidence"
        title="Why it is moving"
      >
        {detailTab === "evidence" && (
          <EvidenceList
            emptyCopy="No generic evidence rows returned for this signal."
            evidence={evidence}
          />
        )}
        {detailTab === "tweets" && (
          <EvidenceList
            emptyCopy="No tweet evidence is available for this signal yet. X access can be intermittent; evidence and news remain available."
            evidence={tweets}
          />
        )}
        {detailTab === "news" && (
          <div className="grid gap-2">
            {relatedNews.map((story) => (
              <a
                className="block border border-cyan-300/10 bg-slate-950/40 p-3 transition hover:border-cyan-300/30"
                href={story.source_url ?? undefined}
                key={story.id}
                rel="noreferrer"
                target={story.source_url ? "_blank" : undefined}
              >
                <p className="line-clamp-2 text-sm text-slate-100">
                  {story.headline ?? story.title ?? "Untitled story"}
                </p>
                <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">
                  {story.source_name ?? story.source_type ?? "news"} /{" "}
                  {formatRelative(story.created_at ?? story.updated_at)}
                </p>
              </a>
            ))}
            {relatedNews.length === 0 && (
              <EmptyState copy="No news rows returned from /api/news/feed or /api/news/intel." />
            )}
          </div>
        )}
      </Panel>
    </div>
  );
}

function EvidenceList({
  emptyCopy,
  evidence,
}: {
  emptyCopy: string;
  evidence: SignalEvidence[];
}) {
  if (evidence.length === 0) {
    return <EmptyState copy={emptyCopy} />;
  }

  return (
    <div className="grid gap-2">
      {evidence.slice(0, 8).map((item) => (
        <a
          className="block border border-cyan-300/10 bg-slate-950/40 p-3 transition hover:border-cyan-300/30"
          href={item.url ?? undefined}
          key={item.id}
          rel="noreferrer"
          target={item.url ? "_blank" : undefined}
        >
          <p className="line-clamp-2 text-sm text-slate-100">
            {item.title ?? item.summary ?? "Evidence row"}
          </p>
          {item.summary && item.title && (
            <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
              {item.summary}
            </p>
          )}
          <div className="mt-2 flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">
            <span>{item.source_name ?? item.author ?? item.source_type ?? "source"}</span>
            <span>{formatRelative(item.published_at ?? item.occurred_at)}</span>
          </div>
        </a>
      ))}
    </div>
  );
}

function Panel({
  action,
  children,
  eyebrow,
  title,
}: {
  action?: React.ReactNode;
  children: React.ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <section className="w-full min-w-0 max-w-full overflow-hidden border border-cyan-300/10 bg-[#071013]/90 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3 border-b border-cyan-300/10 px-4 py-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
            {eyebrow}
          </p>
          <h2 className="mt-1 line-clamp-2 text-base font-semibold tracking-tight text-slate-100">
            {title}
          </h2>
        </div>
        {action}
      </div>
      <div className="min-w-0 max-w-full overflow-hidden p-4">{children}</div>
    </section>
  );
}

function SegmentedControl<T extends string>({
  active,
  items,
  onChange,
}: {
  active: T;
  items: Array<{ id: T; label: string }>;
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex max-w-full overflow-x-auto border border-cyan-300/10 bg-slate-950/70 p-1">
      {items.map((item) => (
        <button
          aria-pressed={active === item.id}
          className={cx(
            "min-w-fit px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] transition",
            active === item.id
              ? "bg-cyan-300 text-slate-950"
              : "text-slate-400 hover:bg-cyan-300/10 hover:text-slate-100",
          )}
          key={item.id}
          onClick={() => onChange(item.id)}
          type="button"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border border-cyan-300/10 bg-slate-950/70 px-3 py-2 sm:min-w-[112px]">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 font-mono text-sm text-slate-100">{value}</p>
    </div>
  );
}

function StatusPill({
  label,
  tone,
  value,
}: {
  label: string;
  tone: "green" | "amber";
  value: string;
}) {
  return (
    <div className="min-w-0 border border-cyan-300/10 bg-slate-950/70 px-3 py-2 sm:min-w-[156px]">
      <div className="flex items-center justify-between gap-3">
        <span
          className={cx(
            "font-mono text-[10px] uppercase tracking-[0.18em]",
            tone === "green" ? "text-emerald-300" : "text-amber-300",
          )}
        >
          {label}
        </span>
        <span className="size-2 rounded-full bg-emerald-300" />
      </div>
      <p className="mt-1 font-mono text-sm text-slate-100">{value}</p>
    </div>
  );
}

function DataPoint({
  delta,
  label,
  value,
}: {
  delta?: number | null;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="min-w-0 border border-cyan-300/10 bg-slate-950/40 px-3 py-2">
      <p className="truncate font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <div className="mt-1 flex items-center gap-2">
        <p className="min-w-0 truncate text-sm text-slate-100">{value ?? "--"}</p>
        {typeof delta === "number" && <Delta value={delta} />}
      </div>
    </div>
  );
}

function Delta({ value }: { value?: number | null }) {
  if (typeof value !== "number") {
    return <span className="font-mono text-xs text-slate-600">--</span>;
  }

  const display = Math.abs(value) <= 1 ? value * 100 : value;
  const positive = display >= 0;

  return (
    <span
      className={cx(
        "font-mono text-xs",
        positive ? "text-emerald-300" : "text-red-300",
      )}
    >
      {positive ? "+" : ""}
      {display.toFixed(Math.abs(display) >= 10 ? 0 : 1)}%
    </span>
  );
}

function SeverityBadge({ severity }: { severity?: number | null }) {
  const score = formatScore(severity);
  const numeric = scaledScore(severity);

  return (
    <span
      className={cx(
        "inline-flex min-w-12 items-center justify-center border px-2 py-1 font-mono text-sm font-semibold",
        numeric >= 75
          ? "border-amber-300/60 bg-amber-300/10 text-amber-200"
          : numeric >= 45
            ? "border-cyan-300/50 bg-cyan-300/10 text-cyan-100"
            : "border-slate-600 bg-slate-900 text-slate-300",
      )}
    >
      {score}
    </span>
  );
}

function Sparkline({
  points,
  stroke,
}: {
  points: number[];
  stroke: string;
}) {
  const polyline = toPolyline(points, 260, 100);

  return (
    <svg
      aria-hidden="true"
      className="h-full w-full overflow-visible"
      preserveAspectRatio="none"
      viewBox="0 0 260 100"
    >
      <defs>
        <linearGradient id="spark-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`M ${polyline.area} L 260 100 L 0 100 Z`}
        fill="url(#spark-fill)"
      />
      <polyline
        fill="none"
        points={polyline.line}
        stroke={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
      />
    </svg>
  );
}

function WorldGrid() {
  return (
    <div className="absolute inset-0 opacity-70">
      <div className="signal-map absolute inset-6" />
      <div className="absolute left-[14%] top-[20%] h-[42%] w-[25%] border border-cyan-300/10" />
      <div className="absolute left-[43%] top-[16%] h-[48%] w-[17%] border border-cyan-300/10" />
      <div className="absolute left-[63%] top-[22%] h-[45%] w-[27%] border border-cyan-300/10" />
      <div className="scanline absolute inset-0" />
    </div>
  );
}

function DashboardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cx("grid gap-3", compact ? "" : "lg:grid-cols-2")}>
      <Panel eyebrow="Loading" title="Fetching Kosmos endpoints">
        <SkeletonRows count={compact ? 4 : 8} />
      </Panel>
      {!compact && (
        <Panel eyebrow="Loading" title="Normalizing live responses">
          <SkeletonRows count={8} />
        </Panel>
      )}
    </div>
  );
}

function SkeletonRows({ count }: { count: number }) {
  return (
    <div className="grid gap-3">
      {Array.from({ length: count }).map((_, index) => (
        <div
          className="h-10 animate-pulse border border-cyan-300/10 bg-slate-800/30"
          key={index}
        />
      ))}
    </div>
  );
}

function EmptyState({ copy }: { copy: string }) {
  return (
    <div className="border border-dashed border-cyan-300/15 bg-slate-950/40 p-4 text-sm leading-6 text-slate-500">
      {copy}
    </div>
  );
}

function InlineError({ message }: { message: string }) {
  return (
    <div className="mt-3 border border-red-300/20 bg-red-400/10 px-3 py-2 text-sm leading-6 text-red-100">
      {message}
    </div>
  );
}

function ErrorStrip({ errors }: { errors: string[] }) {
  return (
    <div className="mb-3 border border-amber-300/20 bg-amber-300/10 p-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-200">
        API warnings
      </p>
      <div className="mt-2 grid gap-1 text-sm text-amber-50">
        {errors.map((error) => (
          <p className="line-clamp-2" key={error}>
            {error}
          </p>
        ))}
      </div>
    </div>
  );
}

function TaxonomyRow({
  label,
  meta,
  value,
}: {
  label: string;
  meta: string;
  value: string;
}) {
  return (
    <div className="grid gap-3 border border-cyan-300/10 bg-slate-950/40 p-3 sm:grid-cols-[1fr_120px]">
      <span className="min-w-0">
        <span className="block truncate text-sm text-slate-100">{label}</span>
        <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500">
          {meta}
        </span>
      </span>
      <span className="font-mono text-xs text-cyan-100">{value}</span>
    </div>
  );
}

function collectEndpointErrors(snapshot: KosmosSnapshot): string[] {
  return Object.entries(snapshot)
    .flatMap(([name, result]) => {
      const maybeResult = result as ApiResult<unknown>;
      return maybeResult.error ? [`${name}: ${maybeResult.error}`] : [];
    })
    .filter(Boolean);
}

function normalizeSignalMarkets(signal?: Signal | null): SignalMarket[] {
  return Array.isArray(signal?.markets) ? signal.markets.filter(Boolean) : [];
}

function normalizeEvidence(evidence?: SignalEvidence[] | null): SignalEvidence[] {
  return Array.isArray(evidence) ? evidence.filter(Boolean) : [];
}

function normalizeSignals(signals?: Signal[] | null): Signal[] {
  return Array.isArray(signals) ? signals.filter(Boolean) : [];
}

function normalizeMarkets(markets?: Market[] | null): Market[] {
  return Array.isArray(markets) ? markets.filter(Boolean) : [];
}

function compactNumber(value?: number | null): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "--";
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value >= 1000 ? 1 : 0,
    notation: Math.abs(value) >= 1000 ? "compact" : "standard",
  }).format(value);
}

function formatCurrency(value?: number | null): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "--";
  }

  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: value >= 1000 ? 1 : 0,
    notation: Math.abs(value) >= 1000 ? "compact" : "standard",
    style: "currency",
  }).format(value);
}

function formatPrice(value?: number | null): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "--";
  }

  return `${Math.round(value * 100)}c`;
}

function scaledScore(value?: number | null): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }

  return Math.round(value <= 1 ? value * 100 : value);
}

function formatScore(value?: number | null): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "--";
  }

  return String(scaledScore(value));
}

function average(values: Array<number | undefined | null>): number | null {
  const clean = values.filter(
    (value): value is number => typeof value === "number" && !Number.isNaN(value),
  );

  if (clean.length === 0) {
    return null;
  }

  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

function formatRelative(value?: string | null): string {
  if (!value) {
    return "--";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (Math.abs(diffMinutes) < 60) {
    return rtf.format(diffMinutes, "minute");
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 48) {
    return rtf.format(diffHours, "hour");
  }

  return rtf.format(Math.round(diffHours / 24), "day");
}

function formatDate(value?: string | null): string {
  if (!value) {
    return "--";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
  }).format(date);
}

function formatClock(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "UTC";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

function qualityLabel(quality?: Record<string, unknown>): string {
  const band = quality?.band;
  return typeof band === "string" ? band : "--";
}

function buildSignalSparkline(signal: Signal): number[] {
  const seed = hashCode(signal.id || signal.title);
  const base = scaledScore(signal.confidence) || 45;
  const momentum = scaledScore(signal.momentum) / 12;

  return Array.from({ length: 28 }).map((_, index) => {
    const wave = Math.sin((index + seed) / 2.8) * 4;
    const drift = index * Math.max(0.08, momentum / 18);
    const jitter = ((seed >> (index % 8)) & 3) - 1.5;
    return Math.max(8, Math.min(98, base + wave + drift + jitter));
  });
}

function buildPriceSparkline(
  points: PricePoint[],
  fallback?: number | null,
): number[] {
  const realPoints = points
    .map((point) => point.yes_price ?? point.price)
    .filter((value): value is number => typeof value === "number");

  if (realPoints.length > 1) {
    return realPoints.map((value) => value * 100);
  }

  const base = typeof fallback === "number" ? fallback * 100 : 50;
  return Array.from({ length: 24 }).map((_, index) => {
    const wave = Math.sin(index / 2.4) * 2.5;
    return Math.max(1, Math.min(99, base + wave));
  });
}

function toPolyline(points: number[], width: number, height: number) {
  const values = points.length ? points : [50, 50];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const step = width / Math.max(1, values.length - 1);

  const coords = values.map((value, index) => {
    const x = index * step;
    const y = height - ((value - min) / range) * (height - 12) - 6;
    return [x, y] as const;
  });

  return {
    area: coords.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" "),
    line: coords.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" "),
  };
}

function getCountryPosition(code: string, index: number): [number, number] {
  return COUNTRY_POSITIONS[code.toUpperCase()] ?? hashPosition(code, index);
}

function hashPosition(code: string, index: number): [number, number] {
  const hash = hashCode(code || String(index));
  return [14 + (hash % 72), 18 + ((hash >> 5) % 64)];
}

function hashCode(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
