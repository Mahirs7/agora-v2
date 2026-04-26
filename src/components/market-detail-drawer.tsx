"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  categoryAccent,
  fetchMarketDetail,
  formatRelativeTime,
  formatVolume,
  type Market,
  type MarketDetail,
  platformLabel,
} from "@/lib/kosmos-data";

export default function MarketDetailDrawer({
  marketId,
  onClose,
  fallback,
}: {
  marketId: string | null;
  onClose: () => void;
  fallback?: Market | null;
}) {
  const [detail, setDetail] = useState<MarketDetail | null>(
    fallback ? (fallback as MarketDetail) : null,
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!marketId) return;
    let cancelled = false;
    setLoading(true);
    fetchMarketDetail(marketId).then((d) => {
      if (cancelled) return;
      if (d) setDetail(d);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [marketId]);

  useEffect(() => {
    if (marketId && fallback && fallback.id === marketId) {
      setDetail(fallback as MarketDetail);
    }
  }, [marketId, fallback]);

  useEffect(() => {
    if (!marketId) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [marketId, onClose]);

  const open = Boolean(marketId);
  const m = detail;
  const accent = m ? categoryAccent(m.category) : "#888";
  const yesPct = m?.yes_price != null ? Math.round(m.yes_price * 100) : null;
  const noPct = m?.no_price != null ? Math.round(m.no_price * 100) : null;
  const movement = m?.movement_1h ?? null;
  const movementUp = (movement ?? 0) >= 0;

  const close = useMemo(() => {
    if (!m) return null;
    if (m.resolved_at) return { label: "RESOLVED", done: true };
    if (!m.closes_at) return null;
    const diff = new Date(m.closes_at).getTime() - Date.now();
    if (Number.isNaN(diff)) return null;
    if (diff <= 0) return { label: "CLOSED", done: true };
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return { label: "CLOSES TODAY", done: false };
    if (days === 1) return { label: "1 DAY LEFT", done: false };
    if (days < 30) return { label: `${days} DAYS LEFT`, done: false };
    const months = Math.floor(days / 30);
    return {
      label: `${months} MO LEFT`,
      done: false,
    };
  }, [m]);

  const chartPoints = useMemo(() => {
    if (!m?.priceHistory || m.priceHistory.length < 2) return null;
    const pts = m.priceHistory
      .map((p) => p.yes_price)
      .filter((v): v is number => typeof v === "number" && !Number.isNaN(v));
    if (pts.length < 2) return null;
    // Decimate to ~80 points for clean rendering
    const target = 80;
    const step = Math.max(1, Math.floor(pts.length / target));
    return pts.filter((_, i) => i % step === 0);
  }, [m?.priceHistory]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm"
          onClick={onClose}
        />
      )}
      {open && (
        <motion.aside
          key="drawer"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "tween", ease: [0.22, 1, 0.36, 1], duration: 0.32 }}
          className="fixed right-0 top-0 z-50 flex h-screen w-full max-w-[560px] flex-col border-l border-white/[0.06] bg-[#0a0a0d] shadow-[-40px_0_120px_rgba(0,0,0,0.6)]"
          role="dialog"
          aria-modal="true"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/[0.06] bg-white/[0.04]"
                style={{ borderColor: `${accent}30` }}
              >
                {m?.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.image_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span
                    className="font-mono text-[12px] uppercase"
                    style={{ color: accent }}
                  >
                    {(m?.platform ?? "·").slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className="font-mono text-[9px] uppercase tracking-[0.22em]"
                    style={{ color: accent }}
                  >
                    {m?.category || "Market"}
                  </span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#555]">
                    · {platformLabel(m?.platform)}
                  </span>
                  {close && (
                    <span
                      className="font-mono text-[9px] uppercase tracking-[0.22em]"
                      style={{ color: close.done ? "#666" : "#bbb" }}
                    >
                      · {close.label}
                    </span>
                  )}
                </div>
                <h2 className="mt-1.5 font-editorial text-[19px] leading-[1.25] text-[#EAE8E3]">
                  {m?.title ?? (loading ? "Loading market…" : "Market")}
                </h2>
                {m?.subtitle && (
                  <p className="mt-1 text-[12.5px] text-[#888]">
                    {m.subtitle}
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#888] transition-colors hover:bg-white/[0.05] hover:text-[#EAE8E3]"
              aria-label="Close"
            >
              <X className="h-4 w-4" strokeWidth={1.6} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            {!m && loading && (
              <div className="space-y-2 p-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-12 animate-pulse rounded-md bg-white/[0.02]"
                  />
                ))}
              </div>
            )}

            {!m && !loading && (
              <div className="flex h-40 items-center justify-center font-mono text-[10px] uppercase tracking-[0.22em] text-[#555]">
                Market not available.
              </div>
            )}

            {m && (
              <div className="space-y-6 p-5">
                {/* Big YES / NO */}
                <div className="grid grid-cols-2 gap-2">
                  <PriceBlock
                    side="YES"
                    pct={yesPct}
                    bid={m.best_bid}
                    color="#22c55e"
                  />
                  <PriceBlock
                    side="NO"
                    pct={noPct}
                    bid={m.best_ask}
                    color="#F03E17"
                  />
                </div>

                {/* Price chart */}
                {chartPoints && (
                  <Section title="24h price">
                    <PriceChart points={chartPoints} color={accent} />
                  </Section>
                )}

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Stat
                    label="1h move"
                    value={
                      movement == null
                        ? "—"
                        : `${movementUp ? "▲" : "▼"} ${Math.abs(movement * 100).toFixed(1)}%`
                    }
                    color={
                      movement == null
                        ? "#888"
                        : movementUp
                          ? "#22c55e"
                          : "#F03E17"
                    }
                  />
                  <Stat
                    label="24h high"
                    value={
                      m.high_24h != null
                        ? `${Math.round(m.high_24h * 100)}%`
                        : "—"
                    }
                  />
                  <Stat
                    label="24h low"
                    value={
                      m.low_24h != null
                        ? `${Math.round(m.low_24h * 100)}%`
                        : "—"
                    }
                  />
                  <Stat
                    label="Spread"
                    value={
                      m.spread != null
                        ? `${(m.spread * 100).toFixed(1)}%`
                        : "—"
                    }
                  />
                  <Stat
                    label="24h vol"
                    value={formatVolume(m.volume_24h ?? 0)}
                  />
                  <Stat
                    label="Total vol"
                    value={
                      m.volume_total != null
                        ? formatVolume(m.volume_total)
                        : "—"
                    }
                  />
                  <Stat
                    label="Open int."
                    value={
                      m.open_interest != null
                        ? formatVolume(m.open_interest)
                        : "—"
                    }
                  />
                  <Stat
                    label="Traders"
                    value={
                      m.unique_traders != null
                        ? m.unique_traders.toLocaleString()
                        : "—"
                    }
                  />
                </div>

                {/* Description */}
                {m.description && (
                  <Section title="Resolution criteria">
                    <p className="whitespace-pre-line text-[13px] leading-[1.6] text-[#cfcfcf]">
                      {m.description}
                    </p>
                  </Section>
                )}

                {/* Siblings */}
                {m.siblings && m.siblings.length > 0 && (
                  <Section title={`Related markets · ${m.siblings.length}`}>
                    <div className="divide-y divide-white/[0.04] overflow-hidden rounded-md border border-white/[0.06]">
                      {m.siblings.slice(0, 8).map((s) => {
                        const pct =
                          s.yes_price != null
                            ? Math.round(s.yes_price * 100)
                            : null;
                        return (
                          <div
                            key={s.id}
                            className="flex items-center justify-between gap-3 px-3 py-2.5"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="line-clamp-2 text-[12.5px] leading-snug text-[#dcdcdc]">
                                {s.title}
                              </div>
                              <div className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-[#555]">
                                {platformLabel(s.platform)}
                              </div>
                            </div>
                            <span className="shrink-0 font-editorial text-[16px] leading-none text-[#EAE8E3]">
                              {pct ?? "—"}
                              <span className="ml-0.5 text-[10px] text-[#555]">
                                %
                              </span>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </Section>
                )}

                {/* Footer meta */}
                <div className="flex flex-wrap items-center gap-3 border-t border-white/[0.04] pt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-[#555]">
                  {m.last_synced_at && (
                    <span>synced {formatRelativeTime(m.last_synced_at)}</span>
                  )}
                  {m.closes_at && !close?.done && (
                    <span>
                      closes{" "}
                      {new Date(m.closes_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  )}
                  {m.outcome && (
                    <span className="text-[#bbb]">outcome: {m.outcome}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function PriceBlock({
  side,
  pct,
  bid,
  color,
}: {
  side: string;
  pct: number | null;
  bid?: number | null;
  color: string;
}) {
  return (
    <div
      className="rounded-md border bg-white/[0.015] px-4 py-3"
      style={{ borderColor: `${color}30` }}
    >
      <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.22em] text-[#555]">
        <span style={{ color }}>{side}</span>
        {bid != null && (
          <span>bid {(bid * 100).toFixed(1)}¢</span>
        )}
      </div>
      <div className="mt-1 font-editorial text-[28px] leading-none text-[#EAE8E3]">
        {pct ?? "—"}
        <span className="ml-1 text-[12px] text-[#555]">%</span>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: React.ReactNode;
  color?: string;
}) {
  return (
    <div className="rounded-md border border-white/[0.06] bg-white/[0.015] px-3 py-2">
      <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#555]">
        {label}
      </div>
      <div
        className="mt-0.5 font-editorial text-[16px] leading-none"
        style={{ color: color ?? "#EAE8E3" }}
      >
        {value}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.22em] text-[#555]">
        <ExternalLink className="h-3 w-3" />
        {title}
      </div>
      {children}
    </section>
  );
}

function PriceChart({ points, color }: { points: number[]; color: string }) {
  const width = 480;
  const height = 96;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = Math.max(0.001, max - min);
  const step = width / Math.max(1, points.length - 1);
  const coords = points
    .map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / range) * (height - 8) - 4;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const last = points[points.length - 1];
  const first = points[0];
  const delta = last - first;
  const positive = delta >= 0;

  return (
    <div className="rounded-md border border-white/[0.06] bg-white/[0.015] p-3">
      <div className="mb-1 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-[#555]">
        <span>YES price</span>
        <span style={{ color: positive ? "#22c55e" : "#F03E17" }}>
          {positive ? "▲" : "▼"} {Math.abs(delta * 100).toFixed(1)}%
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="h-24 w-full"
      >
        <polyline
          fill="none"
          points={coords}
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="mt-1 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.18em] text-[#555]">
        <span>min {(min * 100).toFixed(1)}%</span>
        <span>max {(max * 100).toFixed(1)}%</span>
      </div>
    </div>
  );
}
