"use client";

import { useEffect, useRef, useState, useCallback } from "react";

/* ═══════════════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════════════ */

type CountryFeature = {
  type: string;
  id?: string;
  properties: { name?: string };
  geometry: { type: string; coordinates: unknown };
};

type MarketData = {
  title: string;
  yes_price: number;
  volume_24h: number;
  category: string;
  platform?: string;
};

type SignalData = {
  title: string;
  severity: number;
  category: string;
  summary?: string;
};

type TooltipInfo = {
  x: number;
  y: number;
  type: "conflict" | "capital" | "intelligence" | "supply";
  label: string;
  location: string;
  markets: MarketData[];
  signals: SignalData[];
};

/* ═══════════════════════════════════════════════════════════════════════════
   Hotspot countries — ISO 3166-1 numeric
   ═══════════════════════════════════════════════════════════════════════════ */

const HOTSPOT_COLORS: Record<string, string> = {
  "364": "rgba(210, 70, 50, 0.72)",    // Iran
  "792": "rgba(200, 65, 45, 0.65)",    // Turkey
  "804": "rgba(195, 60, 42, 0.60)",    // Ukraine
  "408": "rgba(190, 55, 40, 0.58)",    // North Korea
  "643": "rgba(160, 85, 35, 0.45)",    // Russia
  "368": "rgba(175, 90, 50, 0.55)",    // Iraq
  "760": "rgba(170, 88, 48, 0.52)",    // Syria
  "275": "rgba(165, 85, 45, 0.48)",    // Palestine
  "422": "rgba(155, 80, 42, 0.45)",    // Lebanon
  "887": "rgba(160, 82, 44, 0.45)",    // Yemen
  "682": "rgba(150, 115, 30, 0.38)",   // Saudi Arabia
  "156": "rgba(120, 80, 45, 0.30)",    // China
  "410": "rgba(100, 82, 60, 0.22)",    // South Korea
  "158": "rgba(100, 82, 60, 0.28)",    // Taiwan
  "586": "rgba(115, 85, 55, 0.24)",    // Pakistan
  "104": "rgba(105, 78, 52, 0.20)",    // Myanmar
  "434": "rgba(120, 82, 48, 0.28)",    // Libya
  "736": "rgba(110, 78, 45, 0.24)",    // Sudan
};

/* ═══════════════════════════════════════════════════════════════════════════
   Signal markers — each has a location name + type for tooltip matching
   ═══════════════════════════════════════════════════════════════════════════ */

type MarkerPoint = {
  lat: number;
  lng: number;
  size: number;
  color: string;
  type: "conflict" | "capital" | "intelligence" | "supply";
  location: string;
  keywords: string[];
};

const MARKER_POINTS: MarkerPoint[] = [
  // Flashpoints — vermilion
  { lat: 26, lng: 56, size: 2.0, color: "#F03E17", type: "conflict", location: "Strait of Hormuz", keywords: ["iran", "hormuz", "strait", "gulf", "oil"] },
  { lat: 33.3, lng: 44.4, size: 1.2, color: "#F03E17", type: "conflict", location: "Baghdad", keywords: ["iraq", "baghdad", "militia"] },
  { lat: 50.4, lng: 30.5, size: 1.8, color: "#F03E17", type: "conflict", location: "Kyiv", keywords: ["ukraine", "kyiv", "kiev", "russia"] },
  { lat: 34.8, lng: 36.3, size: 1.0, color: "#F03E17", type: "conflict", location: "Damascus", keywords: ["syria", "damascus", "assad"] },
  { lat: 15.4, lng: 44.2, size: 0.9, color: "#F03E17", type: "conflict", location: "Sana'a", keywords: ["yemen", "houthi", "sanaa"] },
  { lat: 39.0, lng: 125.7, size: 1.4, color: "#F03E17", type: "conflict", location: "Pyongyang", keywords: ["korea", "pyongyang", "dprk", "kim"] },
  // Financial — blue
  { lat: 40.7, lng: -74, size: 1.6, color: "#ffb020", type: "capital", location: "New York", keywords: ["fed", "treasury", "wall street", "nyse", "nasdaq", "us", "dollar"] },
  { lat: 51.5, lng: -0.1, size: 1.4, color: "#ffb020", type: "capital", location: "London", keywords: ["london", "boe", "uk", "pound", "ftse", "britain"] },
  { lat: 35.7, lng: 139.7, size: 1.2, color: "#ffb020", type: "capital", location: "Tokyo", keywords: ["japan", "boj", "yen", "nikkei", "tokyo"] },
  { lat: 22.3, lng: 114.2, size: 1.0, color: "#ffb020", type: "capital", location: "Hong Kong", keywords: ["hong kong", "hang seng", "hk"] },
  { lat: 25.2, lng: 55.3, size: 0.9, color: "#ffb020", type: "capital", location: "Dubai", keywords: ["dubai", "uae", "emirates", "opec", "oil"] },
  // Intel — purple
  { lat: 38.9, lng: -77.0, size: 1.4, color: "#9B7FD4", type: "intelligence", location: "Washington D.C.", keywords: ["white house", "pentagon", "cia", "congress", "senate", "biden", "trump", "us"] },
  { lat: 48.9, lng: 2.3, size: 1.0, color: "#9B7FD4", type: "intelligence", location: "Paris", keywords: ["france", "paris", "macron", "eu", "europe"] },
  { lat: 55.8, lng: 37.6, size: 1.0, color: "#9B7FD4", type: "intelligence", location: "Moscow", keywords: ["russia", "moscow", "kremlin", "putin"] },
  { lat: 39.9, lng: 116.4, size: 1.0, color: "#9B7FD4", type: "intelligence", location: "Beijing", keywords: ["china", "beijing", "ccp", "xi"] },
  // Supply chain — green
  { lat: 1.35, lng: 103.8, size: 1.0, color: "#4CAF7D", type: "supply", location: "Singapore", keywords: ["singapore", "shipping", "strait", "malacca"] },
  { lat: 31.2, lng: 121.5, size: 0.9, color: "#4CAF7D", type: "supply", location: "Shanghai", keywords: ["shanghai", "china", "port", "trade"] },
  { lat: 24.8, lng: 121.0, size: 1.0, color: "#4CAF7D", type: "supply", location: "Taiwan", keywords: ["taiwan", "tsmc", "chip", "semiconductor"] },
  { lat: 9.0, lng: -79.5, size: 1.0, color: "#4CAF7D", type: "supply", location: "Panama Canal", keywords: ["panama", "canal", "shipping", "trade"] },
];

