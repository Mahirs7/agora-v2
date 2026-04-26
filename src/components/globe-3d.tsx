"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  COUNTRY_BY_ISO2,
  getCountryInfo,
  iso2FromNumeric,
} from "@/lib/country-codes";
import { severityColor, severityLabel, type Signal } from "@/lib/kosmos-data";

/* ═════════════════════════════════════════════════════════════════════════
   Types
   ═════════════════════════════════════════════════════════════════════════ */

type CountryFeature = {
  type: string;
  id?: string;
  properties: { name?: string };
  geometry: { type: string; coordinates: unknown };
};

type CountryAggregate = {
  iso2: string;
  numeric: string;
  name: string;
  lat: number;
  lng: number;
  signals: Signal[];
  maxSeverity: number;
};

type MarkerDatum = {
  iso2: string;
  numeric: string;
  name: string;
  lat: number;
  lng: number;
  severity: number;
  signalCount: number;
  topSignalId: string;
  topSignalTitle: string;
};

type TooltipInfo = {
  x: number;
  y: number;
  agg: CountryAggregate;
};

const WORLD_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

/* ═════════════════════════════════════════════════════════════════════════
   Color helpers (no blue)
   ═════════════════════════════════════════════════════════════════════════ */

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = Number.parseInt(h.substring(0, 2), 16);
  const g = Number.parseInt(h.substring(2, 4), 16);
  const b = Number.parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function fillForSeverity(severity: number): string {
  // alpha curve so even routine signals are visible without overpowering
  const alpha = 0.18 + Math.min(1, severity) * 0.55;
  return hexToRgba(severityColor(severity), alpha);
}

const POLYGON_DEFAULT_FILL = "rgba(8, 10, 16, 0.95)";
const POLYGON_SIDE_FILL = "rgba(15, 18, 25, 0.5)";
const POLYGON_STROKE = "rgba(35, 40, 52, 0.35)";

/* ═════════════════════════════════════════════════════════════════════════
   Aggregate signals → countries
   ═════════════════════════════════════════════════════════════════════════ */

function aggregateByCountry(signals: Signal[]): Map<string, CountryAggregate> {
  const map = new Map<string, CountryAggregate>();

  for (const s of signals) {
    if (!s.geo_tags || s.geo_tags.length === 0) continue;
    const seen = new Set<string>();
    for (const tag of s.geo_tags) {
      const iso = (tag.country ?? "").toUpperCase();
      if (!iso || seen.has(iso)) continue;
      seen.add(iso);
      const info = getCountryInfo(iso);
      if (!info) continue; // skip countries we don't have centroids for
      let agg = map.get(iso);
      if (!agg) {
        agg = {
          iso2: iso,
          numeric: info.numeric,
          name: tag.name || iso,
          lat: info.lat,
          lng: info.lng,
          signals: [],
          maxSeverity: 0,
        };
        map.set(iso, agg);
      }
      agg.signals.push(s);
      if (s.severity > agg.maxSeverity) agg.maxSeverity = s.severity;
    }
  }

  // Sort each country's signals by severity desc
  for (const agg of map.values()) {
    agg.signals.sort((a, b) => (b.severity ?? 0) - (a.severity ?? 0));
  }

  return map;
}

/* ═════════════════════════════════════════════════════════════════════════
   Tooltip (rendered in React overlay)
   ═════════════════════════════════════════════════════════════════════════ */

