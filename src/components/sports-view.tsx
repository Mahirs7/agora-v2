"use client";

import { Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  formatVolume,
  type SportsGame,
  type SportsLeague,
  type SportsMarket,
  type SportsPill,
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

export default function SportsView({
  onMarketSelect,
}: {
  onMarketSelect: (id: string) => void;
}) {
  const [leagues, setLeagues] = useState<SportsLeague[]>([]);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [pills, setPills] = useState<SportsPill[]>([]);
  const [activePill, setActivePill] = useState<string>("");
  const [games, setGames] = useState<SportsGame[]>([]);
  const [markets, setMarkets] = useState<SportsMarket[]>([]);
  const [loading, setLoading] = useState(false);

  /* Load leagues once */
  useEffect(() => {
    let cancelled = false;
    safeJson<{ leagues: SportsLeague[] }>("/api/kosmos/sports/leagues").then(
      (d) => {
        if (cancelled || !d) return;
        const arr = (d.leagues ?? [])
          .filter((l) => l.code && l.display_name)
          .sort((a, b) => (b.volume_3d ?? 0) - (a.volume_3d ?? 0));
        setLeagues(arr);
        if (arr.length && !selectedCode) setSelectedCode(arr[0].code);
      },
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Load pills + games when league changes */
  useEffect(() => {
    if (!selectedCode) return;
    let cancelled = false;
    setLoading(true);
    setGames([]);
    setMarkets([]);

    Promise.all([
      safeJson<{ pills: SportsPill[] }>(
        `/api/kosmos/sports/leagues/${selectedCode}/pills`,
      ),
      safeJson<{ games: SportsGame[] } | SportsGame[]>(
        `/api/kosmos/sports/leagues/${selectedCode}/games?limit=40`,
      ),
    ]).then(([pRes, gRes]) => {
      if (cancelled) return;
      const ps = pRes?.pills ?? [];
      setPills(ps);
      setActivePill((cur) => {
        if (cur && ps.some((p) => p.pill_label === cur)) return cur;
        return ps[0]?.pill_label ?? "Games";
      });
      const gs = Array.isArray(gRes)
        ? gRes
        : Array.isArray(gRes?.games)
          ? gRes.games
          : [];
      setGames(gs);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [selectedCode]);

  /* Load markets when pill changes (only for non-Games pills) */
  useEffect(() => {
    if (!selectedCode || !activePill || activePill === "Games") {
      setMarkets([]);
      return;
    }
    let cancelled = false;
    safeJson<{ markets: SportsMarket[] } | SportsMarket[]>(
      `/api/kosmos/sports/leagues/${selectedCode}/markets?pill=${encodeURIComponent(
        activePill,
      )}&limit=80`,
    ).then((d) => {
      if (cancelled || !d) return;
      const arr = Array.isArray(d) ? d : Array.isArray(d.markets) ? d.markets : [];
      setMarkets(arr);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedCode, activePill]);

  const selectedLeague = useMemo(
    () => leagues.find((l) => l.code === selectedCode) ?? null,
    [leagues, selectedCode],
  );

  return (
    <div className="flex h-full overflow-hidden">
      {/* League list */}
      <aside className="flex w-[280px] shrink-0 flex-col border-r border-white/[0.05] bg-[#070709]">
        <div className="flex items-center gap-2 border-b border-white/[0.05] px-4 py-3">
          <Trophy className="h-3.5 w-3.5 text-[#888]" strokeWidth={1.6} />
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#bbb]">
            Leagues · {leagues.length}
          </span>
        </div>
        <ul className="flex-1 overflow-y-auto">
          {leagues.map((l) => {
            const active = selectedCode === l.code;
            return (
              <li key={l.code}>
                <button
                  type="button"
                  onClick={() => setSelectedCode(l.code)}
                  className={`flex w-full items-center gap-3 border-b border-white/[0.03] px-4 py-2.5 text-left transition-colors ${
                    active ? "bg-white/[0.04]" : "hover:bg-white/[0.02]"
                  }`}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/[0.05] bg-white/[0.04]">
                    {l.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={l.image_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="font-mono text-[10px] uppercase text-[#888]">
                        {l.code.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] text-[#dcdcdc]">
                      {l.display_name}
                    </div>
                    <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#555]">
                      {l.market_count ?? 0} mkts ·{" "}
                      {l.volume_3d != null ? formatVolume(l.volume_3d) : "—"}
                    </div>
                  </div>
                  {(l.live_game_count ?? 0) > 0 && (
                    <span className="shrink-0 rounded-full border border-[#F03E17]/40 bg-[#F03E17]/10 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-[#F03E17]">
                      {l.live_game_count} live
                    </span>
                  )}
                </button>
              </li>
            );
          })}
          {leagues.length === 0 && (
            <li className="p-5 font-mono text-[10px] uppercase tracking-[0.22em] text-[#555]">
              Loading leagues…
            </li>
          )}
        </ul>
      </aside>

      {/* Selected league panel */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {selectedLeague && (
          <div className="flex items-center gap-3 border-b border-white/[0.05] bg-[#070709]/70 px-5 py-3 backdrop-blur">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/[0.06] bg-white/[0.04]">
              {selectedLeague.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedLeague.image_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <Trophy className="h-4 w-4 text-[#888]" strokeWidth={1.6} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-editorial text-[18px] leading-none text-[#EAE8E3]">
                {selectedLeague.display_name}
              </div>
              <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[#555]">
                {selectedLeague.sport_group ?? "sport"} ·{" "}
                {selectedLeague.market_count ?? 0} markets ·{" "}
                {selectedLeague.game_count ?? 0} games · 3d vol{" "}
                {selectedLeague.volume_3d != null
                  ? formatVolume(selectedLeague.volume_3d)
                  : "—"}
              </div>
            </div>
          </div>
        )}

        {/* Pill tabs */}
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
                  {typeof p.active_market_count === "number" && (
                    <span className="ml-1.5 text-[#555]">
                      {p.active_market_count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {loading && games.length === 0 && markets.length === 0 && (
            <div className="space-y-2 p-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-14 animate-pulse rounded-md bg-white/[0.02]"
                />
              ))}
            </div>
          )}

          {/* Games */}
          {activePill === "Games" && games.length > 0 && (
            <ul className="divide-y divide-white/[0.03]">
              {games.map((g) => (
                <GameRow
                  key={g.id}
                  game={g}
                  onMarketSelect={onMarketSelect}
                />
              ))}
            </ul>
          )}

          {/* Markets list (non-Games pills) */}
          {activePill !== "Games" && markets.length > 0 && (
            <ul className="divide-y divide-white/[0.03]">
              {markets.map((m) => (
                <SportsMarketRow
                  key={m.market_id}
                  market={m}
                  onMarketSelect={onMarketSelect}
                />
              ))}
            </ul>
          )}

          {/* Empty */}
          {!loading &&
            ((activePill === "Games" && games.length === 0) ||
              (activePill !== "Games" && markets.length === 0)) && (
              <div className="flex h-40 items-center justify-center font-mono text-[10px] uppercase tracking-[0.22em] text-[#555]">
                No {activePill || "items"} for this league.
              </div>
            )}
        </div>
      </main>
    </div>
  );
}

function GameRow({
  game,
  onMarketSelect,
}: {
  game: SportsGame;
  onMarketSelect: (id: string) => void;
}) {
  const live =
    game.status === "live" ||
    (typeof game.score_home === "number" && typeof game.score_away === "number");
  const time = game.scheduled_at
    ? new Date(game.scheduled_at).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
  return (
    <li className="px-5 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="text-[13px] text-[#dcdcdc]">{game.title}</div>
          <div className="mt-0.5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#555]">
            {live && (
              <span className="flex items-center gap-1 text-[#F03E17]">
                <span className="h-1 w-1 animate-pulse rounded-full bg-[#F03E17]" />
                live {game.period ? `· ${game.period}` : ""}
              </span>
            )}
            {!live && time && <span>{time}</span>}
            {typeof game.volume_24h === "number" && game.volume_24h > 0 && (
              <>
                <span className="text-[#2a2a2a]">·</span>
                <span>vol {formatVolume(game.volume_24h)}</span>
              </>
            )}
            {(game.market_count ?? 0) > 0 && (
              <>
                <span className="text-[#2a2a2a]">·</span>
                <span>{game.market_count} mkts</span>
              </>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-stretch gap-2">
          <TeamButton
            label={game.away_abbr ?? "AWAY"}
            price={game.away_yes_price}
            score={game.score_away}
            marketId={game.away_yes_market_id}
            onMarketSelect={onMarketSelect}
          />
          <TeamButton
            label={game.home_abbr ?? "HOME"}
            price={game.home_yes_price}
            score={game.score_home}
            marketId={game.home_yes_market_id}
            onMarketSelect={onMarketSelect}
          />
        </div>
      </div>
    </li>
  );
}

function TeamButton({
  label,
  price,
  score,
  marketId,
  onMarketSelect,
}: {
  label: string;
  price?: number | null;
  score?: number | null;
  marketId?: string | null;
  onMarketSelect: (id: string) => void;
}) {
  const pct = price != null ? Math.round(price * 100) : null;
  const disabled = !marketId;
  return (
    <button
      type="button"
      onClick={marketId ? () => onMarketSelect(marketId) : undefined}
      disabled={disabled}
      className="flex w-[88px] flex-col items-center justify-center rounded-md border border-white/[0.06] bg-white/[0.015] px-2 py-1.5 transition-colors enabled:hover:border-white/[0.16] enabled:hover:bg-white/[0.05] disabled:cursor-default disabled:opacity-50"
    >
      <div className="flex items-baseline gap-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#bbb]">
          {label}
        </span>
        {typeof score === "number" && (
          <span className="font-editorial text-[14px] leading-none text-[#EAE8E3]">
            {score}
          </span>
        )}
      </div>
      <div className="font-editorial text-[18px] leading-none text-[#EAE8E3]">
        {pct ?? "—"}
        <span className="ml-0.5 text-[10px] text-[#555]">%</span>
      </div>
    </button>
  );
}

function SportsMarketRow({
  market,
  onMarketSelect,
}: {
  market: SportsMarket;
  onMarketSelect: (id: string) => void;
}) {
  const yesPct =
    market.yes_price != null ? Math.round(market.yes_price * 100) : null;
  return (
    <li>
      <button
        type="button"
        onClick={() => onMarketSelect(market.market_id)}
        className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left transition-colors hover:bg-white/[0.02]"
      >
        <div className="min-w-0 flex-1">
          <div className="line-clamp-2 text-[12.5px] leading-snug text-[#dcdcdc]">
            {market.question}
          </div>
          <div className="mt-0.5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#555]">
            <span>{market.platform ?? "—"}</span>
            {market.group_item_title && (
              <>
                <span className="text-[#2a2a2a]">·</span>
                <span className="text-[#bbb]">{market.group_item_title}</span>
              </>
            )}
            {market.game_title && (
              <>
                <span className="text-[#2a2a2a]">·</span>
                <span className="truncate">{market.game_title}</span>
              </>
            )}
            {typeof market.volume_24h === "number" &&
              market.volume_24h > 0 && (
                <>
                  <span className="text-[#2a2a2a]">·</span>
                  <span>vol {formatVolume(market.volume_24h)}</span>
                </>
              )}
          </div>
        </div>
        <span className="shrink-0 font-editorial text-[20px] leading-none text-[#EAE8E3]">
          {yesPct ?? "—"}
          <span className="ml-0.5 text-[10px] text-[#555]">%</span>
        </span>
      </button>
    </li>
  );
}