/* ═══════════════════════════════════════════════════════════════════════════
   Signal rings
   ═══════════════════════════════════════════════════════════════════════════ */

const RING_POINTS = [
  { lat: 26, lng: 56, maxR: 5, propagationSpeed: 2, repeatPeriod: 1800 },
  { lat: 50.4, lng: 30.5, maxR: 4, propagationSpeed: 2.5, repeatPeriod: 2200 },
  { lat: 39.0, lng: 125.7, maxR: 3.5, propagationSpeed: 1.8, repeatPeriod: 2800 },
  { lat: 33.3, lng: 44.4, maxR: 3, propagationSpeed: 1.5, repeatPeriod: 3000 },
  { lat: 15.4, lng: 44.2, maxR: 2.5, propagationSpeed: 1.2, repeatPeriod: 4000 },
  { lat: 40.7, lng: -74, maxR: 2.5, propagationSpeed: 1, repeatPeriod: 4500 },
];

/* ═══════════════════════════════════════════════════════════════════════════
   Flight arcs with plane symbols
   ═══════════════════════════════════════════════════════════════════════════ */

type ArcDatum = {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: string[];
  stroke: number;
  dashLen: number;
  gap: number;
  speed: number;
  altitude: number;
};

const ARC_DATA: ArcDatum[] = [
  // Intelligence (muted purple)
  { startLat: 38.9, startLng: -77.0, endLat: 51.5, endLng: -0.1, color: ["rgba(155,127,212,0.35)", "rgba(155,127,212,0.08)"], stroke: 0.3, dashLen: 0.8, gap: 0.4, speed: 4500, altitude: 0.2 },
  { startLat: 51.5, startLng: -0.1, endLat: 50.4, endLng: 30.5, color: ["rgba(155,127,212,0.3)", "rgba(155,127,212,0.06)"], stroke: 0.25, dashLen: 0.7, gap: 0.35, speed: 4000, altitude: 0.15 },
  { startLat: 38.9, startLng: -77.0, endLat: 35.7, endLng: 139.7, color: ["rgba(155,127,212,0.25)", "rgba(155,127,212,0.05)"], stroke: 0.25, dashLen: 1.0, gap: 0.5, speed: 6000, altitude: 0.28 },
  { startLat: 55.8, startLng: 37.6, endLat: 34.8, endLng: 36.3, color: ["rgba(155,127,212,0.3)", "rgba(155,127,212,0.06)"], stroke: 0.25, dashLen: 0.6, gap: 0.3, speed: 3500, altitude: 0.1 },
  { startLat: 39.9, startLng: 116.4, endLat: 39.0, endLng: 125.7, color: ["rgba(155,127,212,0.3)", "rgba(155,127,212,0.06)"], stroke: 0.25, dashLen: 0.5, gap: 0.25, speed: 3000, altitude: 0.08 },
  // Capital flows (muted blue)
  { startLat: 40.7, startLng: -74, endLat: 51.5, endLng: -0.1, color: ["rgba(255,176,32,0.3)", "rgba(255,176,32,0.06)"], stroke: 0.3, dashLen: 0.8, gap: 0.4, speed: 4200, altitude: 0.18 },
  { startLat: 51.5, startLng: -0.1, endLat: 25.2, endLng: 55.3, color: ["rgba(255,176,32,0.25)", "rgba(255,176,32,0.05)"], stroke: 0.25, dashLen: 0.7, gap: 0.35, speed: 4800, altitude: 0.16 },
  { startLat: 40.7, startLng: -74, endLat: 22.3, endLng: 114.2, color: ["rgba(255,176,32,0.2)", "rgba(255,176,32,0.04)"], stroke: 0.25, dashLen: 1.0, gap: 0.5, speed: 6500, altitude: 0.28 },
  { startLat: 35.7, startLng: 139.7, endLat: 22.3, endLng: 114.2, color: ["rgba(255,176,32,0.25)", "rgba(255,176,32,0.05)"], stroke: 0.25, dashLen: 0.6, gap: 0.3, speed: 3500, altitude: 0.1 },
  // Conflict (muted red)
  { startLat: 55.8, startLng: 37.6, endLat: 50.4, endLng: 30.5, color: ["rgba(240,62,23,0.35)", "rgba(240,62,23,0.08)"], stroke: 0.3, dashLen: 0.6, gap: 0.3, speed: 3000, altitude: 0.1 },
  { startLat: 32.4, startLng: 53.7, endLat: 15.4, endLng: 44.2, color: ["rgba(240,62,23,0.3)", "rgba(240,62,23,0.06)"], stroke: 0.25, dashLen: 0.5, gap: 0.25, speed: 3500, altitude: 0.12 },
  { startLat: 32.4, startLng: 53.7, endLat: 34.8, endLng: 36.3, color: ["rgba(240,62,23,0.3)", "rgba(240,62,23,0.06)"], stroke: 0.25, dashLen: 0.5, gap: 0.25, speed: 3200, altitude: 0.1 },
  { startLat: 32.4, startLng: 53.7, endLat: 26, endLng: 56, color: ["rgba(240,62,23,0.35)", "rgba(240,62,23,0.08)"], stroke: 0.3, dashLen: 0.6, gap: 0.3, speed: 3000, altitude: 0.08 },
  // Supply chain (muted green)
  { startLat: 31.2, startLng: 121.5, endLat: 1.35, endLng: 103.8, color: ["rgba(76,175,125,0.25)", "rgba(76,175,125,0.05)"], stroke: 0.25, dashLen: 0.7, gap: 0.35, speed: 4500, altitude: 0.14 },
  { startLat: 1.35, startLng: 103.8, endLat: 25.2, endLng: 55.3, color: ["rgba(76,175,125,0.2)", "rgba(76,175,125,0.04)"], stroke: 0.2, dashLen: 0.7, gap: 0.35, speed: 5000, altitude: 0.16 },
  { startLat: 24.8, startLng: 121.0, endLat: 35.7, endLng: 139.7, color: ["rgba(76,175,125,0.25)", "rgba(76,175,125,0.05)"], stroke: 0.25, dashLen: 0.6, gap: 0.3, speed: 3500, altitude: 0.08 },
  { startLat: 9.0, startLng: -79.5, endLat: 51.5, endLng: -0.1, color: ["rgba(76,175,125,0.18)", "rgba(76,175,125,0.04)"], stroke: 0.2, dashLen: 0.9, gap: 0.45, speed: 6000, altitude: 0.24 },
];