function GlobeTooltip({ info }: { info: TooltipInfo }) {
  const { agg } = info;
  const c = severityColor(agg.maxSeverity);
  const top = agg.signals[0];

  return (
    <div
      className="pointer-events-none fixed z-[100] w-[300px]"
      style={{ left: info.x + 16, top: info.y - 8, transform: "translateY(-50%)" }}
    >
      <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a0c14]/95 shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-3.5 py-2.5">
          <div className="flex items-center gap-2">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: c, boxShadow: `0 0 6px ${c}` }}
            />
            <span
              className="font-mono text-[9px] uppercase tracking-[0.18em]"
              style={{ color: c }}
            >
              {severityLabel(agg.maxSeverity)}
            </span>
          </div>
          <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#555]">
            {agg.iso2}
          </span>
        </div>

        <div className="border-b border-white/[0.04] px-3.5 py-2">
          <div className="font-sans text-[13px] font-medium text-[#EAE8E3]">
            {agg.name}
          </div>
          <div className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-[#555]">
            {agg.signals.length}{" "}
            {agg.signals.length === 1 ? "active signal" : "active signals"}
          </div>
        </div>

        <div className="space-y-2 px-3.5 py-2.5">
          {agg.signals.slice(0, 3).map((s) => {
            const sc = severityColor(s.severity);
            return (
              <div key={s.id} className="flex items-start gap-2">
                <span
                  className="mt-0.5 shrink-0 rounded-sm px-1 py-0.5 font-mono text-[8px] font-bold"
                  style={{
                    backgroundColor: hexToRgba(sc, 0.15),
                    color: sc,
                  }}
                >
                  {(s.severity * 10).toFixed(1)}
                </span>
                <span className="line-clamp-2 font-sans text-[11px] leading-tight text-[#999]">
                  {s.title}
                </span>
              </div>
            );
          })}
          {agg.signals.length > 3 && (
            <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#555]">
              + {agg.signals.length - 3} more
            </div>
          )}
        </div>

        {top && (
          <div className="border-t border-white/[0.04] px-3.5 py-2 font-mono text-[9px] uppercase tracking-[0.18em] text-[#666]">
            Click to open top signal
          </div>
        )}
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════════
   Component
   ═════════════════════════════════════════════════════════════════════════ */

export default function Globe3D({
  compact = false,
  signals = [],
  onSignalSelect,
  onCountrySelect,
}: {
  compact?: boolean;
  signals?: Signal[];
  onSignalSelect?: (id: string) => void;
  onCountrySelect?: (iso2: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeElRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);
  const [mobileCard, setMobileCard] = useState<TooltipInfo | null>(null);
  const [cardVisible, setCardVisible] = useState(false);
  const cardDataRef = useRef<TooltipInfo | null>(null);
  const cardTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globeRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controlsRef = useRef<any>(null);
  const interactTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const hoveredRef = useRef<MarkerDatum | null>(null);
  const aggMapRef = useRef<Map<string, CountryAggregate>>(new Map());
  const mousePos = useRef({ x: 0, y: 0 });
  const onSignalSelectRef = useRef(onSignalSelect);
  const onCountrySelectRef = useRef(onCountrySelect);

  useEffect(() => {
    onSignalSelectRef.current = onSignalSelect;
  }, [onSignalSelect]);

  useEffect(() => {
    onCountrySelectRef.current = onCountrySelect;
  }, [onCountrySelect]);

  /* Aggregate signals → per-country */
  const aggregates = useMemo(() => aggregateByCountry(signals), [signals]);
  const markers: MarkerDatum[] = useMemo(() => {
    const out: MarkerDatum[] = [];
    aggMapRef.current = aggregates;
    for (const agg of aggregates.values()) {
      const top = agg.signals[0];
      if (!top) continue;
      out.push({
        iso2: agg.iso2,
        numeric: agg.numeric,
        name: agg.name,
        lat: agg.lat,
        lng: agg.lng,
        severity: agg.maxSeverity,
        signalCount: agg.signals.length,
        topSignalId: top.id,
        topSignalTitle: top.title,
      });
    }
    return out;
  }, [aggregates]);

  /* Polygon fill lookup keyed by ISO numeric (TopoJSON `id` field) */
  const polygonFillByNumeric = useMemo(() => {
    const map = new Map<string, string>();
    for (const agg of aggregates.values()) {
      map.set(agg.numeric, fillForSeverity(agg.maxSeverity));
    }
    return map;
  }, [aggregates]);
  const polygonFillRef = useRef(polygonFillByNumeric);
  useEffect(() => {
    polygonFillRef.current = polygonFillByNumeric;
  }, [polygonFillByNumeric]);

  /* Top-3 most severe countries get pulse rings */
  const ringData = useMemo(
    () =>
      [...aggregates.values()]
        .sort((a, b) => b.maxSeverity - a.maxSeverity)
        .slice(0, 3)
        .map((agg) => ({
          lat: agg.lat,
          lng: agg.lng,
          maxR: 4 + agg.maxSeverity * 2,
          propagationSpeed: 1.4 + agg.maxSeverity,
          repeatPeriod: 2400 - Math.round(agg.maxSeverity * 800),
          color: severityColor(agg.maxSeverity),
        })),
    [aggregates],
  );

  /* Mobile card open/close */
  const openMobileCard = useCallback((info: TooltipInfo) => {
    clearTimeout(cardTimerRef.current);
    cardDataRef.current = info;
    setMobileCard(info);
    requestAnimationFrame(() => setCardVisible(true));
  }, []);
  const closeMobileCard = useCallback(() => {
    setCardVisible(false);
    clearTimeout(cardTimerRef.current);
    cardTimerRef.current = setTimeout(() => {
      setMobileCard(null);
      cardDataRef.current = null;
    }, 280);
    if (controlsRef.current) controlsRef.current.autoRotate = true;
  }, []);

  /* Mouse tracking for tooltip positioning */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
      const m = hoveredRef.current;
      if (m) {
        const agg = aggMapRef.current.get(m.iso2);
        if (agg)
          setTooltip({
            x: e.clientX,
            y: e.clientY,
            agg,
          });
      }
    };
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, []);

  /* Marker hover */
  const handlePointHover = useCallback((point: object | null) => {
    if (!point) {
      hoveredRef.current = null;
      setTooltip(null);
      clearTimeout(interactTimeoutRef.current);
      interactTimeoutRef.current = setTimeout(() => {
        if (controlsRef.current) controlsRef.current.autoRotate = true;
      }, 2000);
      return;
    }
    clearTimeout(interactTimeoutRef.current);
    if (controlsRef.current) controlsRef.current.autoRotate = false;
    const m = point as MarkerDatum;
    hoveredRef.current = m;
    const agg = aggMapRef.current.get(m.iso2);
    if (agg)
      setTooltip({
        x: mousePos.current.x,
        y: mousePos.current.y,
        agg,
      });
  }, []);

  /* Marker click */
  const handlePointClick = useCallback(
    (point: object | null) => {
      if (!point) return;
      const m = point as MarkerDatum;
      if (window.matchMedia("(max-width: 1024px)").matches) {
        const agg = aggMapRef.current.get(m.iso2);
        if (agg)
          openMobileCard({
            x: 0,
            y: 0,
            agg,
          });
        if (controlsRef.current) controlsRef.current.autoRotate = false;
        return;
      }
      onSignalSelectRef.current?.(m.topSignalId);
    },
    [openMobileCard],
  );

  /* Initialize globe (once) */
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
        worldTopo.objects.countries,
      ) as unknown as { features: CountryFeature[] };

      if (cancelled || !globeElRef.current) return;

      const mat = new THREE.MeshBasicMaterial();
      mat.color = new THREE.Color("#080a10");

      const globe = new GlobeClass(globeElRef.current)
        .width(size)
        .height(size)
        .backgroundColor("rgba(0,0,0,0)")
        .globeMaterial(mat)
        .atmosphereColor("rgba(40, 40, 40, 0.25)")
        .atmosphereAltitude(0.15)
        .showGraticules(false)
        // Country polygons
        .polygonsData(countries.features)
        .polygonCapColor((feat: object) => {
          const f = feat as CountryFeature;
          const id = String(f.id ?? "");
          return polygonFillRef.current.get(id) || POLYGON_DEFAULT_FILL;
        })
        .polygonSideColor(() => POLYGON_SIDE_FILL)
        .polygonStrokeColor(() => POLYGON_STROKE)
        .polygonAltitude((feat: object) => {
          const f = feat as CountryFeature;
          const id = String(f.id ?? "");
          return polygonFillRef.current.has(id) ? 0.008 : 0.002;
        })
        .onPolygonClick((feat: object) => {
          const f = feat as CountryFeature;
          const numeric = String(f.id ?? "");
          // Only allow clicks on countries with active signals — others are dead.
          if (!polygonFillRef.current.has(numeric)) return;
          const iso2 = iso2FromNumeric(numeric);
          if (iso2) onCountrySelectRef.current?.(iso2);
        })
        // Signal markers
        .pointsData(markers)
        .pointLat("lat")
        .pointLng("lng")
        .pointAltitude(0.012)
        .pointRadius((d: object) => {
          const m = d as MarkerDatum;
          return 0.6 + m.severity * 1.4;
        })
        .pointColor((d: object) => severityColor((d as MarkerDatum).severity))
        .pointsMerge(false)
        .onPointHover(handlePointHover)
        .onPointClick(handlePointClick)
        // Pulse rings for top-severity countries
        .ringsData(ringData)
        .ringLat("lat")
        .ringLng("lng")
        .ringMaxRadius("maxR")
        .ringPropagationSpeed("propagationSpeed")
        .ringRepeatPeriod("repeatPeriod")
        .ringColor(
          (d: object) => (t: number) =>
            hexToRgba((d as { color: string }).color, (1 - t) * 0.5),
        );

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

      // Resize
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const w = entry.contentRect.width;
          if (w > 0) globe.width(w).height(w);
        }
      });
      if (globeElRef.current?.parentElement) {
        ro.observe(globeElRef.current.parentElement);
      }

      globeRef.current = globe;
      setReady(true);

      return () => {
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
    // We intentionally only init once. Updates flow via the next effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Push prop changes (markers/rings/polygons) into existing globe */
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;
    globe.pointsData(markers);
    globe.ringsData(ringData);
    // Re-render polygons by rebinding (forces polygonCapColor re-eval)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (globe as any).polygonsData?.();
    if (data) globe.polygonsData([...data]);
  }, [markers, ringData, polygonFillByNumeric]);

  /* ═══ Render ═══ */
  return (
    <div ref={containerRef} className={`relative mx-auto w-full ${compact ? "" : "max-w-4xl"}`}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 50% 50% at 50% 48%, rgba(240,62,23,0.035) 0%, rgba(8,10,16,0.2) 40%, transparent 65%)",
        }}
      />

      <div
        className={`relative w-full ${compact ? "aspect-square max-h-[calc(100vh-10rem)]" : "aspect-square"}`}
        style={compact ? { maxWidth: "calc(100vh - 10rem)" } : undefined}
      >
        <div
          ref={globeElRef}
          className="h-full w-full cursor-grab active:cursor-grabbing"
          style={{ opacity: ready ? 1 : 0, transition: "opacity 1.2s ease" }}
        />
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-48 w-48 animate-pulse rounded-full border border-white/[0.04] bg-[#080a10]" />
          </div>
        )}

        <div className="hidden lg:block">
          {tooltip && <GlobeTooltip info={tooltip} />}
        </div>
      </div>

      {/* Mobile signal card */}
      {mobileCard &&
        (() => {
          const data = cardDataRef.current ?? mobileCard;
          const c = severityColor(data.agg.maxSeverity);
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
                className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a0c14] shadow-[0_20px_60px_rgba(0,0,0,0.8)]"
                style={{
                  opacity: cardVisible ? 1 : 0,
                  transform: cardVisible
                    ? "translateY(0) scale(1)"
                    : "translateY(20px) scale(0.97)",
                  transition:
                    "opacity 280ms cubic-bezier(0.16, 1, 0.3, 1), transform 280ms cubic-bezier(0.16, 1, 0.3, 1)",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: c, boxShadow: `0 0 8px ${c}` }}
                    />
                    <span
                      className="font-mono text-[10px] uppercase tracking-[0.15em]"
                      style={{ color: c }}
                    >
                      {severityLabel(data.agg.maxSeverity)}
                    </span>
                  </div>
                  <button
                    onClick={closeMobileCard}
                    className="p-1 text-[#555]"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="border-b border-white/[0.04] px-5 py-3">
                  <div className="font-sans text-[17px] font-medium text-[#EAE8E3]">
                    {data.agg.name}
                  </div>
                  <div className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-[#555]">
                    {data.agg.signals.length} active signals
                  </div>
                </div>
                <div className="space-y-3 px-5 py-4">
                  {data.agg.signals.slice(0, 5).map((s) => {
                    const sc = severityColor(s.severity);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          onSignalSelectRef.current?.(s.id);
                          closeMobileCard();
                        }}
                        className="flex w-full items-start gap-3 text-left"
                      >
                        <span
                          className="mt-0.5 shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] font-bold"
                          style={{
                            backgroundColor: hexToRgba(sc, 0.15),
                            color: sc,
                          }}
                        >
                          {(s.severity * 10).toFixed(1)}
                        </span>
                        <span className="font-sans text-[13px] leading-snug text-[#999]">
                          {s.title}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}

      {/* Legend — severity gradient */}
      <div
        className={`absolute z-10 ${compact ? "bottom-2 left-2 right-2" : "bottom-6 left-6 right-6"}`}
      >
        <div className="flex items-center justify-center gap-3 rounded-lg border border-white/[0.04] bg-[#0a0c14]/80 px-3 py-1.5 font-mono text-[8px] uppercase tracking-[0.18em] text-[#666] backdrop-blur-sm lg:gap-4">
          <span className="text-[#555]">severity</span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#F03E17]" />
            critical
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#F07C00]" />
            high
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#D9A441]" />
            elevated
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#8a8a86]" />
            routine
          </span>
        </div>
      </div>

      {ready && (
        <>
          <div className="absolute bottom-0 left-1/2 hidden -translate-x-1/2 pb-1 font-mono text-[9px] text-[#444] lg:block">
            drag to rotate · scroll to zoom · click country for region · click marker for top signal
          </div>
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 font-mono text-[9px] text-[#444] lg:hidden">
            tap a signal to explore
          </div>
        </>
      )}

      {/* Empty state */}
      {ready && markers.length === 0 && (
        <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-md border border-white/[0.06] bg-[#0a0c14]/80 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[#666] backdrop-blur-sm">
          No geo-tagged signals yet
        </div>
      )}

      {/* Coverage hint when we drop signals due to missing centroids */}
      <CoverageHint
        signals={signals}
        plotted={markers.length}
        knownCount={Object.keys(COUNTRY_BY_ISO2).length}
      />
    </div>
  );
}

function CoverageHint({
  signals,
  plotted,
  knownCount,
}: {
  signals: Signal[];
  plotted: number;
  knownCount: number;
}) {
  const totalGeoTagged = useMemo(
    () => signals.filter((s) => (s.geo_tags?.length ?? 0) > 0).length,
    [signals],
  );
  const missing = totalGeoTagged - plotted;
  if (!signals.length || missing <= 0) return null;
  return (
    <div className="absolute right-3 top-3 hidden rounded-md border border-white/[0.06] bg-[#0a0c14]/80 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.18em] text-[#555] backdrop-blur-sm lg:block">
      {plotted}/{totalGeoTagged} plotted · {knownCount} countries indexed
    </div>
  );
}
