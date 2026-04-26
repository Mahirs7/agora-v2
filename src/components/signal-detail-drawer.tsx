"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, Link2, X } from "lucide-react";
import { useEffect, useState } from "react";

import {
  categoryAccent,
  fetchSignalDetail,
  formatRelativeTime,
  formatVolume,
  platformLabel,
  severityColor,
  severityLabel,
  type Signal,
  type SignalEvidence,
} from "@/lib/kosmos-data";

export default function SignalDetailDrawer({
  signalId,
  onClose,
  fallback,
}: {
  signalId: string | null;
  onClose: () => void;
  fallback?: Signal | null;
}) {
  const [detail, setDetail] = useState<Signal | null>(fallback ?? null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!signalId) return;
    let cancelled = false;
    setLoading(true);
    fetchSignalDetail(signalId).then((d) => {
      if (cancelled) return;
      if (d) setDetail(d);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [signalId]);

  // Keep fallback visible while loading the first time
  useEffect(() => {
    if (signalId && fallback && fallback.id === signalId) setDetail(fallback);
  }, [signalId, fallback]);

  // ESC closes
  useEffect(() => {
    if (!signalId) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [signalId, onClose]);

  const open = Boolean(signalId);
  const sig = detail;
  const accent = sig ? severityColor(sig.severity) : "#888";

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
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className="font-mono text-[9px] uppercase tracking-[0.22em]"
                  style={{ color: accent }}
                >
                  Signal · {sig ? severityLabel(sig.severity) : "loading"}
                </span>
                {sig && (
                  <span
                    className="rounded-sm border px-1.5 font-mono text-[8px] uppercase tracking-[0.18em]"
                    style={{ color: accent, borderColor: `${accent}40` }}
                  >
                    SEV {(sig.severity * 10).toFixed(1)}
                  </span>
                )}
                {sig?.category && (
                  <span
                    className="font-mono text-[9px] uppercase tracking-[0.18em]"
                    style={{ color: categoryAccent(sig.category) }}
                  >
                    · {sig.category}
                  </span>
                )}
              </div>
              <h2 className="mt-2 font-editorial text-[20px] leading-[1.25] text-[#EAE8E3]">
                {sig?.title ?? (loading ? "Loading signal…" : "Signal")}
              </h2>
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
            {!sig && loading && (
              <div className="space-y-2 p-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-12 animate-pulse rounded-md bg-white/[0.02]"
                  />
                ))}
              </div>
            )}

            {!sig && !loading && (
              <div className="flex h-40 items-center justify-center font-mono text-[10px] uppercase tracking-[0.22em] text-[#555]">
                Signal not available.
              </div>
            )}

            {sig && (
              <div className="space-y-6 p-5">
                {/* Summary */}
                {(sig.summary || sig.narrative_summary) && (
                  <p className="text-[14px] leading-[1.65] text-[#cfcfcf]">
                    {sig.summary || sig.narrative_summary}
                  </p>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Stat
                    label="Confidence"
                    value={
                      sig.confidence != null
                        ? Math.round(sig.confidence * 100) + "%"
                        : "—"
                    }
                  />
                  <Stat
                    label="Momentum"
                    value={
                      sig.momentum != null
                        ? Math.round(sig.momentum * 100) + "%"
                        : "—"
                    }
                  />
                  <Stat
                    label="Markets"
                    value={
                      sig.market_link_count ??
                      sig.markets?.length ??
                      "—"
                    }
                  />
                  <Stat
                    label="Evidence"
                    value={sig.evidence_count ?? sig.evidence?.length ?? "—"}
                  />
                </div>

                {/* Geo tags */}
                {sig.geo_tags && sig.geo_tags.length > 0 && (
                  <Section title="Geography">
                    <div className="flex flex-wrap gap-1.5">
                      {sig.geo_tags.slice(0, 8).map((g, i) => (
                        <span
                          key={`${g.country}-${i}`}
                          className="rounded-sm border border-white/[0.06] bg-white/[0.02] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[#bbb]"
                        >
                          {g.name || g.country}
                        </span>
                      ))}
                    </div>
                  </Section>
                )}

                {/* Linked markets */}
                {sig.markets && sig.markets.length > 0 && (
                  <Section title={`Linked markets · ${sig.markets.length}`}>
                    <div className="divide-y divide-white/[0.04] overflow-hidden rounded-md border border-white/[0.06]">
                      {sig.markets.slice(0, 8).map((m) => {
                        const yesPct = Math.round((m.yes_price ?? 0) * 100);
                        const accent2 = categoryAccent(m.category);
                        return (
                          <div
                            key={m.market_id}
                            className="flex items-center justify-between gap-3 px-3 py-2.5"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="line-clamp-2 text-[12.5px] leading-snug text-[#dcdcdc]">
                                {m.title}
                              </div>
                              <div className="mt-0.5 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.18em] text-[#555]">
                                <span>{platformLabel(m.platform)}</span>
                                {m.is_primary && (
                                  <>
                                    <span className="text-[#2a2a2a]">·</span>
                                    <span style={{ color: accent2 }}>
                                      Primary
                                    </span>
                                  </>
                                )}
                                {typeof m.volume_24h === "number" &&
                                  m.volume_24h > 0 && (
                                    <>
                                      <span className="text-[#2a2a2a]">·</span>
                                      <span>
                                        vol {formatVolume(m.volume_24h)}
                                      </span>
                                    </>
                                  )}
                              </div>
                            </div>
                            <span
                              className="shrink-0 font-editorial text-[18px] leading-none text-[#EAE8E3]"
                              style={{ color: accent2 }}
                            >
                              {yesPct}
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

                {/* Twitter evidence */}
                {sig.top_twitter_evidence &&
                  sig.top_twitter_evidence.length > 0 && (
                    <Section
                      title={`Tweets · ${sig.top_twitter_evidence.length}`}
                    >
                      <EvidenceList items={sig.top_twitter_evidence} />
                    </Section>
                  )}

                {/* News / RSS evidence */}
                {sig.evidence && sig.evidence.length > 0 && (
                  <Section title={`Evidence · ${sig.evidence.length}`}>
                    <EvidenceList items={sig.evidence.slice(0, 12)} />
                  </Section>
                )}
              </div>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-white/[0.06] bg-white/[0.015] px-3 py-2">
      <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#555]">
        {label}
      </div>
      <div className="mt-0.5 font-editorial text-[18px] leading-none text-[#EAE8E3]">
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
        <Link2 className="h-3 w-3" />
        {title}
      </div>
      {children}
    </section>
  );
}

function EvidenceList({ items }: { items: SignalEvidence[] }) {
  return (
    <ul className="divide-y divide-white/[0.04] overflow-hidden rounded-md border border-white/[0.06]">
      {items.map((e) => {
        const url = e.url ?? undefined;
        const Tag: React.ElementType = url ? "a" : "div";
        return (
          <li key={e.id}>
            <Tag
              href={url}
              {...(url
                ? { target: "_blank", rel: "noreferrer" }
                : {})}
              className="block px-3 py-2.5 transition-colors hover:bg-white/[0.025]"
            >
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  {e.title && (
                    <div className="line-clamp-2 text-[12.5px] leading-snug text-[#dcdcdc]">
                      {e.title}
                    </div>
                  )}
                  {e.summary && (
                    <div className="mt-1 line-clamp-2 text-[12px] leading-snug text-[#888]">
                      {e.summary}
                    </div>
                  )}
                  <div className="mt-1.5 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.18em] text-[#555]">
                    <span>{e.source_name ?? e.source_type ?? "source"}</span>
                    {(e.published_at ?? e.occurred_at) && (
                      <>
                        <span className="text-[#2a2a2a]">·</span>
                        <span>
                          {formatRelativeTime(
                            e.published_at ?? e.occurred_at ?? "",
                          )}
                        </span>
                      </>
                    )}
                    {typeof e.impact_severity === "number" && (
                      <>
                        <span className="text-[#2a2a2a]">·</span>
                        <span style={{ color: severityColor(e.impact_severity) }}>
                          impact {(e.impact_severity * 10).toFixed(1)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                {url && (
                  <ExternalLink
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#666]"
                    strokeWidth={1.6}
                  />
                )}
              </div>
            </Tag>
          </li>
        );
      })}
    </ul>
  );
}
