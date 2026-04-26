"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Globe2, X } from "lucide-react";
import { useEffect, useState } from "react";

import {
  fetchRegionDetail,
  formatRelativeTime,
  formatVolume,
  platformLabel,
  type RegionDetail,
  severityColor,
  severityLabel,
} from "@/lib/kosmos-data";

export default function CountryDetailDrawer({
  iso2,
  onClose,
  onSignalSelect,
  onMarketSelect,
}: {
  iso2: string | null;
  onClose: () => void;
  onSignalSelect: (id: string) => void;
  onMarketSelect: (id: string) => void;
}) {
  const [detail, setDetail] = useState<RegionDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!iso2) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setDetail(null);
    fetchRegionDetail(iso2).then((d) => {
      if (cancelled) return;
      setDetail(d);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [iso2]);

  useEffect(() => {
    if (!iso2) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [iso2, onClose]);

  const open = Boolean(iso2);
  const a = detail?.activity;
  const heat = a?.heat_score ?? 0;
  const accent = severityColor(heat);

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
          <div className="flex items-start justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <div
                className="grid h-12 w-12 shrink-0 place-items-center rounded-md border bg-white/[0.04]"
                style={{ borderColor: `${accent}40` }}
              >
                <Globe2
                  className="h-5 w-5"
                  style={{ color: accent }}
                  strokeWidth={1.6}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className="font-mono text-[9px] uppercase tracking-[0.22em]"
                    style={{ color: accent }}
                  >
                    Region · {severityLabel(heat)}
                  </span>
                  {iso2 && (
                    <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#555]">
                      · {iso2}
                    </span>
                  )}
                  {a?.region_group && (
                    <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#555]">
                      · {a.region_group.replace(/_/g, " ")}
                    </span>
                  )}
                </div>
                <h2 className="mt-1.5 font-editorial text-[20px] leading-[1.25] text-[#EAE8E3]">
                  {a?.name ?? iso2 ?? (loading ? "Loading…" : "Region")}
                </h2>
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

          <div className="flex-1 overflow-y-auto">
            {!detail && loading && (
              <div className="space-y-2 p-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-12 animate-pulse rounded-md bg-white/[0.02]"
                  />
                ))}
              </div>
            )}

            {!detail && !loading && (
              <div className="flex h-40 items-center justify-center font-mono text-[10px] uppercase tracking-[0.22em] text-[#555]">
                Region not available.
              </div>
            )}

            {detail && a && (
              <div className="space-y-6 p-5">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Stat
                    label="Heat"
                    value={`${(heat * 100).toFixed(0)}%`}
                    color={accent}
                  />
                  <Stat
                    label="Active sig"
                    value={a.active_signals ?? 0}
                  />
                  <Stat
                    label="Active mkt"
                    value={a.active_markets ?? 0}
                  />
                  <Stat
                    label="24h vol"
                    value={
                      a.total_volume_24h != null
                        ? formatVolume(a.total_volume_24h)
                        : "—"
                    }
                  />
                </div>

                {/* Signals */}
                {detail.signals.length > 0 && (
                  <Section title={`Signals · ${detail.signals.length}`}>
                    <ul className="divide-y divide-white/[0.04] overflow-hidden rounded-md border border-white/[0.06]">
                      {detail.signals.slice(0, 12).map((s) => {
                        const c = severityColor(s.severity);
                        return (
                          <li key={s.id}>
                            <button
                              type="button"
                              onClick={() => onSignalSelect(s.id)}
                              className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.025]"
                            >
                              <div className="flex shrink-0 flex-col items-center gap-0.5">
                                <span
                                  className="font-mono text-[11px] font-semibold leading-none"
                                  style={{ color: c }}
                                >
                                  {(s.severity * 10).toFixed(1)}
                                </span>
                                <span
                                  className="font-mono text-[7px] uppercase tracking-[0.18em]"
                                  style={{ color: c, opacity: 0.65 }}
                                >
                                  {severityLabel(s.severity)}
                                </span>
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="line-clamp-2 text-[12.5px] leading-snug text-[#dcdcdc]">
                                  {s.title}
                                </div>
                                <div className="mt-0.5 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.18em] text-[#555]">
                                  {s.primary_category && (
                                    <span>{s.primary_category}</span>
                                  )}
                                  {s.last_evidence_at && (
                                    <>
                                      <span className="text-[#2a2a2a]">·</span>
                                      <span>
                                        {formatRelativeTime(s.last_evidence_at)}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </Section>
                )}

                {/* Markets */}
                {detail.markets.length > 0 && (
                  <Section title={`Markets · ${detail.markets.length}`}>
                    <ul className="divide-y divide-white/[0.04] overflow-hidden rounded-md border border-white/[0.06]">
                      {detail.markets.slice(0, 12).map((m) => {
                        const pct =
                          m.yes_price != null
                            ? Math.round(m.yes_price * 100)
                            : null;
                        return (
                          <li key={m.id}>
                            <button
                              type="button"
                              onClick={() => onMarketSelect(m.id)}
                              className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.025]"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="line-clamp-2 text-[12.5px] leading-snug text-[#dcdcdc]">
                                  {m.title}
                                </div>
                                <div className="mt-0.5 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.18em] text-[#555]">
                                  <span>{platformLabel(m.platform)}</span>
                                  {typeof m.volume_24h === "number" &&
                                    m.volume_24h > 0 && (
                                      <>
                                        <span className="text-[#2a2a2a]">
                                          ·
                                        </span>
                                        <span>
                                          vol {formatVolume(m.volume_24h)}
                                        </span>
                                      </>
                                    )}
                                </div>
                              </div>
                              <span className="shrink-0 font-editorial text-[18px] leading-none text-[#EAE8E3]">
                                {pct ?? "—"}
                                <span className="ml-0.5 text-[10px] text-[#555]">
                                  %
                                </span>
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </Section>
                )}

                {detail.signals.length === 0 &&
                  detail.markets.length === 0 && (
                    <div className="flex h-32 items-center justify-center font-mono text-[10px] uppercase tracking-[0.22em] text-[#555]">
                      No signals or markets in this region.
                    </div>
                  )}
              </div>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
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
      <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.22em] text-[#555]">
        {title}
      </div>
      {children}
    </section>
  );
}
