"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  Building2,
  ChevronRight,
  Filter,
  Globe2,
  LayoutGrid,
  Link2,
  Newspaper,
  Radio,
  Search,
  Settings,
  TrendingUp,
  Trophy,
} from "lucide-react";
import dynamic from "next/dynamic";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  categoryAccent,
  type FeedItem,
  formatPercent,
  formatRelativeTime,
  formatVolume,
  type KosmosData,
  type Market,
  platformLabel,
  type Signal,
  severityColor,
  severityLabel,
  useKosmosData,
} from "@/lib/kosmos-data";

const Globe3D = dynamic(() => import("@/components/globe-3d"), { ssr: false });
const SignalDetailDrawer = dynamic(
  () => import("@/components/signal-detail-drawer"),
  { ssr: false },
);
const MarketDetailDrawer = dynamic(
  () => import("@/components/market-detail-drawer"),
  { ssr: false },
);
const SportsView = dynamic(() => import("@/components/sports-view"), {
  ssr: false,
});
const PoliticsView = dynamic(() => import("@/components/politics-view"), {
  ssr: false,
});
const LiveTicker = dynamic(() => import("@/components/live-ticker"), {
  ssr: false,
});
const CountryDetailDrawer = dynamic(
  () => import("@/components/country-detail-drawer"),
  { ssr: false },
);

/* ═════════════════  View routing  ════════════════════════════════════════ */

type ViewKey = "globe" | "markets" | "wire" | "sports" | "politics";

const VIEW_LABELS: Record<ViewKey, string> = {
  globe: "Globe",
  markets: "Markets",
  wire: "Wire",
  sports: "Sports",
  politics: "Politics",
};

const NAV_ITEMS: { key: ViewKey; icon: typeof Globe2; shortcut: string }[] = [
  { key: "globe", icon: Globe2, shortcut: "1" },
  { key: "markets", icon: LayoutGrid, shortcut: "2" },
  { key: "wire", icon: Newspaper, shortcut: "3" },
  { key: "sports", icon: Trophy, shortcut: "4" },
  { key: "politics", icon: Building2, shortcut: "5" },
];

/* ═════════════════  Sidebar  ════════════════════════════════════════════ */

function Sidebar({
  view,
  onView,
}: {
  view: ViewKey;
  onView: (v: ViewKey) => void;
}) {
  return (
    <aside className="flex h-screen w-[60px] flex-col items-center justify-between border-r border-white/[0.05] bg-[#070709] py-3">
      <div className="flex flex-col items-center gap-1">
        <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.04]">
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4 text-[#EAE8E3]/85"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
        </div>

        {NAV_ITEMS.map(({ key, icon: Icon, shortcut }) => {
          const active = view === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onView(key)}
              className={`group relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
                active
                  ? "bg-white/[0.06] text-[#EAE8E3]"
                  : "text-[#666] hover:bg-white/[0.03] hover:text-[#bbb]"
              }`}
              aria-label={VIEW_LABELS[key]}
            >
              {active && (
                <span
                  aria-hidden
                  className="absolute -left-3 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-[#F03E17]"
                />
              )}
              <Icon className="h-[17px] w-[17px]" strokeWidth={1.6} />
              <span className="pointer-events-none absolute left-12 z-50 hidden whitespace-nowrap rounded-md border border-white/[0.06] bg-[#0a0a0d] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[#bbb] shadow-lg group-hover:flex">
                {VIEW_LABELS[key]}
                <span className="ml-2 rounded bg-white/[0.06] px-1 text-[#888]">
                  ⌘{shortcut}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-[#666] transition-colors hover:bg-white/[0.03] hover:text-[#bbb]"
          aria-label="Settings"
        >
          <Settings className="h-[17px] w-[17px]" strokeWidth={1.6} />
        </button>
      </div>
    </aside>
  );
}

/* ═════════════════  Top bar (with command button)  ══════════════════════ */

function TopBar({
  view,
  onCommand,
  data,
}: {
  view: ViewKey;
  onCommand: () => void;
  data: KosmosData;
}) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-white/[0.05] bg-[#070709] px-5">
      <div className="flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.2em]">
        <span className="text-[#F03E17]">Kosmos</span>
        <ChevronRight className="h-3 w-3 text-[#333]" />
        <span className="text-[#bbb]">{VIEW_LABELS[view]}</span>
      </div>

      <button
        type="button"
        onClick={onCommand}
        className="group flex h-8 w-full max-w-[440px] items-center gap-2.5 rounded-lg border border-white/[0.06] bg-white/[0.025] px-3 text-left text-[12.5px] text-[#666] transition-colors hover:border-white/[0.12] hover:text-[#bbb]"
      >
        <Search className="h-3.5 w-3.5" strokeWidth={1.6} />
        <span className="flex-1 truncate">
          Search markets, signals, posts…
        </span>
        <span className="hidden items-center gap-0.5 font-mono text-[10px] text-[#444] sm:flex">
          <kbd className="rounded border border-white/[0.06] bg-white/[0.04] px-1.5 py-0.5">
            ⌘
          </kbd>
          <kbd className="rounded border border-white/[0.06] bg-white/[0.04] px-1.5 py-0.5">
            K
          </kbd>
        </span>
      </button>

      <div className="flex items-center gap-2">
        <div className="hidden items-center gap-2 rounded-md border border-white/[0.06] bg-white/[0.02] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] md:flex">
          <span
            className={`relative flex h-1.5 w-1.5 ${
              data.online ? "" : "opacity-50"
            }`}
          >
            <span
              className={`absolute inline-flex h-full w-full rounded-full ${
                data.online ? "animate-ping bg-[#22c55e]/70" : "bg-[#666]"
              }`}
            />
            <span
              className={`relative inline-flex h-1.5 w-1.5 rounded-full ${
                data.online ? "bg-[#22c55e]" : "bg-[#666]"
              }`}
            />
          </span>
          <span className={data.online ? "text-[#22c55e]" : "text-[#888]"}>
            {data.online ? "live" : "offline"}
          </span>
        </div>
        <button
          type="button"
          className="relative flex h-8 w-8 items-center justify-center rounded-lg text-[#888] transition-colors hover:bg-white/[0.03] hover:text-[#EAE8E3]"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" strokeWidth={1.6} />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#F03E17]" />
        </button>
      </div>
    </header>
  );
}

/* ═════════════════  Status bar (bottom)  ════════════════════════════════ */

function LiveClock() {
  const [t, setT] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setT(new Date());
    const seed = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(seed);
      clearInterval(id);
    };
  }, []);
  return (
    <span className="tabular-nums">
      {t ? t.toISOString().split("T")[1].split(".")[0] : "--:--:--"} UTC
    </span>
  );
}

