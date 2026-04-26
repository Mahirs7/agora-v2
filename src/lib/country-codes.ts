/**
 * ISO-2 → ISO 3166-1 numeric (for matching world-atlas TopoJSON `id` field)
 * + approximate country centroid (lat, lng) for plotting markers.
 *
 * Coverage focuses on countries that commonly appear in /api/globe/activity
 * and signal geo_tags. Easy to extend.
 */

export type CountryInfo = {
  numeric: string;
  lat: number;
  lng: number;
};

export const COUNTRY_BY_ISO2: Record<string, CountryInfo> = {
  US: { numeric: "840", lat: 39.8, lng: -98.6 },
  CA: { numeric: "124", lat: 56.1, lng: -106.3 },
  MX: { numeric: "484", lat: 23.6, lng: -102.6 },
  BR: { numeric: "076", lat: -14.2, lng: -51.9 },
  AR: { numeric: "032", lat: -38.4, lng: -63.6 },
  CL: { numeric: "152", lat: -35.7, lng: -71.5 },
  CO: { numeric: "170", lat: 4.6, lng: -74.3 },
  PE: { numeric: "604", lat: -9.2, lng: -75.0 },
  VE: { numeric: "862", lat: 6.4, lng: -66.6 },

  GB: { numeric: "826", lat: 55.4, lng: -3.4 },
  IE: { numeric: "372", lat: 53.4, lng: -8.2 },
  FR: { numeric: "250", lat: 46.2, lng: 2.2 },
  DE: { numeric: "276", lat: 51.2, lng: 10.5 },
  IT: { numeric: "380", lat: 41.9, lng: 12.6 },
  ES: { numeric: "724", lat: 40.5, lng: -3.7 },
  PT: { numeric: "620", lat: 39.4, lng: -8.2 },
  NL: { numeric: "528", lat: 52.1, lng: 5.3 },
  BE: { numeric: "056", lat: 50.5, lng: 4.5 },
  CH: { numeric: "756", lat: 46.8, lng: 8.2 },
  AT: { numeric: "040", lat: 47.5, lng: 14.6 },
  SE: { numeric: "752", lat: 60.1, lng: 18.6 },
  NO: { numeric: "578", lat: 60.5, lng: 8.5 },
  FI: { numeric: "246", lat: 61.9, lng: 25.7 },
  DK: { numeric: "208", lat: 56.3, lng: 9.5 },
  PL: { numeric: "616", lat: 51.9, lng: 19.1 },
  CZ: { numeric: "203", lat: 49.8, lng: 15.5 },
  GR: { numeric: "300", lat: 39.1, lng: 21.8 },
  HU: { numeric: "348", lat: 47.2, lng: 19.5 },
  RO: { numeric: "642", lat: 45.9, lng: 24.9 },

  RU: { numeric: "643", lat: 61.5, lng: 105.3 },
  UA: { numeric: "804", lat: 48.4, lng: 31.2 },
  BY: { numeric: "112", lat: 53.7, lng: 27.9 },
  TR: { numeric: "792", lat: 38.9, lng: 35.2 },

  CN: { numeric: "156", lat: 35.9, lng: 104.2 },
  JP: { numeric: "392", lat: 36.2, lng: 138.3 },
  KR: { numeric: "410", lat: 35.9, lng: 127.8 },
  KP: { numeric: "408", lat: 40.3, lng: 127.5 },
  IN: { numeric: "356", lat: 20.6, lng: 78.9 },
  PK: { numeric: "586", lat: 30.4, lng: 69.3 },
  BD: { numeric: "050", lat: 23.7, lng: 90.4 },
  TH: { numeric: "764", lat: 15.9, lng: 100.99 },
  VN: { numeric: "704", lat: 14.1, lng: 108.3 },
  PH: { numeric: "608", lat: 12.9, lng: 121.8 },
  ID: { numeric: "360", lat: -0.8, lng: 113.9 },
  MY: { numeric: "458", lat: 4.2, lng: 101.98 },
  SG: { numeric: "702", lat: 1.35, lng: 103.8 },
  TW: { numeric: "158", lat: 23.7, lng: 121.0 },
  HK: { numeric: "344", lat: 22.3, lng: 114.2 },
  MM: { numeric: "104", lat: 21.9, lng: 95.96 },

  IR: { numeric: "364", lat: 32.4, lng: 53.7 },
  IQ: { numeric: "368", lat: 33.2, lng: 43.7 },
  SY: { numeric: "760", lat: 34.8, lng: 38.9 },
  LB: { numeric: "422", lat: 33.9, lng: 35.8 },
  IL: { numeric: "376", lat: 31.0, lng: 34.8 },
  PS: { numeric: "275", lat: 31.9, lng: 35.2 },
  JO: { numeric: "400", lat: 30.5, lng: 36.2 },
  SA: { numeric: "682", lat: 23.9, lng: 45.1 },
  AE: { numeric: "784", lat: 23.4, lng: 53.8 },
  QA: { numeric: "634", lat: 25.4, lng: 51.2 },
  KW: { numeric: "414", lat: 29.3, lng: 47.5 },
  YE: { numeric: "887", lat: 15.6, lng: 48.5 },
  AF: { numeric: "004", lat: 33.9, lng: 67.7 },

  EG: { numeric: "818", lat: 26.8, lng: 30.8 },
  LY: { numeric: "434", lat: 26.3, lng: 17.2 },
  TN: { numeric: "788", lat: 33.9, lng: 9.5 },
  DZ: { numeric: "012", lat: 28.0, lng: 1.7 },
  MA: { numeric: "504", lat: 31.8, lng: -7.1 },
  SD: { numeric: "729", lat: 12.9, lng: 30.2 },
  ET: { numeric: "231", lat: 9.1, lng: 40.5 },
  KE: { numeric: "404", lat: -0.0, lng: 37.9 },
  NG: { numeric: "566", lat: 9.1, lng: 8.7 },
  ZA: { numeric: "710", lat: -30.6, lng: 22.9 },
  GH: { numeric: "288", lat: 7.95, lng: -1.0 },

  AU: { numeric: "036", lat: -25.3, lng: 133.8 },
  NZ: { numeric: "554", lat: -40.9, lng: 174.9 },
};

export function getCountryInfo(iso2: string): CountryInfo | null {
  if (!iso2) return null;
  return COUNTRY_BY_ISO2[iso2.toUpperCase()] ?? null;
}

const ISO2_BY_NUMERIC: Record<string, string> = Object.fromEntries(
  Object.entries(COUNTRY_BY_ISO2).map(([iso2, info]) => [info.numeric, iso2]),
);

export function iso2FromNumeric(numeric: string): string | null {
  if (!numeric) return null;
  return ISO2_BY_NUMERIC[numeric] ?? null;
}
