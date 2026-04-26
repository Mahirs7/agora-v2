"use client";

import { useEffect, useMemo, useState } from "react";

import {
  type Market,
  useMarketLivePrices,
} from "@/lib/kosmos-data";

/**
 * Bottom-of-app ticker tape. Subscribes to top movers via WebSocket and renders
 * a continuously scrolling marquee. Prices flash for ~600ms when a tick lands.
 */
export default function LiveTicker({
  markets,
  onMarketSelect,
  count = 10,
}: {
  markets: Market[];
  onMarketSelect: (id: string) => void;
  count?: number;
}) {
  /* Pick top markets by |movement_1h| then volume */
  const tickerMarkets = useMemo(() => {
    const ranked = [...markets]
      .filter((m) => typeof m.yes_price === "number")
      .sort((a, b) => {
        const am = Math.abs(a.movement_1h ?? 0);
        const bm = Math.abs(b.movement_1h ?? 0);
        if (am !== bm) return bm - am;
        return (b.volume_24h ?? 0) - (a.volume_24h ?? 0);
      });
    return ranked.slice(0, count);
  }, [markets, count]);

  const ids = useMemo(
    () => tickerMarkets.map((m) => m.id),
    [tickerMarkets],
  );
  const live = useMarketLivePrices(ids);

  if (tickerMarkets.length === 0) return null;

  // Duplicate the list once so the CSS marquee loop is seamless.
  const doubled = [...tickerMarkets, ...tickerMarkets];

  return (
    <div className="relative h-9 shrink-0 overflow-hidden border-t border-white/[0.05] bg-[#070709]">
      {/* gradient fades on edges */}
      <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-12 bg-gradient-to-r from-[#070709] to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-12 bg-gradient-to-l from-[#070709] to-transparent" />

      <div className="ticker-track flex h-full items-center whitespace-nowrap">
        {doubled.map((m, i) => (
          <TickerCell
            key={`${m.id}-${i}`}
            market={m}
            live={live[m.id]}
            onMarketSelect={onMarketSelect}
          />
        ))}
      </div>

      <style jsx>{`
        .ticker-track {
          animation: tickerScroll 90s linear infinite;
          will-change: transform;
        }
        .ticker-track:hover {
          animation-play-state: paused;
        }
        @keyframes tickerScroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ticker-track { animation: none; }
        }
      `}</style>
    </div>
  );
}

function TickerCell({
  market,
  live,
  onMarketSelect,
}: {
  market: Market;
  live?: {
    connected: boolean;
    price: { yes_price: number | null; ts: number } | null;
    pulseAt: number;
  };
  onMarketSelect: (id: string) => void;
}) {
  const livePrice = live?.price?.yes_price ?? null;
  const yes = livePrice ?? market.yes_price ?? 0;
  const yesPct = Math.round(yes * 100);

  const movement = market.movement_1h ?? 0;
  const up = movement >= 0;
  const hasMov = Math.abs(movement) >= 0.001;

  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    if (!live?.pulseAt) return;
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 600);
    return () => clearTimeout(t);
  }, [live?.pulseAt]);

  const label = (market.platform ?? "").slice(0, 2).toUpperCase();

  return (
    <button
      type="button"
      onClick={() => onMarketSelect(market.id)}
      className="group flex h-full shrink-0 items-center gap-2 border-r border-white/[0.04] px-4 transition-colors hover:bg-white/[0.03]"
    >
      <span
        className="grid h-5 w-5 shrink-0 place-items-center overflow-hidden rounded-sm border border-white/[0.06] bg-white/[0.04]"
      >
        {market.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={market.image_url}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="font-mono text-[8px] uppercase text-[#888]">
            {label}
          </span>
        )}
      </span>
      <span className="max-w-[220px] truncate text-[11.5px] text-[#cfcfcf]">
        {market.title}
      </span>
      <span
        className="font-mono text-[12px] tabular-nums transition-colors duration-300"
        style={{
          color: pulse ? "#EAE8E3" : "#bbb",
          textShadow: pulse ? "0 0 6px rgba(234,232,227,0.6)" : "none",
        }}
      >
        {yesPct}¢
      </span>
      {hasMov && (
        <span
          className="font-mono text-[10.5px] tabular-nums"
          style={{ color: up ? "#22c55e" : "#F03E17" }}
        >
          {up ? "▲" : "▼"} {Math.abs(movement * 100).toFixed(1)}%
        </span>
      )}
      {live?.connected && (
        <span
          className="h-1 w-1 shrink-0 rounded-full bg-[#22c55e]"
          style={{
            opacity: pulse ? 1 : 0.6,
            boxShadow: pulse
              ? "0 0 6px rgba(34,197,94,0.8)"
              : "0 0 0 rgba(0,0,0,0)",
            transition: "opacity 300ms, box-shadow 300ms",
          }}
        />
      )}
    </button>
  );
}
