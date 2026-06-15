import { getAllClubTypes } from "../shared/clubTypes.js";

const GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json";
const PLACES_API_BASE = "https://places.googleapis.com/v1";

export function getGooglePlacesApiKey(): string {
  const key = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY || "";
  if (!key) throw new Error("GOOGLE_PLACES_API_KEY (or GOOGLE_MAPS_API_KEY) is not set");
  return key;
}

function normalizePlaceId(placeId: string): string {
  return placeId.replace(/^places\//, "");
}

async function placesApiFetch<T>(
  path: string,
  fieldMask: string,
  init?: { method?: string; body?: unknown },
): Promise<T> {
  const key = getGooglePlacesApiKey();
  const res = await fetch(`${PLACES_API_BASE}/${path}`, {
    method: init?.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": fieldMask,
    },
    body: init?.body != null ? JSON.stringify(init.body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Places API failed (${res.status}): ${text}`);
  }
  return JSON.parse(text) as T;
}

export type GeocodeResult = {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
  formattedAddress?: string;
};

export type PlaceSearchResult = {
  placeId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  types: string[];
  rating?: number;
};

export type PlaceDetails = PlaceSearchResult & {
  phone?: string;
  website?: string;
  openingHours?: Record<string, { open: string; close: string; closed: boolean }>;
  city?: string;
  country?: string;
};

const SPORT_KEYWORDS: { terms: string[]; clubType: string; extra?: string[] }[] = [
  { terms: ["karate", "كاراتيه"], clubType: "karate" },
  { terms: ["taekwondo", "tae kwon do", "تايكوندو"], clubType: "taekwondo" },
  { terms: ["judo", "جودو"], clubType: "judo" },
  { terms: ["jiu jitsu", "bjj", "brazilian jiu"], clubType: "bjj" },
  { terms: ["muay thai", "kickboxing", "مواي"], clubType: "muay_thai" },
  { terms: ["boxing", "ملاكمة"], clubType: "boxing" },
  { terms: ["mma", "mixed martial"], clubType: "mma" },
  { terms: ["kung fu", "kungfu", "كونغ"], clubType: "kung_fu" },
  { terms: ["aikido"], clubType: "aikido" },
  { terms: ["wrestling", "مصارعة"], clubType: "wrestling" },
  { terms: ["football", "soccer academy", "كرة القدم"], clubType: "football" },
  { terms: ["basketball", "كرة السلة"], clubType: "basketball" },
  { terms: ["swimming", "swim academy", "سباحة"], clubType: "swimming" },
  { terms: ["tennis", "تنس"], clubType: "tennis" },
  { terms: ["volleyball", "كرة الطائرة"], clubType: "volleyball" },
  { terms: ["gymnastics", "جمباز"], clubType: "gymnastics" },
  { terms: ["crossfit"], clubType: "crossfit" },
  { terms: ["fitness", "gym", "نادي رياضي"], clubType: "general_gym" },
  { terms: ["yoga", "pilates"], clubType: "hybrid" },
  { terms: ["climbing", "boulder"], clubType: "climbing" },
  { terms: ["parkour"], clubType: "parkour" },
  { terms: ["weightlifting", "رفع أثقال"], clubType: "weightlifting" },
];

function parseAddressComponents(
  components: Array<{
    long_name?: string;
    short_name?: string;
    longText?: string;
    shortText?: string;
    types?: string[];
  }> | undefined | null,
) {
  let city: string | undefined;
  let country: string | undefined;
  for (const c of components ?? []) {
    const types = c.types ?? [];
    const long = c.longText ?? c.long_name;
    const short = c.shortText ?? c.short_name;
    if (types.includes("locality")) city = long;
    else if (!city && types.includes("administrative_area_level_1")) city = long;
    if (types.includes("country")) country = short;
  }
  return { city, country };
}

function formatPeriodTime(part: { time?: string; hour?: number; minute?: number }) {
  if (part.time) return `${part.time.slice(0, 2)}:${part.time.slice(2, 4)}`;
  if (part.hour != null) {
    return `${String(part.hour).padStart(2, "0")}:${String(part.minute ?? 0).padStart(2, "0")}`;
  }
  return "00:00";
}

function weekdayIndexToKey(day: number): string {
  const keys = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  return keys[day] ?? "monday";
}

function parseOpeningHours(
  periods?: Array<{ open: { day: number; time?: string; hour?: number; minute?: number }; close?: { day: number; time?: string; hour?: number; minute?: number } }>,
) {
  if (!periods?.length) return undefined;
  const hours: Record<string, { open: string; close: string; closed: boolean }> = {};
  for (const key of ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]) {
    hours[key] = { open: "08:00", close: "22:00", closed: true };
  }
  for (const p of periods) {
    if (!p.open || p.open.day == null) continue;
    const key = weekdayIndexToKey(p.open.day);
    if (!p.close) {
      hours[key] = { open: "00:00", close: "23:59", closed: false };
      continue;
    }
    const open = formatPeriodTime(p.open);
    const close = formatPeriodTime(p.close);
    hours[key] = { open, close, closed: false };
  }
  return hours;
}

type NewPlaceRow = {
  id?: string;
  name?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  types?: string[];
  rating?: number;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  regularOpeningHours?: {
    periods?: Array<{
      open: { day: number; time?: string; hour?: number; minute?: number };
      close?: { day: number; time?: string; hour?: number; minute?: number };
    }>;
  };
  addressComponents?: Array<{
    longText?: string;
    shortText?: string;
    types?: string[];
  }>;
};

function mapNewPlace(row: NewPlaceRow): PlaceSearchResult | null {
  const placeId = normalizePlaceId(row.id || row.name || "");
  if (!placeId) return null;
  const name = row.displayName?.text || "Unknown";
  const lat = row.location?.latitude;
  const lng = row.location?.longitude;
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    placeId,
    name,
    address: row.formattedAddress || "",
    latitude: lat,
    longitude: lng,
    types: row.types ?? [],
    rating: row.rating,
  };
}

export function inferClubTypes(name: string, types: string[] = [], searchClubType?: string): string[] {
  const hay = `${name} ${types.join(" ")}`.toLowerCase();
  const found = new Set<string>();
  if (searchClubType) found.add(searchClubType);
  for (const row of SPORT_KEYWORDS) {
    if (row.terms.some((t) => hay.includes(t.toLowerCase()))) {
      found.add(row.clubType);
      row.extra?.forEach((e) => found.add(e));
    }
  }
  if (types.includes("gym") || types.includes("health")) found.add("general_gym");
  if (types.includes("stadium")) found.add("football");
  if (!found.size) found.add(searchClubType || "hybrid");
  return Array.from(found);
}

export async function geocodeAddress(address: string, region?: string): Promise<GeocodeResult | null> {
  const key = getGooglePlacesApiKey();
  const params = new URLSearchParams({ address, key });
  if (region) params.set("region", region.toLowerCase());
  const res = await fetch(`${GEOCODE_URL}?${params}`);
  const data = (await res.json()) as {
    status: string;
    results?: Array<{
      formatted_address: string;
      geometry: { location: { lat: number; lng: number } };
      address_components: Array<{ long_name: string; short_name: string; types: string[] }>;
    }>;
  };
  if (data.status !== "OK" || !data.results?.[0]) return null;
  const r = data.results[0];
  const { city, country } = parseAddressComponents(r.address_components);
  return {
    latitude: r.geometry.location.lat,
    longitude: r.geometry.location.lng,
    city,
    country,
    formattedAddress: r.formatted_address,
  };
}

export async function textSearchPlaces(
  query: string,
  opts?: { pagetoken?: string; region?: string },
): Promise<{ results: PlaceSearchResult[]; nextPageToken?: string }> {
  const body: Record<string, unknown> = {
    textQuery: query,
    pageSize: 20,
  };
  if (opts?.region) body.regionCode = opts.region.toUpperCase();
  if (opts?.pagetoken) body.pageToken = opts.pagetoken;

  const data = await placesApiFetch<{
    places?: NewPlaceRow[];
    nextPageToken?: string;
  }>("places:searchText", "places.id,places.displayName,places.formattedAddress,places.location,places.types,places.rating,nextPageToken", {
    method: "POST",
    body,
  });

  const results = (data.places ?? []).map(mapNewPlace).filter((p): p is PlaceSearchResult => p != null);
  return { results, nextPageToken: data.nextPageToken };
}

export async function getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  const id = normalizePlaceId(placeId);
  if (!id) return null;

  const r = await placesApiFetch<NewPlaceRow>(
    `places/${encodeURIComponent(id)}`,
    "id,displayName,formattedAddress,location,types,rating,nationalPhoneNumber,websiteUri,regularOpeningHours,addressComponents",
  );

  if (!r.id && !r.name) return null;
  const base = mapNewPlace(r);
  if (!base) return null;
  const { city, country } = parseAddressComponents(r.addressComponents);
  return {
    ...base,
    phone: r.nationalPhoneNumber,
    website: r.websiteUri,
    openingHours: parseOpeningHours(r.regularOpeningHours?.periods),
    city,
    country,
    rating: r.rating,
  };
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const GCC_IMPORT_REGIONS = [
  {
    country: "BH",
    countryName: "Bahrain",
    cities: ["Manama", "Muharraq", "Riffa", "Saar", "Isa Town", "Hamad Town", "Juffair", "Adliya"],
  },
  {
    country: "SA",
    countryName: "Saudi Arabia",
    cities: ["Riyadh", "Jeddah", "Dammam", "Khobar", "Mecca", "Medina", "Abha", "Tabuk", "Taif"],
  },
  {
    country: "QA",
    countryName: "Qatar",
    cities: ["Doha", "Al Wakrah", "Al Khor", "Lusail", "Al Rayyan"],
  },
  {
    country: "OM",
    countryName: "Oman",
    cities: ["Muscat", "Salalah", "Sohar", "Nizwa", "Sur"],
  },
  {
    country: "KW",
    countryName: "Kuwait",
    cities: ["Kuwait City", "Hawalli", "Salmiya", "Farwaniya", "Ahmadi"],
  },
] as const;

export const PLACE_SEARCH_QUERIES = getAllClubTypes()
  .filter((t) => t.id !== "hybrid")
  .flatMap((t) => {
    const label = t.nameEn.toLowerCase();
    return [
      { clubType: t.id, query: `${label} club` },
      { clubType: t.id, query: `${label} academy` },
      { clubType: t.id, query: `${label} gym` },
    ];
  });

export const CLUB_TYPE_COLORS: Record<string, string> = {
  karate: "#dc2626",
  taekwondo: "#1d4ed8",
  judo: "#334155",
  bjj: "#1e40af",
  muay_thai: "#92400e",
  boxing: "#450a0a",
  mma: "#7f1d1d",
  football: "#16a34a",
  swimming: "#0284c7",
  general_gym: "#004aad",
  crossfit: "#ea580c",
  hybrid: "#6366f1",
};
