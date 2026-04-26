"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, MessageCircle, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  categoryAccent,
  fetchMarketDetail,
  fetchPmComments,
  formatRelativeTime,
  formatVolume,
  type Market,
  type MarketDetail,
  platformLabel,
  type PmComment,
  severityColor,
  severityLabel,
  type Signal,
  useMarketLivePrice,
} from "@/lib/kosmos-data";

export default function MarketDetailDrawer({
  marketId,
  onClose,
  fallback,
  onSignalSelect,
  signals = [],
}: {
  marketId: string | null;
  onClose: () => void;
  fallback?: Market | null;
  onSignalSelect?: (id: string) => void;
  signals?: Signal[];
}) {
  const [detail, setDetail] = useState<MarketDetail | null>(
    fallback ? (fallback as MarketDetail) : null,
  );
  const [loading, setLoading] = useState(false);
  const [pmComments, setPmComments] = useState<PmComment[]>([]);
  const [tradeSide, setTradeSide] = useState<"yes" | "no" | null>(null);
  const [ticketStake, setTicketStake] = useState("100");
  const [ticketPrice, setTicketPrice] = useState("--");

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

  /* Fetch Polymarket comments only for polymarket markets */
  useEffect(() => {
    if (!marketId) return;
    const platform = (detail?.platform ?? fallback?.platform ?? "").toLowerCase();
    if (platform !== "polymarket") {
      setPmComments([]);
      return;
    }
    let cancelled = false;
    fetchPmComments(marketId, 20).then((cs) => {
      if (cancelled) return;
      setPmComments(cs);
    });
    return () => {
      cancelled = true;
    };
  }, [marketId, detail?.platform, fallback?.platform]);

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

  // Live WebSocket price overrides static price when present.
  const live = useMarketLivePrice(open ? marketId : null);
  const liveYes = live.price?.yes_price ?? null;
  const liveNo = live.price?.no_price ?? null;
  const yesPrice = liveYes ?? m?.yes_price ?? null;
  const noPrice = liveNo ?? m?.no_price ?? null;
  const yesPct =
    yesPrice != null ? Math.round(yesPrice * 100) : null;
  const noPct = noPrice != null ? Math.round(noPrice * 100) : null;

  // Pulse flag for "just updated" indicator
  const [pulseOn, setPulseOn] = useState(false);
  useEffect(() => {
    if (!live.pulseAt) return;
    setPulseOn(true);
    const t = setTimeout(() => setPulseOn(false), 600);
    return () => clearTimeout(t);
  }, [live.pulseAt]);

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

  const relatedSignals = useMemo(() => {
    if (!marketId) return [];
    return signals
      .filter((s) =>
        (s.markets ?? []).some((sm) => sm.market_id === marketId),
      )
      .sort((a, b) => (b.severity ?? 0) - (a.severity ?? 0))
      .slice(0, 5);
  }, [marketId, signals]);

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

  useEffect(() => {
    if (tradeSide === "yes") {
      setTicketPrice(
        yesPrice != null ? `${(yesPrice * 100).toFixed(1)}¢` : "--",
      );
    }
    if (tradeSide === "no") {
      setTicketPrice(noPrice != null ? `${(noPrice * 100).toFixed(1)}¢` : "--");
    }
  }, [tradeSide, yesPrice, noPrice]);

  const ticketOpen = Boolean(tradeSide);
  const stakeValue = Number(ticketStake);
  const validStake = Number.isFinite(stakeValue) && stakeValue > 0 ? stakeValue : 0;
  const selectedPrice =
    tradeSide === "yes" ? (yesPrice ?? null) : tradeSide === "no" ? (noPrice ?? null) : null;
  const estPayout =
    selectedPrice != null && selectedPrice > 0
      ? validStake / selectedPrice
      : null;

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
                {/* Live status row */}
                <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.22em] text-[#555]">
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex h-1.5 w-1.5">
                      {live.connected && (
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22c55e]/60" />
                      )}
                      <span
                        className={`relative inline-flex h-1.5 w-1.5 rounded-full ${
                          live.connected ? "bg-[#22c55e]" : "bg-[#666]"
                        }`}
                      />
                    </span>
                    <span
                      className={
                        live.connected ? "text-[#22c55e]" : "text-[#666]"
                      }
                    >
                      {live.connected ? "live · ws" : "rest"}
                    </span>
                  </div>
                  {pulseOn && (
                    <span className="text-[#dcdcdc]">↻ tick</span>
                  )}
                </div>

                {/* Big YES / NO */}
                <div className="grid grid-cols-2 gap-2">
                  <PriceBlock
                    side="YES"
                    pct={yesPct}
                    bid={m.best_bid}
                    color="#22c55e"
                    pulse={pulseOn && liveYes != null}
                    onClick={() => setTradeSide("yes")}
                  />
                  <PriceBlock
                    side="NO"
                    pct={noPct}
                    bid={m.best_ask}
                    color="#F03E17"
                    pulse={pulseOn && liveNo != null}
                    onClick={() => setTradeSide("no")}
                  />
                </div>

                {/* Last trade */}
                {live.lastTrade && live.lastTrade.price != null && (
                  <div className="flex items-center justify-between rounded-md border border-white/[0.06] bg-white/[0.015] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em]">
                    <span className="text-[#555]">last trade</span>
                    <div className="flex items-center gap-3">
                      <span
                        style={{
                          color:
                            live.lastTrade.side === "yes"
                              ? "#22c55e"
                              : "#F03E17",
                        }}
                      >
                        {live.lastTrade.side === "yes" ? "▲ YES" : "▼ NO"} @{" "}
                        {(live.lastTrade.price * 100).toFixed(1)}¢
                      </span>
                      {typeof live.lastTrade.size === "number" &&
                        live.lastTrade.size > 0 && (
                          <span className="text-[#bbb]">
                            size {live.lastTrade.size}
                          </span>
                        )}
                    </div>
                  </div>
                )}

                {/* Price chart */}
                {chartPoints && (
                  <Section title="24h price">
                    <PriceChart points={chartPoints} color={accent} />
                  </Section>
                )}

                {/* Why it's moving — related signals */}
                {relatedSignals.length > 0 && (
                  <Section title={`Why it's moving · ${relatedSignals.length}`}>
                    <div className="divide-y divide-white/[0.04] overflow-hidden rounded-md border border-white/[0.06]">
                      {relatedSignals.map((s) => {
                        const sc = severityColor(s.severity);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={
                              onSignalSelect
                                ? () => onSignalSelect(s.id)
                                : undefined
                            }
                            disabled={!onSignalSelect}
                            className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors enabled:hover:bg-white/[0.025] disabled:cursor-default"
                          >
                            <div className="flex shrink-0 flex-col items-center gap-0.5">
                              <span
                                className="font-mono text-[11px] font-semibold leading-none"
                                style={{ color: sc }}
                              >
                                {(s.severity * 10).toFixed(1)}
                              </span>
                              <span
                                className="font-mono text-[7px] uppercase tracking-[0.18em]"
                                style={{ color: sc, opacity: 0.65 }}
                              >
                                {severityLabel(s.severity)}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="line-clamp-2 text-[12.5px] leading-snug text-[#dcdcdc]">
                                {s.title}
                              </div>
                              <div className="mt-0.5 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.18em] text-[#555]">
                                <span>{s.category}</span>
                                {(s.evidence_count ?? 0) > 0 && (
                                  <>
                                    <span className="text-[#2a2a2a]">·</span>
                                    <span>{s.evidence_count} evidence</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
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

                {/* Polymarket comments */}
                {pmComments.length > 0 && (
                  <section>
                    <div className="mb-2 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.22em] text-[#555]">
                      <MessageCircle className="h-3 w-3" />
                      {`Polymarket comments · ${pmComments.length}`}
                    </div>
                    <ul className="divide-y divide-white/[0.04] overflow-hidden rounded-md border border-white/[0.06]">
                      {pmComments.slice(0, 8).map((c) => {
                        const u = c.author?.username ?? "anon";
                        const initials = u
                          .replace(/[^a-z]/gi, "")
                          .slice(0, 2)
                          .toUpperCase();
                        return (
                          <li key={c.id} className="flex gap-3 px-3 py-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/[0.06] bg-white/[0.04]">
                              {c.author?.avatar_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={c.author.avatar_url}
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
                              <div className="flex items-center gap-2 text-[12px]">
                                <span className="font-medium text-[#EAE8E3]">
                                  {u}
                                </span>
                                <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#555]">
                                  {formatRelativeTime(c.created_at)}
                                </span>
                                {(c.reaction_count ?? 0) > 0 && (
                                  <span className="font-mono text-[9px] tracking-[0.14em] text-[#888]">
                                    ♡ {c.reaction_count}
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 line-clamp-4 whitespace-pre-line break-words text-[12.5px] leading-snug text-[#cfcfcf]">
                                {c.body}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
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

          <AnimatePresence>
            {ticketOpen && m && tradeSide && (
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
                transition={{ duration: 0.16 }}
                className="absolute inset-x-4 bottom-4 z-20 rounded-xl border border-white/[0.1] bg-[#0f1016] p-4 shadow-[0_24px_64px_rgba(0,0,0,0.7)]"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#666]">
                      Trade ticket
                    </p>
                    <p className="mt-0.5 line-clamp-1 text-[13px] text-[#EAE8E3]">
                      {m.title}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTradeSide(null)}
                    className="rounded border border-white/[0.1] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-[#888] transition-colors hover:bg-white/[0.05] hover:text-[#EAE8E3]"
                  >
                    Close
                  </button>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-md border border-white/[0.08] bg-[#0a0a0d] px-3 py-2">
                    <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#666]">
                      Side
                    </div>
                    <div
                      className="mt-1 font-mono text-[12px] uppercase tracking-[0.2em]"
                      style={{ color: tradeSide === "yes" ? "#22c55e" : "#F03E17" }}
                    >
                      {tradeSide}
                    </div>
                  </div>

                  <div className="rounded-md border border-white/[0.08] bg-[#0a0a0d] px-3 py-2">
                    <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#666]">
                      Price
                    </div>
                    <div className="mt-1 font-editorial text-[20px] leading-none text-[#EAE8E3]">
                      {ticketPrice}
                    </div>
                  </div>

                  <div className="rounded-md border border-white/[0.08] bg-[#0a0a0d] px-3 py-2 sm:col-span-2">
                    <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#666]">
                      Stake (USD)
                    </div>
                    <input
                      type="number"
                      min="1"
                      value={ticketStake}
                      onChange={(e) => setTicketStake(e.target.value)}
                      className="mt-1 h-8 w-full rounded border border-white/[0.08] bg-white/[0.02] px-2 font-mono text-[12px] text-[#EAE8E3] focus:border-white/[0.16] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <Stat label="Order" value="Market" />
                  <Stat
                    label="Est. payout"
                    value={
                      estPayout == null
                        ? "--"
                        : `$${estPayout.toLocaleString(undefined, {
                            maximumFractionDigits: estPayout >= 1000 ? 0 : 2,
                          })}`
                    }
                  />
                  <Stat
                    label="Max loss"
                    value={`$${validStake.toLocaleString(undefined, {
                      maximumFractionDigits: validStake >= 1000 ? 0 : 2,
                    })}`}
                    color="#F4B299"
                  />
                </div>

                <button
                  type="button"
                  className="mt-3 w-full rounded-md border border-white/[0.12] bg-white/[0.04] py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[#bbb]"
                >
                  Trade
                </button>
              </motion.div>
            )}
          </AnimatePresence>
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
  pulse,
  onClick,
}: {
  side: string;
  pct: number | null;
  bid?: number | null;
  color: string;
  pulse?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative w-full overflow-hidden rounded-md border bg-white/[0.015] px-4 py-3 text-left transition-colors hover:bg-white/[0.03]"
      style={{
        borderColor: pulse ? color : `${color}30`,
        backgroundColor: pulse ? `${color}10` : undefined,
        transitionDuration: "300ms",
      }}
    >
      <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.22em] text-[#555]">
        <span style={{ color }}>{side}</span>
        {bid != null && <span>bid {(bid * 100).toFixed(1)}¢</span>}
      </div>
      <div className="mt-1 font-editorial text-[28px] leading-none text-[#EAE8E3]">
        {pct ?? "—"}
        <span className="ml-1 text-[12px] text-[#555]">%</span>
      </div>
    </button>
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
  const plotted = points.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / range) * (height - 8) - 4;
    return { x, y };
  });
  const coords = plotted
    .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
  const areaPath = `M ${plotted[0]?.x.toFixed(1) ?? "0"},${height - 2} L ${coords} L ${plotted[plotted.length - 1]?.x.toFixed(1) ?? width},${height - 2} Z`;
  const last = points[points.length - 1];
  const first = points[0];
  const delta = last - first;
  const positive = delta >= 0;
  const trendColor = positive ? "#22c55e" : "#F03E17";
  const lastPoint = plotted[plotted.length - 1];

  return (
    <div className="rounded-md border border-white/[0.06] bg-[linear-gradient(180deg,rgba(255,255,255,0.035)_0%,rgba(255,255,255,0.012)_45%,rgba(255,255,255,0.005)_100%)] p-3">
      <div className="mb-1 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-[#555]">
        <span>YES price</span>
        <span style={{ color: trendColor }}>
          {positive ? "▲" : "▼"} {Math.abs(delta * 100).toFixed(1)}%
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="h-24 w-full"
      >
        <defs>
          <linearGradient id="chartLineGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={color} stopOpacity="0.55" />
            <stop offset="55%" stopColor={color} stopOpacity="1" />
            <stop offset="100%" stopColor={trendColor} stopOpacity="1" />
          </linearGradient>
          <linearGradient id="chartAreaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={trendColor} stopOpacity="0.22" />
            <stop offset="100%" stopColor={trendColor} stopOpacity="0" />
          </linearGradient>
          <filter id="chartGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {[0.2, 0.4, 0.6, 0.8].map((ratio) => {
          const y = (height - 2) * ratio;
          return (
            <line
              key={ratio}
              x1="0"
              y1={y}
              x2={width}
              y2={y}
              stroke="rgba(255,255,255,0.08)"
              strokeDasharray="2 6"
              strokeWidth="0.8"
            />
          );
        })}

        <path d={areaPath} fill="url(#chartAreaGradient)" />
        <polyline
          fill="none"
          points={coords}
          stroke="url(#chartLineGradient)"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#chartGlow)"
        />
        {lastPoint && (
          <circle
            cx={lastPoint.x}
            cy={lastPoint.y}
            r="2.8"
            fill={trendColor}
            stroke="rgba(10,10,13,0.9)"
            strokeWidth="1"
          />
        )}
      </svg>
      <div className="mt-1 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.18em] text-[#555]">
        <span>min {(min * 100).toFixed(1)}%</span>
        <span>max {(max * 100).toFixed(1)}%</span>
      </div>
    </div>
  );
}
