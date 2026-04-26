"use client";

import { Building2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  formatVolume,
  type PoliticsCandidate,
  type PoliticsJurisdiction,
  type PoliticsMarket,
  type PoliticsPill,
  type PoliticsRace,
} from "@/lib/kosmos-data";

async function safeJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export default function PoliticsView({
  onMarketSelect,
}: {
  onMarketSelect: (id: string) => void;
}) {
  const [jurisdictions, setJurisdictions] = useState<PoliticsJurisdiction[]>(
    [],
  );
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [pills, setPills] = useState<PoliticsPill[]>([]);
  const [activePill, setActivePill] = useState<string>("");
  const [races, setRaces] = useState<PoliticsRace[]>([]);
  const [markets, setMarkets] = useState<PoliticsMarket[]>([]);
  const [loading, setLoading] = useState(false);

  /* Load jurisdictions once */
  useEffect(() => {
    let cancelled = false;
    safeJson<{ jurisdictions: PoliticsJurisdiction[] }>(
      "/api/kosmos/politics/jurisdictions",
    ).then((d) => {
      if (cancelled || !d) return;
      const arr = (d.jurisdictions ?? [])
        .filter((j) => j.code && j.display_name)
        .sort((a, b) => (b.volume_24h ?? 0) - (a.volume_24h ?? 0));
      setJurisdictions(arr);
      if (arr.length && !selectedCode) setSelectedCode(arr[0].code);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Load pills when jurisdiction changes */
  useEffect(() => {
    if (!selectedCode) return;
    let cancelled = false;
    setRaces([]);
    setMarkets([]);
    safeJson<{ pills: PoliticsPill[] }>(
      `/api/kosmos/politics/jurisdictions/${selectedCode}/pills`,
    ).then((d) => {
      if (cancelled || !d) return;
      const ps = (d.pills ?? []).filter((p) => (p.count ?? 0) > 0);
      setPills(ps);
      setActivePill((cur) => {
        if (cur && ps.some((p) => p.pill_label === cur)) return cur;
        return ps[0]?.pill_label ?? "";
      });
    });
    return () => {
      cancelled = true;
    };
  }, [selectedCode]);

  /* Load content when pill changes */
  useEffect(() => {
    if (!selectedCode || !activePill) return;
    let cancelled = false;
    setLoading(true);

    if (activePill === "Policy") {
      setRaces([]);
      safeJson<{ markets: PoliticsMarket[] } | PoliticsMarket[]>(
        `/api/kosmos/politics/jurisdictions/${selectedCode}/markets?pill=Policy&limit=80`,
      ).then((d) => {
        if (cancelled) return;
        const arr = Array.isArray(d)
          ? d
          : Array.isArray(d?.markets)
            ? d.markets
            : [];
        setMarkets(arr);
        setLoading(false);
      });
    } else {
      setMarkets([]);
      safeJson<{ races: PoliticsRace[] } | PoliticsRace[]>(
        `/api/kosmos/politics/jurisdictions/${selectedCode}/races?pill=${encodeURIComponent(
          activePill,
        )}&limit=60`,
      ).then((d) => {
        if (cancelled) return;
        const arr = Array.isArray(d)
          ? d
          : Array.isArray(d?.races)
            ? d.races
            : [];
        setRaces(arr);
        setLoading(false);
      });
    }

    return () => {
      cancelled = true;
    };
  }, [selectedCode, activePill]);

  const selected = useMemo(
    () => jurisdictions.find((j) => j.code === selectedCode) ?? null,
    [jurisdictions, selectedCode],
  );

  return (
    <div className="flex h-full overflow-hidden">
      <aside className="flex w-[280px] shrink-0 flex-col border-r border-white/[0.05] bg-[#070709]">
        <div className="flex items-center gap-2 border-b border-white/[0.05] px-4 py-3">
          <Building2 className="h-3.5 w-3.5 text-[#888]" strokeWidth={1.6} />
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#bbb]">
            Jurisdictions · {jurisdictions.length}
          </span>
        </div>
        <ul className="flex-1 overflow-y-auto">
          {jurisdictions.map((j) => {
            const active = selectedCode === j.code;
            return (
              <li key={j.code}>
                <button
                  type="button"
                  onClick={() => setSelectedCode(j.code)}
                  className={`flex w-full items-center justify-between border-b border-white/[0.03] px-4 py-3 text-left transition-colors ${
                    active ? "bg-white/[0.04]" : "hover:bg-white/[0.02]"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] text-[#dcdcdc]">
                      {j.display_name}
                    </div>
                    <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#555]">
                      {j.race_count ?? 0} races · {j.market_count ?? 0} mkts
                    </div>
                  </div>
                  {typeof j.volume_24h === "number" && (
                    <span className="shrink-0 font-mono text-[10px] tabular-nums text-[#bbb]">
                      {formatVolume(j.volume_24h)}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
          {jurisdictions.length === 0 && (
            <li className="p-5 font-mono text-[10px] uppercase tracking-[0.22em] text-[#555]">
              Loading jurisdictions…
            </li>
          )}
        </ul>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {selected && (
          <div className="border-b border-white/[0.05] bg-[#070709]/70 px-5 py-3 backdrop-blur">
            <div className="font-editorial text-[18px] leading-none text-[#EAE8E3]">
              {selected.display_name}
            </div>
            <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[#555]">
              {selected.race_count ?? 0} races · {selected.market_count ?? 0}{" "}
              markets · 24h vol{" "}
              {selected.volume_24h != null
                ? formatVolume(selected.volume_24h)
                : "—"}
            </div>
          </div>
        )}

        {pills.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 border-b border-white/[0.05] bg-[#070709]/70 px-5 py-2.5 backdrop-blur">
            {pills.map((p) => {
              const active = activePill === p.pill_label;
              return (
                <button
                  key={p.pill_label}
                  type="button"
                  onClick={() => setActivePill(p.pill_label)}
                  className={`h-7 rounded-full border px-3 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors ${
                    active
                      ? "border-white/[0.15] bg-white/[0.05] text-[#EAE8E3]"
                      : "border-white/[0.05] bg-transparent text-[#666] hover:text-[#bbb]"
                  }`}
                >
                  {p.pill_label}
                  {typeof p.count === "number" && (
                    <span className="ml-1.5 text-[#555]">{p.count}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {loading && races.length === 0 && markets.length === 0 && (
            <div className="space-y-2 p-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-14 animate-pulse rounded-md bg-white/[0.02]"
                />
              ))}
            </div>
          )}

          {/* Races */}
          {activePill !== "Policy" && races.length > 0 && (
            <ul className="divide-y divide-white/[0.03]">
              {races.map((r) => (
                <RaceRow
                  key={r.race_id}
                  race={r}
                  onMarketSelect={onMarketSelect}
                />
              ))}
            </ul>
          )}

          {/* Policy markets */}
          {activePill === "Policy" && markets.length > 0 && (
            <ul className="divide-y divide-white/[0.03]">
              {markets.map((m) => (
                <PoliticsMarketRow
                  key={m.market_id}
                  market={m}
                  onMarketSelect={onMarketSelect}
                />
              ))}
            </ul>
          )}

          {!loading &&
            ((activePill === "Policy" && markets.length === 0) ||
              (activePill !== "Policy" && races.length === 0)) &&
            activePill && (
              <div className="flex h-40 items-center justify-center font-mono text-[10px] uppercase tracking-[0.22em] text-[#555]">
                No {activePill} for this jurisdiction.
              </div>
            )}
        </div>
      </main>
    </div>
  );
}

function RaceRow({
  race,
  onMarketSelect,
}: {
  race: PoliticsRace;
  onMarketSelect: (id: string) => void;
}) {
  const candidates = race.top_candidates ?? [];
  return (
    <li className="px-5 py-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="text-[13px] leading-snug text-[#dcdcdc]">
            {race.title}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#555]">
            {race.topic_label && <span>{race.topic_label}</span>}
            {race.cycle && (
              <>
                <span className="text-[#2a2a2a]">·</span>
                <span>{race.cycle}</span>
              </>
            )}
            {(race.market_count ?? 0) > 0 && (
              <>
                <span className="text-[#2a2a2a]">·</span>
                <span>{race.market_count} mkts</span>
              </>
            )}
            {typeof race.volume_24h === "number" && race.volume_24h > 0 && (
              <>
                <span className="text-[#2a2a2a]">·</span>
                <span>vol {formatVolume(race.volume_24h)}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {candidates.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {candidates.slice(0, 6).map((c, i) => (
            <CandidatePill
              key={`${race.race_id}-${c.market_id}-${i}`}
              candidate={c}
              onMarketSelect={onMarketSelect}
            />
          ))}
        </div>
      )}
    </li>
  );
}

function CandidatePill({
  candidate,
  onMarketSelect,
}: {
  candidate: PoliticsCandidate;
  onMarketSelect: (id: string) => void;
}) {
  const pct =
    candidate.yes_price != null ? Math.round(candidate.yes_price * 100) : null;
  const label =
    candidate.candidate_name ||
    candidate.candidate_party ||
    candidate.platform?.toUpperCase() ||
    "—";
  return (
    <button
      type="button"
      onClick={() => onMarketSelect(candidate.market_id)}
      className="flex items-center gap-2 rounded-md border border-white/[0.06] bg-white/[0.015] px-2.5 py-1 transition-colors hover:border-white/[0.16] hover:bg-white/[0.04]"
    >
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#bbb]">
        {label}
      </span>
      <span className="font-editorial text-[14px] leading-none text-[#EAE8E3]">
        {pct ?? "—"}
        <span className="ml-0.5 text-[9px] text-[#555]">%</span>
      </span>
    </button>
  );
}

function PoliticsMarketRow({
  market,
  onMarketSelect,
}: {
  market: PoliticsMarket;
  onMarketSelect: (id: string) => void;
}) {
  const pct =
    market.yes_price != null ? Math.round(market.yes_price * 100) : null;
  return (
    <li>
      <button
        type="button"
        onClick={() => onMarketSelect(market.market_id)}
        className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-white/[0.02]"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/[0.05] bg-white/[0.04]">
          {market.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={market.image_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="font-mono text-[10px] uppercase text-[#888]">
              {(market.platform ?? "·").slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="line-clamp-2 text-[12.5px] leading-snug text-[#dcdcdc]">
            {market.question}
          </div>
          <div className="mt-0.5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#555]">
            <span>{market.platform ?? "—"}</span>
            {typeof market.volume_24h === "number" &&
              market.volume_24h > 0 && (
                <>
                  <span className="text-[#2a2a2a]">·</span>
                  <span>vol {formatVolume(market.volume_24h)}</span>
                </>
              )}
            {market.close_time && (
              <>
                <span className="text-[#2a2a2a]">·</span>
                <span>
                  closes{" "}
                  {new Date(market.close_time).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </>
            )}
          </div>
        </div>
        <span className="shrink-0 font-editorial text-[20px] leading-none text-[#EAE8E3]">
          {pct ?? "—"}
          <span className="ml-0.5 text-[10px] text-[#555]">%</span>
        </span>
      </button>
    </li>
  );
}