function UpdatedAgo({ at }: { at: Date | null }) {
  const [text, setText] = useState<string>("—");
  useEffect(() => {
    if (!at) return;
    const tick = () => {
      const sec = Math.max(0, Math.round((Date.now() - at.getTime()) / 1000));
      setText(`${sec}s ago`);
    };
    const seed = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(seed);
      clearInterval(id);
    };
  }, [at]);
  return <span className="text-[#bbb]">{text}</span>;
}

function StatusBar({ data }: { data: KosmosData }) {
  const totalVol = useMemo(
    () => data.markets.reduce((a, m) => a + (m.volume_24h || 0), 0),
    [data.markets],
  );
  return (
    <footer className="flex h-7 shrink-0 items-center justify-between border-t border-white/[0.05] bg-[#070709] px-5 font-mono text-[10px] uppercase tracking-[0.18em] text-[#666]">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5 text-[#22c55e]">
          <span className="h-1 w-1 rounded-full bg-[#22c55e]" />
          live
        </span>
        <LiveClock />
        <span className="hidden md:inline">
          mkts <span className="text-[#bbb]">{data.markets.length}</span>
        </span>
        <span className="hidden md:inline">
          sig <span className="text-[#bbb]">{data.signals.length}</span>
        </span>
        <span className="hidden lg:inline">
          vol <span className="text-[#bbb]">{formatVolume(totalVol)}</span>
        </span>
      </div>

      <div className="flex items-center gap-4">
        <span className="hidden md:inline">
          api <span className="text-[#bbb]">api.kosmos.fyi</span>
        </span>
        <span className="hidden md:inline">
          updated <UpdatedAgo at={data.lastUpdated} />
        </span>
        <span>v0.1.0-alpha</span>
      </div>
    </footer>
  );
}

/* ═════════════════  Globe view  ════════════════════════════════════════ */

function GlobeView({
  data,
  onSignalSelect,
  onCountrySelect,
}: {
  data: KosmosData;
  onSignalSelect: (id: string) => void;
  onCountrySelect: (iso2: string) => void;
}) {
  const topSignals = data.signals.slice(0, 6);

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      {/* Live now strip */}
      {data.liveEvents.length > 0 && (
        <div className="border-b border-white/[0.05] bg-[#070709]/70 backdrop-blur">
          <div className="flex items-center justify-between px-5 pt-2.5">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em]">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#F03E17]/70" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#F03E17]" />
              </span>
              <span className="text-[#F03E17]">Live now</span>
              <span className="text-[#444]">· {data.liveEvents.length}</span>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto px-5 pb-2.5 pt-2">
            {data.liveEvents.slice(0, 12).map((ev) => {
              const sc = severityColor(ev.severity);
              const startedAgo = ev.live_start_at
                ? formatRelativeTime(ev.live_start_at)
                : "";
              return (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => onSignalSelect(ev.id)}
                  className="group flex shrink-0 items-center gap-2 rounded-full border border-white/[0.05] bg-white/[0.015] px-3 py-1.5 text-left transition-colors hover:border-white/[0.12] hover:bg-white/[0.04]"
                  style={{ maxWidth: 360 }}
                >
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: sc, boxShadow: `0 0 6px ${sc}` }}
                  />
                  {ev.event_type && (
                    <span
                      className="shrink-0 font-mono text-[8px] uppercase tracking-[0.18em]"
                      style={{ color: sc }}
                    >
                      {ev.event_type.replace(/_/g, " ")}
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate text-[12px] text-[#dcdcdc]">
                    {ev.title}
                  </span>
                  <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.18em] text-[#555]">
                    {ev.country ?? ""} {startedAgo}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter row — info only (counts of real data) */}
      <div className="flex items-center justify-between border-b border-white/[0.05] bg-[#070709]/70 px-5 py-2.5 backdrop-blur">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#888]">
          Live globe — markers tied to active markets &amp; signals
        </div>
        <div className="hidden items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#555] md:flex">
          <Filter className="h-3 w-3" />
          {data.signals.length} signals · {data.markets.length} markets
        </div>
      </div>

      {/* Canvas */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
            maskImage:
              "radial-gradient(ellipse 60% 60% at 50% 50%, black 30%, transparent 75%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-[660px] w-[660px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#F03E17] opacity-[0.04] blur-[140px]"
        />

        <div className="relative h-full max-h-[min(calc(100vh-220px),760px)] w-full max-w-[760px] px-6 py-4">
          <Globe3D
            compact
            signals={data.signals}
            onSignalSelect={onSignalSelect}
            onCountrySelect={onCountrySelect}
          />
        </div>
      </div>

      {/* Hotspot strip — top signals from /api/signals */}
      <div className="border-t border-white/[0.05] bg-[#070709]/70 backdrop-blur">
        <div className="flex items-center justify-between px-5 pt-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#555]">
            Top signals
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#444]">
            {topSignals.length} active
          </span>
        </div>
        <div className="flex gap-2 overflow-x-auto px-5 pb-3 pt-2">
          {(topSignals.length > 0
            ? topSignals
            : (Array.from({ length: 5 }) as Signal[])
          ).map((s, idx) => {
            const c = s ? severityColor(s.severity) : "#444";
            return (
              <button
                key={s?.id ?? idx}
                type="button"
                onClick={() => s && onSignalSelect(s.id)}
                disabled={!s}
                className="group flex shrink-0 items-start gap-3 rounded-lg border border-white/[0.05] bg-white/[0.015] px-3 py-2 text-left transition-colors hover:border-white/[0.12] hover:bg-white/[0.04] disabled:cursor-default disabled:opacity-50"
                style={{ width: 240 }}
              >
                <div className="flex shrink-0 flex-col items-center gap-0.5">
                  <span
                    className="font-mono text-[11px] font-semibold leading-none"
                    style={{ color: c }}
                  >
                    {s ? (s.severity * 10).toFixed(1) : "—"}
                  </span>
                  <span
                    className="font-mono text-[7px] uppercase tracking-[0.18em]"
                    style={{ color: c, opacity: 0.65 }}
                  >
                    {s ? severityLabel(s.severity) : ""}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-2 text-[12.5px] leading-snug text-[#dcdcdc]">
                    {s?.title ?? "Awaiting wire…"}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-[#555]">
                    <span>{s?.category ?? "—"}</span>
                    {(s?.market_link_count ?? 0) > 0 && (
                      <>
                        <span className="text-[#2a2a2a]">·</span>
                        <span className="text-[#888]">
                          {s?.market_link_count} mkt
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ═════════════════  Markets view  ════════════════════════════════════════ */

const MARKET_CATEGORIES = [
  "all",
  "macro",
  "geopolitics",
  "politics",
  "energy",
  "crypto",
  "sports",
  "culture",
  "other",
] as const;

type MarketSort = "volume" | "movement" | "alpha";

function MarketsView({
  data,
  onMarketSelect,
}: {
  data: KosmosData;
  onMarketSelect: (id: string) => void;
}) {
  const [cat, setCat] = useState<string>("all");
  const [platform, setPlatform] = useState<string>("all");
  const [sort, setSort] = useState<MarketSort>("volume");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = data.markets.filter((m) => {
      if (cat !== "all" && (m.category ?? "").toLowerCase() !== cat)
        return false;
      if (platform !== "all" && (m.platform ?? "").toLowerCase() !== platform)
        return false;
      if (q && !m.title.toLowerCase().includes(q)) return false;
      return true;
    });

    if (sort === "volume") {
      list = list.sort((a, b) => (b.volume_24h || 0) - (a.volume_24h || 0));
    } else if (sort === "movement") {
      list = list.sort(
        (a, b) =>
          Math.abs(b.movement_1h ?? 0) - Math.abs(a.movement_1h ?? 0),
      );
    } else if (sort === "alpha") {
      list = list.sort((a, b) => a.title.localeCompare(b.title));
    }

    return list.slice(0, 200);
  }, [data.markets, cat, platform, sort, query]);

  const movers = useMemo(() => {
    return [...data.markets]
      .filter((m) => typeof m.movement_1h === "number")
      .sort(
        (a, b) =>
          Math.abs(b.movement_1h ?? 0) - Math.abs(a.movement_1h ?? 0),
      )
      .slice(0, 6);
  }, [data.markets]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Movers strip */}
      {movers.length > 0 && (
        <div className="border-b border-white/[0.05] bg-[#070709]/70 px-5 py-3 backdrop-blur">
          <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.22em] text-[#555]">
            <span>Movers · 1h</span>
            <span className="text-[#444]">top {movers.length}</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {movers.map((m) => {
              const up = (m.movement_1h ?? 0) >= 0;
              const accent = categoryAccent(m.category);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onMarketSelect(m.id)}
                  className="group flex shrink-0 items-center gap-2.5 rounded-lg border border-white/[0.05] bg-white/[0.015] px-3 py-2 text-left transition-colors hover:border-white/[0.12] hover:bg-white/[0.04]"
                  style={{ width: 280 }}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/[0.05] bg-white/[0.04]">
                    {m.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.image_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span
                        className="font-mono text-[10px] uppercase"
                        style={{ color: accent }}
                      >
                        {(m.platform ?? "·").slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-1 text-[12px] leading-snug text-[#dcdcdc]">
                      {m.title}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#555]">
                      <span className="text-[#bbb]">
                        {((m.yes_price ?? 0) * 100).toFixed(0)}%
                      </span>
                      <span style={{ color: up ? "#22c55e" : "#F03E17" }}>
                        {up ? "▲" : "▼"}{" "}
                        {Math.abs((m.movement_1h ?? 0) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.05] bg-[#070709]/70 px-5 py-3 backdrop-blur">
        <div className="relative">
          <Search
            className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#555]"
            strokeWidth={1.6}
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter markets…"
            className="h-8 w-[260px] rounded-md border border-white/[0.06] bg-white/[0.025] pl-8 pr-3 text-[12.5px] text-[#dcdcdc] placeholder:text-[#555] focus:border-white/[0.16] focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {MARKET_CATEGORIES.map((c) => {
            const active = cat === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCat(c)}
                className={`h-7 rounded-full border px-3 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors ${
                  active
                    ? "border-white/[0.15] bg-white/[0.05] text-[#EAE8E3]"
                    : "border-white/[0.05] bg-transparent text-[#666] hover:text-[#bbb]"
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="h-7 rounded-md border border-white/[0.06] bg-white/[0.025] px-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#bbb] focus:outline-none"
          >
            <option value="all">all venues</option>
            <option value="kalshi">kalshi</option>
            <option value="polymarket">polymarket</option>
            <option value="manifold">manifold</option>
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as MarketSort)}
            className="h-7 rounded-md border border-white/[0.06] bg-white/[0.025] px-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#bbb] focus:outline-none"
          >
            <option value="volume">sort: volume</option>
            <option value="movement">sort: 1h move</option>
            <option value="alpha">sort: a → z</option>
          </select>
        </div>
      </div>

      {/* Header row */}
      <div className="grid grid-cols-[40px_1fr_120px_100px_90px_110px] items-center gap-3 border-b border-white/[0.05] px-5 py-2 font-mono text-[9px] uppercase tracking-[0.22em] text-[#444]">
        <span></span>
        <span>Market</span>
        <span>Category</span>
        <span className="text-right">Yes</span>
        <span className="text-right">1h</span>
        <span className="text-right">24h vol</span>
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto">
        {rows.length === 0 && data.ready && (
          <div className="flex h-full items-center justify-center font-mono text-[11px] uppercase tracking-[0.22em] text-[#555]">
            No markets match your filters
          </div>
        )}
        {rows.map((m) => {
          const up = (m.movement_1h ?? 0) >= 0;
          const accent = categoryAccent(m.category);
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onMarketSelect(m.id)}
              className="grid w-full grid-cols-[40px_1fr_120px_100px_90px_110px] items-center gap-3 border-b border-white/[0.03] px-5 py-3 text-left transition-colors hover:bg-white/[0.02]"
            >
              <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-md border border-white/[0.05] bg-white/[0.04]">
                {m.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.image_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span
                    className="font-mono text-[10px] uppercase"
                    style={{ color: accent }}
                  >
                    {(m.platform ?? "·").slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>

              <div className="min-w-0">
                <div className="truncate text-[13px] text-[#dcdcdc]">
                  {m.title}
                </div>
                <div className="mt-0.5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#555]">
                  <span>{platformLabel(m.platform)}</span>
                  {m.subtitle && (
                    <>
                      <span className="text-[#2a2a2a]">·</span>
                      <span className="truncate normal-case tracking-normal text-[#888]">
                        {m.subtitle}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <span
                className="truncate font-mono text-[10px] uppercase tracking-[0.18em]"
                style={{ color: accent }}
              >
                {m.category || "—"}
              </span>

              <div className="text-right">
                <span className="font-editorial text-[18px] leading-none text-[#EAE8E3]">
                  {(m.yes_price * 100).toFixed(0)}
                  <span className="ml-0.5 text-[10px] text-[#555]">%</span>
                </span>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/[0.04]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${m.yes_price * 100}%`,
                      backgroundColor: accent,
                    }}
                  />
                </div>
              </div>

              <span
                className="text-right font-mono text-[11px] tabular-nums"
                style={{
                  color: up ? "#22c55e" : "#F03E17",
                  opacity: m.movement_1h == null ? 0.35 : 1,
                }}
              >
                {m.movement_1h == null
                  ? "—"
                  : `${up ? "▲" : "▼"} ${Math.abs(m.movement_1h * 100).toFixed(1)}%`}
              </span>

              <span className="text-right font-mono text-[11px] text-[#bbb]">
                {formatVolume(m.volume_24h || 0)}
              </span>
            </button>
          );
        })}
        {!data.ready && (
          <div className="space-y-1 p-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-12 animate-pulse rounded-md bg-white/[0.02]"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═════════════════  Wire view (full)  ═══════════════════════════════════ */

const WIRE_FILTERS = ["all", "posts", "signals", "markets"] as const;

function WireView({
  data,
  onSignalSelect,
}: {
  data: KosmosData;
  onSignalSelect: (id: string) => void;
}) {
  const [filter, setFilter] = useState<(typeof WIRE_FILTERS)[number]>("all");

  const items = useMemo(() => {
    if (filter === "all") return data.feed;
    return data.feed.filter((p) => {
      if (filter === "posts") return p.post_type === "POST" && !p.signal;
      if (filter === "signals") return Boolean(p.signal);
      if (filter === "markets") return Boolean(p.market) && !p.signal;
      return true;
    });
  }, [data.feed, filter]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/[0.05] bg-[#070709]/70 px-5 py-2.5 backdrop-blur">
        <div className="flex items-center gap-1.5">
          {WIRE_FILTERS.map((f) => {
            const active = filter === f;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`h-7 rounded-full border px-3 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors ${
                  active
                    ? "border-white/[0.15] bg-white/[0.05] text-[#EAE8E3]"
                    : "border-white/[0.05] bg-transparent text-[#666] hover:text-[#bbb]"
                }`}
              >
                {f}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[#555]">
          <Radio className="h-3 w-3" />
          {items.length} items
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl divide-y divide-white/[0.04] px-5">
          {items.length === 0 && data.ready && (
            <div className="flex h-40 items-center justify-center font-mono text-[11px] uppercase tracking-[0.22em] text-[#555]">
              Wire is quiet. Try another filter.
            </div>
          )}
          {items.map((p) => (
            <FeedCard
              key={p.id}
              item={p}
              onSignalSelect={onSignalSelect}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═════════════════  Right rail (compact wire)  ══════════════════════════ */

function CompactWire({
  feed,
  signals,
  markets,
  onSignalSelect,
  onMarketSelect,
}: {
  feed: FeedItem[];
  signals: Signal[];
  markets: Market[];
  onSignalSelect: (id: string) => void;
  onMarketSelect: (id: string) => void;
}) {
  const [tab, setTab] = useState<"all" | "signals" | "markets">("all");

  const items = useMemo(() => {
    if (tab === "signals")
      return signals
        .slice(0, 10)
        .map((s) => ({ kind: "sig" as const, sig: s }));
    if (tab === "markets")
      return markets
        .filter((m) => Math.abs(m.movement_1h ?? 0) > 0)
        .slice(0, 12)
        .map((m) => ({ kind: "mkt" as const, mkt: m }));
    return feed
      .slice(0, 12)
      .map((p) => ({ kind: "post" as const, post: p }));
  }, [tab, feed, signals, markets]);

  return (
    <aside className="flex h-full w-[340px] shrink-0 flex-col border-l border-white/[0.05] bg-[#070709]">
      <div className="flex items-center justify-between border-b border-white/[0.05] px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <Radio className="h-3.5 w-3.5 text-[#F03E17]" />
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#bbb]">
            Live wire
          </span>
        </div>
        <div className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.18em]">
          {(["all", "signals", "markets"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={`rounded px-1.5 py-0.5 transition-colors ${
                tab === k
                  ? "bg-white/[0.06] text-[#EAE8E3]"
                  : "text-[#555] hover:text-[#bbb]"
              }`}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {items.length === 0 && (
          <div className="flex h-full items-center justify-center font-mono text-[10px] uppercase tracking-[0.22em] text-[#555]">
            Awaiting wire…
          </div>
        )}
        <ul className="divide-y divide-white/[0.04]">
          {items.map((it, idx) => {
            if (it.kind === "post") {
              return (
                <li key={`p-${it.post.id}`} className="px-4 py-3">
                  <FeedCard
                    item={it.post}
                    compact
                    onSignalSelect={onSignalSelect}
                  />
                </li>
              );
            }
            if (it.kind === "sig") {
              const c = severityColor(it.sig.severity);
              return (
                <li key={`s-${it.sig.id}`}>
                  <button
                    type="button"
                    onClick={() => onSignalSelect(it.sig.id)}
                    className="flex w-full items-start gap-2.5 px-4 py-3 text-left transition-colors hover:bg-white/[0.025]"
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span
                        className="font-mono text-[11px] font-semibold leading-none"
                        style={{ color: c }}
                      >
                        {(it.sig.severity * 10).toFixed(1)}
                      </span>
                      <span
                        className="font-mono text-[7px] uppercase tracking-[0.18em]"
                        style={{ color: c, opacity: 0.65 }}
                      >
                        {severityLabel(it.sig.severity)}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12.5px] leading-snug text-[#dcdcdc]">
                        {it.sig.title}
                      </div>
                      <div className="mt-1 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.18em] text-[#555]">
                        <span>{it.sig.category}</span>
                        {(it.sig.market_link_count ?? 0) > 0 && (
                          <>
                            <span className="text-[#2a2a2a]">·</span>
                            <span className="text-[#888]">
                              {it.sig.market_link_count} mkt
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              );
            }
            const m = it.mkt;
            const up = (m.movement_1h ?? 0) >= 0;
            return (
              <li key={`m-${m.id}-${idx}`}>
                <button
                  type="button"
                  onClick={() => onMarketSelect(m.id)}
                  className="flex w-full items-start gap-2.5 px-4 py-3 text-left transition-colors hover:bg-white/[0.025]"
                >
                  <span
                    className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${up ? "bg-[#22c55e]" : "bg-[#F03E17]"}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-2 text-[12.5px] leading-snug text-[#dcdcdc]">
                      {m.title}
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#555]">
                      <span>{platformLabel(m.platform)}</span>
                      <span className="flex items-center gap-2">
                        <span className="text-[#bbb]">
                          {(m.yes_price * 100).toFixed(0)}%
                        </span>
                        <span style={{ color: up ? "#22c55e" : "#F03E17" }}>
                          {up ? "▲" : "▼"}{" "}
                          {Math.abs((m.movement_1h ?? 0) * 100).toFixed(1)}%
                        </span>
                      </span>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}

/* ═════════════════  Feed card (shared)  ═════════════════════════════════ */

function FeedCard({
  item,
  compact,
  onSignalSelect,
}: {
  item: FeedItem;
  compact?: boolean;
  onSignalSelect?: (id: string) => void;
}) {
  const sig = item.signal ?? null;
  const mkt = item.market ?? null;
  const trade = item.trade ?? null;
  const accent = sig
    ? severityColor(sig.severity)
    : categoryAccent(mkt?.platform ?? "");
  const username = item.user?.username ?? "anonymous";
  const initials = username
    .replace(/[^a-z]/gi, "")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className={`flex gap-3 ${compact ? "" : "py-4"}`}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/[0.06] bg-white/[0.04]">
        {item.user?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.user.avatar_url}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="font-mono text-[10px] uppercase text-[#bbb]">
            {initials || "·"}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-[12.5px]">
          <span className="font-medium text-[#EAE8E3]">{username}</span>
          {item.is_verified && (
            <span className="rounded-sm bg-[#F07C00]/15 px-1 font-mono text-[8px] font-bold uppercase tracking-[0.18em] text-[#F07C00]">
              ✓
            </span>
          )}
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#555]">
            {formatRelativeTime(item.created_at)}
          </span>
          {sig && (
            <span
              className="rounded-sm border px-1.5 font-mono text-[8px] uppercase tracking-[0.18em]"
              style={{ color: accent, borderColor: `${accent}40` }}
            >
              SEV {(sig.severity * 10).toFixed(1)}
            </span>
          )}
        </div>

        {item.body && (
          <div className="mt-1 text-[13px] leading-snug text-[#cfcfcf]">
            {item.body}
          </div>
        )}

        {(mkt || trade) && (
          <div className="mt-2 rounded-md border border-white/[0.06] bg-white/[0.015] p-2.5">
            {mkt && (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="line-clamp-2 text-[12px] leading-snug text-[#dcdcdc]">
                    {mkt.title}
                  </div>
                  <div className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-[#555]">
                    {platformLabel(mkt.platform)} · vol{" "}
                    {formatVolume(mkt.volume_24h || 0)}
                  </div>
                </div>
                <span className="font-editorial text-[16px] leading-none text-[#EAE8E3]">
                  {(mkt.yes_price * 100).toFixed(0)}%
                </span>
              </div>
            )}
            {trade && (
              <div className="mt-2 flex items-center justify-between border-t border-white/[0.04] pt-2">
                <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#555]">
                  Position
                </span>
                <span
                  className="font-mono text-[10px] uppercase tracking-[0.18em]"
                  style={{
                    color: trade.side === "yes" ? "#22c55e" : "#F03E17",
                  }}
                >
                  {trade.side === "yes" ? "▲ YES" : "▼ NO"}{" "}
                  <span className="text-[#bbb]">
                    @ {(trade.price * 100).toFixed(0)}¢
                  </span>
                </span>
              </div>
            )}
          </div>
        )}

        {sig && (
          <button
            type="button"
            onClick={
              onSignalSelect ? () => onSignalSelect(sig.id) : undefined
            }
            disabled={!onSignalSelect}
            className="mt-2 flex w-full items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#555] text-left transition-colors enabled:hover:text-[#bbb] disabled:cursor-default"
          >
            <Link2 className="h-3 w-3" style={{ color: accent }} />
            <span className="truncate">{sig.title}</span>
          </button>
        )}
      </div>
    </div>
  );
}

/* ═════════════════  Command palette  ════════════════════════════════════ */

function CommandPalette({
  open,
  onClose,
  data,
  onView,
  onSignalSelect,
  onMarketSelect,
}: {
  open: boolean;
  onClose: () => void;
  data: KosmosData;
  onView: (v: ViewKey) => void;
  onSignalSelect: (id: string) => void;
  onMarketSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const seed = setTimeout(() => {
      setQuery("");
      inputRef.current?.focus();
    }, 0);
    return () => clearTimeout(seed);
  }, [open]);

  const q = query.trim().toLowerCase();
  const matchedMarkets = useMemo(
    () =>
      q
        ? data.markets
            .filter((m) => m.title.toLowerCase().includes(q))
            .slice(0, 6)
        : data.markets.slice(0, 6),
    [data.markets, q],
  );
  const matchedSignals = useMemo(
    () =>
      q
        ? data.signals
            .filter((s) => s.title.toLowerCase().includes(q))
            .slice(0, 5)
        : data.signals.slice(0, 5),
    [data.signals, q],
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[15vh]"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-xl overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a0a0d] shadow-[0_40px_120px_rgba(0,0,0,0.8)]"
          >
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
              <Search className="h-4 w-4 text-[#666]" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search markets, signals, views…"
                className="flex-1 bg-transparent text-[14px] text-[#EAE8E3] placeholder:text-[#555] focus:outline-none"
              />
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#555]">
                ESC
              </span>
            </div>

            <div className="max-h-[55vh] overflow-y-auto py-2">
              <PaletteSection title="Views">
                {NAV_ITEMS.filter(
                  (n) => !q || VIEW_LABELS[n.key].toLowerCase().includes(q),
                ).map(({ key, icon: Icon, shortcut }) => (
                  <PaletteRow
                    key={key}
                    onSelect={() => {
                      onView(key);
                      onClose();
                    }}
                    icon={<Icon className="h-3.5 w-3.5" />}
                    label={VIEW_LABELS[key]}
                    hint={`⌘${shortcut}`}
                  />
                ))}
              </PaletteSection>

              {matchedSignals.length > 0 && (
                <PaletteSection title="Signals">
                  {matchedSignals.map((s) => (
                    <PaletteRow
                      key={s.id}
                      onSelect={() => {
                        onSignalSelect(s.id);
                        onClose();
                      }}
                      icon={
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{
                            backgroundColor: severityColor(s.severity),
                          }}
                        />
                      }
                      label={s.title}
                      hint={`SEV ${(s.severity * 10).toFixed(1)}`}
                    />
                  ))}
                </PaletteSection>
              )}

              {matchedMarkets.length > 0 && (
                <PaletteSection title="Markets">
                  {matchedMarkets.map((m) => (
                    <PaletteRow
                      key={m.id}
                      onSelect={() => {
                        onMarketSelect(m.id);
                        onClose();
                      }}
                      icon={<TrendingUp className="h-3.5 w-3.5" />}
                      label={m.title}
                      hint={`${formatPercent(m.yes_price)} · ${platformLabel(m.platform)}`}
                    />
                  ))}
                </PaletteSection>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function PaletteSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="px-2 py-2">
      <div className="px-3 py-1 font-mono text-[9px] uppercase tracking-[0.22em] text-[#555]">
        {title}
      </div>
      <div>{children}</div>
    </div>
  );
}

function PaletteRow({
  icon,
  label,
  hint,
  onSelect,
}: {
  icon: ReactNode;
  label: string;
  hint?: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-white/[0.04]"
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-white/[0.06] bg-white/[0.025] text-[#bbb]">
        {icon}
      </span>
      <span className="flex-1 truncate text-[13px] text-[#dcdcdc]">{label}</span>
      {hint && (
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#555]">
          {hint}
        </span>
      )}
    </button>
  );
}

/* ═════════════════  App  ════════════════════════════════════════════════ */

export default function KosmosHome() {
  const [view, setView] = useState<ViewKey>("globe");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [activeSignalId, setActiveSignalId] = useState<string | null>(null);
  const [activeMarketId, setActiveMarketId] = useState<string | null>(null);
  const [activeCountry, setActiveCountry] = useState<string | null>(null);
  const data = useKosmosData(45_000);

  const activeSignalFallback = useMemo(() => {
    if (!activeSignalId) return null;
    return (
      data.signals.find((s) => s.id === activeSignalId) ??
      data.feed.find((p) => p.signal?.id === activeSignalId)?.signal ??
      null
    );
  }, [activeSignalId, data.signals, data.feed]);

  const activeMarketFallback = useMemo(() => {
    if (!activeMarketId) return null;
    return data.markets.find((m) => m.id === activeMarketId) ?? null;
  }, [activeMarketId, data.markets]);

  // Keyboard shortcuts
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
        return;
      }
      if (e.key === "Escape") {
        setPaletteOpen(false);
        return;
      }
      if (
        meta &&
        ["1", "2", "3", "4", "5"].includes(e.key) &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        const i = Number.parseInt(e.key, 10) - 1;
        if (NAV_ITEMS[i]) {
          e.preventDefault();
          setView(NAV_ITEMS[i].key);
        }
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const showRightRail =
    view !== "wire" && view !== "sports" && view !== "politics";
  const onSignalSelect = (id: string) => {
    setActiveMarketId(null);
    setActiveCountry(null);
    setActiveSignalId(id);
  };
  const onMarketSelect = (id: string) => {
    setActiveSignalId(null);
    setActiveCountry(null);
    setActiveMarketId(id);
  };
  const onCountrySelect = (iso2: string) => {
    setActiveSignalId(null);
    setActiveMarketId(null);
    setActiveCountry(iso2);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#0a0a0d] text-[#EAE8E3] selection:bg-[#F03E17] selection:text-white">
      <Sidebar view={view} onView={setView} />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          view={view}
          onCommand={() => setPaletteOpen(true)}
          data={data}
        />
        <div className="flex min-h-0 flex-1">
          <main className="min-w-0 flex-1 bg-[#0a0a0d]">
            {view === "globe" && (
              <GlobeView
                data={data}
                onSignalSelect={onSignalSelect}
                onCountrySelect={onCountrySelect}
              />
            )}
            {view === "markets" && (
              <MarketsView data={data} onMarketSelect={onMarketSelect} />
            )}
            {view === "wire" && (
              <WireView data={data} onSignalSelect={onSignalSelect} />
            )}
            {view === "sports" && (
              <SportsView onMarketSelect={onMarketSelect} />
            )}
            {view === "politics" && (
              <PoliticsView onMarketSelect={onMarketSelect} />
            )}
          </main>
          {showRightRail && (
            <CompactWire
              feed={data.feed}
              signals={data.signals}
              markets={data.markets}
              onSignalSelect={onSignalSelect}
              onMarketSelect={onMarketSelect}
            />
          )}
        </div>
        <LiveTicker
          markets={data.markets}
          onMarketSelect={onMarketSelect}
        />
        <StatusBar data={data} />
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        data={data}
        onView={setView}
        onSignalSelect={onSignalSelect}
        onMarketSelect={onMarketSelect}
      />

      <SignalDetailDrawer
        signalId={activeSignalId}
        fallback={activeSignalFallback}
        onClose={() => setActiveSignalId(null)}
        onMarketSelect={onMarketSelect}
        feed={data.feed}
      />

      <MarketDetailDrawer
        marketId={activeMarketId}
        fallback={activeMarketFallback}
        onClose={() => setActiveMarketId(null)}
        onSignalSelect={onSignalSelect}
        signals={data.signals}
      />

      <CountryDetailDrawer
        iso2={activeCountry}
        onClose={() => setActiveCountry(null)}
        onSignalSelect={onSignalSelect}
        onMarketSelect={onMarketSelect}
      />
    </div>
  );
}