/* ═══════════════════════════════════════════════════════════════════════════
   Arc traveller — small luminous dot that travels along arcs
   ═══════════════════════════════════════════════════════════════════════════ */

function createTravellerElement(color: string): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.style.cssText = `pointer-events:none;width:8px;height:8px;border-radius:50%;background:${color};box-shadow:0 0 10px 4px ${color}, 0 0 18px 6px ${color}40;opacity:0.85;`;
  return wrapper;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Static plane icon at arc origin — small, elegant, muted
   ═══════════════════════════════════════════════════════════════════════════ */

function createOriginPlaneElement(color: string, rotation: number): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.style.cssText = `pointer-events:none;transform:rotate(${rotation}deg);opacity:0.55;`;
  wrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="${color}"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>`;
  return wrapper;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Great-circle helpers
   ═══════════════════════════════════════════════════════════════════════════ */

function interpolateArc(
  startLat: number, startLng: number,
  endLat: number, endLng: number,
  t: number
): { lat: number; lng: number } {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const lat1 = toRad(startLat), lng1 = toRad(startLng);
  const lat2 = toRad(endLat), lng2 = toRad(endLng);
  const d = 2 * Math.asin(Math.sqrt(
    Math.sin((lat2 - lat1) / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin((lng2 - lng1) / 2) ** 2
  ));
  if (d < 1e-6) return { lat: startLat, lng: startLng };
  const A = Math.sin((1 - t) * d) / Math.sin(d);
  const B = Math.sin(t * d) / Math.sin(d);
  const x = A * Math.cos(lat1) * Math.cos(lng1) + B * Math.cos(lat2) * Math.cos(lng2);
  const y = A * Math.cos(lat1) * Math.sin(lng1) + B * Math.cos(lat2) * Math.sin(lng2);
  const z = A * Math.sin(lat1) + B * Math.sin(lat2);
  return {
    lat: toDeg(Math.atan2(z, Math.sqrt(x * x + y * y))),
    lng: toDeg(Math.atan2(y, x)),
  };
}

function bearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

const WORLD_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

/* ═══════════════════════════════════════════════════════════════════════════
   Tooltip component (rendered in React overlay)
   ═══════════════════════════════════════════════════════════════════════════ */

const TYPE_META: Record<string, { label: string; color: string; tag: string }> = {
  conflict: { label: "CONFLICT ZONE", color: "#F03E17", tag: "THREAT" },
  capital: { label: "FINANCIAL HUB", color: "#ffb020", tag: "CAPITAL" },
  intelligence: { label: "INTEL NODE", color: "#9B7FD4", tag: "INTEL" },
  supply: { label: "SUPPLY CHAIN", color: "#4CAF7D", tag: "LOGISTICS" },
};

function GlobeTooltip({ info }: { info: TooltipInfo }) {
  const meta = TYPE_META[info.type];
  return (
    <div
      className="pointer-events-none fixed z-[100] w-[280px]"
      style={{ left: info.x + 16, top: info.y - 8, transform: "translateY(-50%)" }}
    >
      <div className="rounded-xl border border-white/[0.08] bg-[#0a0c14]/95 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-3.5 py-2.5">
          <div className="flex items-center gap-2">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: meta.color, boxShadow: `0 0 6px ${meta.color}` }}
            />
            <span className="font-mono text-[9px] uppercase tracking-[0.15em]" style={{ color: meta.color }}>
              {meta.label}
            </span>
          </div>
          <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#555]">{meta.tag}</span>
        </div>

        {/* Location */}
        <div className="border-b border-white/[0.04] px-3.5 py-2">
          <div className="font-sans text-[13px] font-medium text-[#EAE8E3]">{info.location}</div>
        </div>

        {/* Signals */}
        {info.signals.length > 0 && (
          <div className="border-b border-white/[0.04] px-3.5 py-2.5 space-y-2">
            <div className="font-mono text-[8px] uppercase tracking-[0.2em] text-[#555]">ACTIVE SIGNALS</div>
            {info.signals.slice(0, 2).map((s, i) => (
              <div key={i} className="flex items-start gap-2">
                <span
                  className="mt-1 shrink-0 font-mono text-[8px] font-bold px-1 py-0.5 rounded"
                  style={{
                    backgroundColor: s.severity >= 0.7 ? "rgba(240,62,23,0.15)" : "rgba(255,176,32,0.15)",
                    color: s.severity >= 0.7 ? "#F03E17" : "#ffb020",
                  }}
                >
                  {(s.severity * 10).toFixed(1)}
                </span>
                <span className="font-sans text-[11px] leading-tight text-[#999] line-clamp-2">{s.title}</span>
              </div>
            ))}
          </div>
        )}

        {/* Markets */}
        {info.markets.length > 0 && (
          <div className="px-3.5 py-2.5 space-y-1.5">
            <div className="font-mono text-[8px] uppercase tracking-[0.2em] text-[#555]">LINKED MARKETS</div>
            {info.markets.slice(0, 3).map((m, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <span className="font-sans text-[10px] leading-tight text-[#888] truncate flex-1">
                  {m.title}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="font-mono text-[10px] font-medium text-[#EAE8E3]">
                    {(m.yes_price * 100).toFixed(0)}%
                  </span>
                  {m.volume_24h > 0 && (
                    <span className="font-mono text-[8px] text-[#555]">
                      ${m.volume_24h >= 1000000
                        ? (m.volume_24h / 1000000).toFixed(1) + "M"
                        : m.volume_24h >= 1000
                          ? (m.volume_24h / 1000).toFixed(0) + "K"
                          : m.volume_24h.toFixed(0)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {info.signals.length === 0 && info.markets.length === 0 && (
          <div className="px-3.5 py-3">
            <span className="font-mono text-[10px] text-[#444]">Monitoring...</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Match API data to marker locations by keyword search
   ═══════════════════════════════════════════════════════════════════════════ */

// Keywords that are too short / ambiguous get word-boundary matching
// to prevent false positives like "us" matching "because" or "house"
const SHORT_KEYWORDS = new Set(["us", "uk", "eu", "hk", "uae"]);

function keywordMatches(text: string, kw: string): boolean {
  if (SHORT_KEYWORDS.has(kw) || kw.length <= 3) {
    // Word-boundary match for short keywords
    const regex = new RegExp(`\\b${kw}\\b`, "i");
    return regex.test(text);
  }
  return text.includes(kw);
}

function matchDataToMarker(
  marker: MarkerPoint,
  allMarkets: MarketData[],
  allSignals: SignalData[]
): { markets: MarketData[]; signals: SignalData[] } {
  const matchedMarkets: MarketData[] = [];
  const matchedSignals: SignalData[] = [];

  for (const m of allMarkets) {
    const text = m.title.toLowerCase();
    // Require at least one keyword match with strict boundary checking
    if (marker.keywords.some((kw) => keywordMatches(text, kw))) {
      matchedMarkets.push(m);
    }
  }

  for (const s of allSignals) {
    const text = (s.title + " " + (s.summary || "")).toLowerCase();
    if (marker.keywords.some((kw) => keywordMatches(text, kw))) {
      matchedSignals.push(s);
    }
  }

  // Sort signals by severity desc, markets by volume desc
  matchedSignals.sort((a, b) => b.severity - a.severity);
  matchedMarkets.sort((a, b) => (b.volume_24h || 0) - (a.volume_24h || 0));

  return { markets: matchedMarkets, signals: matchedSignals };
}

/* ═══════════════════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════════════════ */

export default function Globe3D({ compact = false }: { compact?: boolean } = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeElRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);
  const [apiMarkets, setApiMarkets] = useState<MarketData[]>([]);
  const [apiSignals, setApiSignals] = useState<SignalData[]>([]);
  const apiMarketsRef = useRef<MarketData[]>([]);
  const apiSignalsRef = useRef<SignalData[]>([]);

  const mousePos = useRef({ x: 0, y: 0 });

  const hoveredPointRef = useRef<MarkerPoint | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controlsRef = useRef<any>(null);
  const interactTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [mobileCard, setMobileCard] = useState<TooltipInfo | null>(null);
  const [cardVisible, setCardVisible] = useState(false);
  const cardDataRef = useRef<TooltipInfo | null>(null);
  const cardTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Open mobile card with proper enter animation
  const openMobileCard = useCallback((info: TooltipInfo) => {
    clearTimeout(cardTimerRef.current);
    cardDataRef.current = info;
    setMobileCard(info);
    // Trigger enter on next frame so the opacity transition fires
    requestAnimationFrame(() => setCardVisible(true));
  }, []);

  // Close mobile card with exit animation, then unmount
  const closeMobileCard = useCallback(() => {
    setCardVisible(false);
    clearTimeout(cardTimerRef.current);
    cardTimerRef.current = setTimeout(() => {
      setMobileCard(null);
      cardDataRef.current = null;
    }, 280); // slightly shorter than the 300ms transition
    if (controlsRef.current) controlsRef.current.autoRotate = true;
  }, []);

  // Track mouse for tooltip positioning — update tooltip in real time
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
      if (hoveredPointRef.current) {
        const p = hoveredPointRef.current;
        const matched = matchDataToMarker(p, apiMarketsRef.current, apiSignalsRef.current);
        setTooltip({
          x: e.clientX,
          y: e.clientY,
          type: p.type,
          label: p.location,
          location: p.location,
          markets: matched.markets,
          signals: matched.signals,
        });
      }
    };
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, []);

  // Keep refs in sync for use inside globe callbacks
  useEffect(() => { apiMarketsRef.current = apiMarkets; }, [apiMarkets]);
  useEffect(() => { apiSignalsRef.current = apiSignals; }, [apiSignals]);

  // Fetch API data
  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      try {
        const [mRes, sRes, fRes] = await Promise.all([
          fetch("/api/kosmos/markets").catch(() => null),
          fetch("/api/kosmos/signals?limit=50&status=active").catch(() => null),
          fetch("/api/kosmos/home/signals?limit=50").catch(() => null),
        ]);
        if (cancelled) return;

        if (mRes?.ok) {
          const data = await mRes.json();
          const list = Array.isArray(data)
            ? data
            : Array.isArray(data?.markets)
              ? data.markets
              : [];
          const markets: MarketData[] = list
            .filter((m: Record<string, unknown>) => m.title && typeof m.yes_price === "number")
            .map((m: Record<string, unknown>) => ({
              title: m.title as string,
              yes_price: m.yes_price as number,
              volume_24h: (m.volume_24h as number) || 0,
              category: (m.category as string) || "",
              platform: (m.platform as string) || "",
            }));
          if (!cancelled) setApiMarkets(markets);
        }

        // Combine signals from /signals and /feed
        const allSignals: SignalData[] = [];
        const seenIds = new Set<string>();

        if (sRes?.ok) {
          const sData = await sRes.json();
          const signalsList = sData?.signals || [];
          for (const s of signalsList) {
            if (s.id && !seenIds.has(s.id)) {
              seenIds.add(s.id);
              allSignals.push({
                title: s.title || "",
                severity: s.confidence || 0,
                category: s.category || "",
                summary: s.summary || "",
              });
            }
          }
        }

        if (fRes?.ok) {
          const fData = await fRes.json();
          const list = Array.isArray(fData?.signals) ? fData.signals : [];
          for (const s of list) {
            if (s?.id && !seenIds.has(s.id)) {
              seenIds.add(s.id);
              allSignals.push({
                title: s.title || "",
                severity: s.severity || s.confidence || 0,
                category: s.primary_category || s.category || "",
                summary: s.summary || s.narrative_summary || "",
              });
            }
          }
        }

        if (!cancelled) setApiSignals(allSignals);
      } catch {
        /* offline — tooltips just show location */
      }
    }
    fetchData();
    const interval = setInterval(fetchData, 60_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const handlePointHover = useCallback((point: object | null) => {
    if (!point) {
      hoveredPointRef.current = null;
      setTooltip(null);
      // Resume auto-rotation after a short delay
      clearTimeout(interactTimeoutRef.current);
      interactTimeoutRef.current = setTimeout(() => {
        if (controlsRef.current) controlsRef.current.autoRotate = true;
      }, 2000);
      return;
    }
    // Pause auto-rotation while hovering a marker
    clearTimeout(interactTimeoutRef.current);
    if (controlsRef.current) controlsRef.current.autoRotate = false;
    const p = point as MarkerPoint;
    hoveredPointRef.current = p;
    const matched = matchDataToMarker(p, apiMarketsRef.current, apiSignalsRef.current);
    setTooltip({
      x: mousePos.current.x,
      y: mousePos.current.y,
      type: p.type,
      label: p.location,
      location: p.location,
      markets: matched.markets,
      signals: matched.signals,
    });
  }, []);

  useEffect(() => {
    if (!globeElRef.current) return;

    let cancelled = false;

    async function init() {
      const [topojson, THREE] = await Promise.all([
        import("topojson-client"),
        import("three"),
      ]);

      if (cancelled || !globeElRef.current) return;

      const rect = globeElRef.current.getBoundingClientRect();
      const size = Math.max(rect.width, 400);

      const GlobeGL = await import("globe.gl");
      const GlobeClass = GlobeGL.default;

      if (cancelled || !globeElRef.current) return;

      globeElRef.current.innerHTML = "";

      const worldRes = await fetch(WORLD_URL);
      const worldTopo = await worldRes.json();
      const countries = topojson.feature(
        worldTopo,
        worldTopo.objects.countries
      ) as unknown as { features: CountryFeature[] };

      if (cancelled || !globeElRef.current) return;

      const mat = new THREE.MeshBasicMaterial();
      mat.color = new THREE.Color("#080a10");

      // HTML elements: static origin planes + travelling dots
      type PlaneData = {
        lat: number;
        lng: number;
        alt: number;
        arc: ArcDatum;
        el: HTMLElement;
        isOrigin?: boolean;
      };

      // Static plane icons at arc start points
      const originPlanes: PlaneData[] = ARC_DATA.map((arc) => {
        const colorStr = arc.color[0];
        const hex = colorStr.includes("240,62,23") ? "#F03E17" :
          colorStr.includes("255,176,32") ? "#ffb020" :
          colorStr.includes("155,127,212") ? "#9B7FD4" : "#4CAF7D";
        const angle = bearing(arc.startLat, arc.startLng, arc.endLat, arc.endLng);
        return {
          lat: arc.startLat,
          lng: arc.startLng,
          alt: 0.015,
          arc,
          el: createOriginPlaneElement(hex, angle - 45),
          isOrigin: true,
        };
      });

      // Travelling dots
      const travellerData: PlaneData[] = ARC_DATA.map((arc) => {
        const colorStr = arc.color[0];
        const hex = colorStr.includes("240,62,23") ? "#F03E17" :
          colorStr.includes("255,176,32") ? "#ffb020" :
          colorStr.includes("155,127,212") ? "#9B7FD4" : "#4CAF7D";
        return {
          lat: arc.startLat,
          lng: arc.startLng,
          alt: arc.altitude + 0.02,
          arc,
          el: createTravellerElement(hex),
        };
      });

      const globe = new GlobeClass(globeElRef.current)
        .width(size)
        .height(size)
        .backgroundColor("rgba(0,0,0,0)")
        .globeMaterial(mat)
        .atmosphereColor("rgba(198, 255, 58, 0.18)")
        .atmosphereAltitude(0.15)
        .showGraticules(false)

        // Country polygons
        .polygonsData(countries.features)
        .polygonCapColor((feat: object) => {
          const f = feat as CountryFeature;
          const id = String(f.id ?? "");
          return HOTSPOT_COLORS[id] || "rgba(8, 10, 16, 0.95)";
        })
        .polygonSideColor(() => "rgba(15, 18, 25, 0.5)")
        .polygonStrokeColor(() => "rgba(35, 40, 52, 0.35)")
        .polygonAltitude((feat: object) => {
          const f = feat as CountryFeature;
          const id = String(f.id ?? "");
          return HOTSPOT_COLORS[id] ? 0.006 : 0.002;
        })

        // Signal markers — interactive
        .pointsData(MARKER_POINTS)
        .pointLat("lat")
        .pointLng("lng")
        .pointAltitude(0.012)
        .pointRadius("size")
        .pointColor("color")
        .pointsMerge(false)
        .onPointHover(handlePointHover)
        .onPointClick((point: object | null) => {
          if (!point) return;
          const p = point as MarkerPoint;
          const matched = matchDataToMarker(p, apiMarketsRef.current, apiSignalsRef.current);
          // On mobile, show centered card; on desktop, tooltip already handles it
          if (window.matchMedia("(max-width: 1024px)").matches) {
            openMobileCard({
              x: 0, y: 0,
              type: p.type,
              label: p.location,
              location: p.location,
              markets: matched.markets,
              signals: matched.signals,
            });
            // Pause rotation
            if (controlsRef.current) controlsRef.current.autoRotate = false;
          }
        })

        // Signal pulse rings
        .ringsData(RING_POINTS)
        .ringLat("lat")
        .ringLng("lng")
        .ringMaxRadius("maxR")
        .ringPropagationSpeed("propagationSpeed")
        .ringRepeatPeriod("repeatPeriod")
        .ringColor(() => (t: number) => `rgba(240, 62, 23, ${(1 - t) * 0.5})`)

        // Flight arcs
        .arcsData(ARC_DATA)
        .arcStartLat("startLat")
        .arcStartLng("startLng")
        .arcEndLat("endLat")
        .arcEndLng("endLng")
        .arcColor("color")
        .arcAltitude("altitude")
        .arcStroke("stroke")
        .arcDashLength("dashLen")
        .arcDashGap("gap")
        .arcDashAnimateTime("speed")

        // Origin planes + travelling dots
        .htmlElementsData([...originPlanes, ...travellerData])
        .htmlLat("lat")
        .htmlLng("lng")
        .htmlAltitude("alt")
        .htmlElement("el")
        .htmlTransitionDuration(0);

      // Cap pixel ratio for performance on retina displays
      const renderer = globe.renderer();
      if (renderer) renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

      // Camera & controls — INTERACTIVE
      globe.pointOfView({ lat: 22, lng: 30, altitude: 2.0 });
      const controls = globe.controls();
      controlsRef.current = controls;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.3;
      controls.enableZoom = true;
      controls.enablePan = false;
      controls.enableRotate = true;
      controls.enableDamping = true;
      controls.dampingFactor = 0.12;
      controls.rotateSpeed = 0.5;
      controls.minDistance = 180;
      controls.maxDistance = 600;

      // Pause auto-rotate while user is interacting
      let interactTimeout: ReturnType<typeof setTimeout>;
      controls.addEventListener("start", () => {
        controls.autoRotate = false;
        clearTimeout(interactTimeout);
      });
      controls.addEventListener("end", () => {
        clearTimeout(interactTimeout);
        interactTimeout = setTimeout(() => {
          controls.autoRotate = true;
        }, 3000);
      });

      // Animate planes along arcs (throttled to ~20fps for performance)
      const startTime = Date.now();
      let animFrame: number;
      let lastPlaneUpdate = 0;
      const PLANE_INTERVAL = 50; // ms between updates

      function animatePlanes() {
        if (cancelled) return;
        const now = Date.now();
        if (now - lastPlaneUpdate < PLANE_INTERVAL) {
          animFrame = requestAnimationFrame(animatePlanes);
          return;
        }
        lastPlaneUpdate = now;
        const elapsed = now - startTime;

        for (const traveller of travellerData) {
          const arc = traveller.arc;
          const period = arc.speed * 2.5;
          const t = (elapsed % period) / period;
          const pos = interpolateArc(arc.startLat, arc.startLng, arc.endLat, arc.endLng, t);
          traveller.lat = pos.lat;
          traveller.lng = pos.lng;
          traveller.alt = arc.altitude * 4 * t * (1 - t) + 0.02;

          // Pulse opacity along the arc for a breathing effect
          const pulse = 0.5 + 0.5 * Math.sin(t * Math.PI);
          traveller.el.style.opacity = String(pulse);
        }

        globe.htmlElementsData([...originPlanes, ...travellerData]);
        animFrame = requestAnimationFrame(animatePlanes);
      }
      animatePlanes();

      // Handle resize
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const w = entry.contentRect.width;
          if (w > 0) globe.width(w).height(w);
        }
      });
      if (globeElRef.current?.parentElement) {
        ro.observe(globeElRef.current.parentElement);
      }

      setReady(true);

      return () => {
        cancelAnimationFrame(animFrame);
        clearTimeout(interactTimeout);
        ro.disconnect();
        globe._destructor?.();
      };
    }

    let cleanup: (() => void) | undefined;
    init().then((c) => {
      if (c) cleanup = c;
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [handlePointHover]);

  return (
    <div ref={containerRef} className={`relative mx-auto w-full ${compact ? "" : "max-w-4xl"}`}>
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 50% 50% at 50% 48%, rgba(240,62,23,0.035) 0%, rgba(8,10,16,0.2) 40%, transparent 65%)",
        }}
      />

      <div className={`w-full relative ${compact ? "aspect-square max-h-[calc(100vh-10rem)]" : "aspect-square"}`} style={compact ? { maxWidth: "calc(100vh - 10rem)" } : undefined}>
        <div
          ref={globeElRef}
          className="h-full w-full cursor-grab active:cursor-grabbing"
          style={{ opacity: ready ? 1 : 0, transition: "opacity 1.2s ease" }}
        />
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-48 w-48 rounded-full border border-white/[0.04] bg-[#080a10] animate-pulse" />
          </div>
        )}

        {/* Desktop tooltip overlay — hidden on touch */}
        <div className="hidden lg:block">
          {tooltip && <GlobeTooltip info={tooltip} />}
        </div>
      </div>

      {/* Mobile signal card — centered overlay with enter/exit transitions */}
      {mobileCard && (() => {
        const data = cardDataRef.current ?? mobileCard;
        const meta = TYPE_META[data.type];
        return (
          <div
            className="fixed inset-0 z-[100] flex items-end justify-center p-4 pb-8 sm:items-center lg:hidden"
            style={{
              opacity: cardVisible ? 1 : 0,
              pointerEvents: cardVisible ? "auto" : "none",
              transition: "opacity 280ms ease-out",
            }}
            onClick={closeMobileCard}
          >
            <div className="absolute inset-0 bg-black/50" />
            <div
              className="relative w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#0a0c14] shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden"
              style={{
                opacity: cardVisible ? 1 : 0,
                transform: cardVisible ? "translateY(0) scale(1)" : "translateY(20px) scale(0.97)",
                transition: "opacity 280ms cubic-bezier(0.16, 1, 0.3, 1), transform 280ms cubic-bezier(0.16, 1, 0.3, 1)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
                <div className="flex items-center gap-2.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.color, boxShadow: `0 0 8px ${meta.color}` }} />
                  <span className="font-mono text-[10px] uppercase tracking-[0.15em]" style={{ color: meta.color }}>{meta.label}</span>
                </div>
                <button onClick={closeMobileCard} className="text-[#555] p-1">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="border-b border-white/[0.04] px-5 py-3">
                <div className="font-sans text-[17px] font-medium text-[#EAE8E3]">{data.location}</div>
              </div>
              {data.signals.length > 0 && (
                <div className="border-b border-white/[0.04] px-5 py-4 space-y-3">
                  <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#555]">Active Signals</div>
                  {data.signals.slice(0, 3).map((s, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="mt-0.5 shrink-0 font-mono text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: s.severity >= 0.7 ? "rgba(240,62,23,0.15)" : "rgba(255,176,32,0.15)", color: s.severity >= 0.7 ? "#F03E17" : "#ffb020" }}>
                        {(s.severity * 10).toFixed(1)}
                      </span>
                      <span className="font-sans text-[13px] leading-snug text-[#999]">{s.title}</span>
                    </div>
                  ))}
                </div>
              )}
              {data.markets.length > 0 && (
                <div className="px-5 py-4 space-y-2.5">
                  <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#555]">Linked Markets</div>
                  {data.markets.slice(0, 4).map((m, i) => (
                    <div key={i} className="flex items-center justify-between gap-3">
                      <span className="font-sans text-[13px] leading-tight text-[#888] flex-1">{m.title}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-[13px] font-medium text-[#EAE8E3]">{(m.yes_price * 100).toFixed(0)}%</span>
                        {m.volume_24h > 0 && (
                          <span className="font-mono text-[9px] text-[#555]">
                            ${m.volume_24h >= 1000000 ? (m.volume_24h / 1000000).toFixed(1) + "M" : m.volume_24h >= 1000 ? (m.volume_24h / 1000).toFixed(0) + "K" : m.volume_24h.toFixed(0)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {data.signals.length === 0 && data.markets.length === 0 && (
                <div className="px-5 py-4">
                  <span className="font-mono text-[12px] text-[#444]">Monitoring this region...</span>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Legend — compact single row on mobile, two boxes on desktop */}
      <div className={`absolute z-10 ${compact ? "bottom-2 left-2 right-2" : "bottom-6 left-6 right-6"}`}>
        {/* Mobile: single compact row */}
        <div className="flex items-center justify-center gap-4 rounded-lg border border-white/[0.04] bg-[#0a0c14]/80 backdrop-blur-sm px-3 py-1.5 font-mono text-[8px] text-[#666] lg:hidden">
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#F03E17]" />Conflict</span>
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#ffb020]" />Capital</span>
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#9B7FD4]" />Intel</span>
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#4CAF7D]" />Supply</span>
        </div>
        {/* Desktop: two legend boxes */}
        <div className="hidden lg:flex lg:justify-between">
          <div className="rounded-xl border border-white/[0.06] bg-[#0a0c14]/80 backdrop-blur-sm space-y-1.5 font-mono text-[10px] px-3 py-2">
            <div className="uppercase tracking-[0.2em] text-[#555] mb-1 text-[8px]">Signal Map</div>
            <div className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#F03E17] shadow-[0_0_4px_#F03E17]" /><span className="text-[#777]">Conflict</span></div>
            <div className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#ffb020] shadow-[0_0_4px_#ffb020]" /><span className="text-[#777]">Capital</span></div>
            <div className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#9B7FD4] shadow-[0_0_4px_#9B7FD4]" /><span className="text-[#777]">Intelligence</span></div>
            <div className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#4CAF7D] shadow-[0_0_4px_#4CAF7D]" /><span className="text-[#777]">Supply chain</span></div>
          </div>
        </div>
      </div>

      {/* Interaction hint */}
      {ready && (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 z-10 font-mono text-[9px] text-[#444] pb-1 hidden lg:block">
          drag to rotate &middot; scroll to zoom
        </div>
      )}
      {ready && (
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 z-10 font-mono text-[9px] text-[#444] lg:hidden">
          tap a signal to explore
        </div>
      )}

    </div>
  );
}
