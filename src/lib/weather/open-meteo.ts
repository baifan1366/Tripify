import { assessRisk, type WeatherDay } from "@/lib/weather/risk";

export type TripForecast = {
  place: string | null;
  days: WeatherDay[];
};

const geoCache = new Map<string, { lat: number; lng: number; name: string }>();

function cacheSet<K, V>(cache: Map<K, V>, key: K, value: V, max = 100) {
  if (cache.size >= max) {
    const oldest = cache.keys().next();
    if (!oldest.done) cache.delete(oldest.value);
  }
  cache.set(key, value);
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`WEATHER_UPSTREAM_${response.status}`);
  return response.json();
}

/** Resolves a destination string to coordinates via Open-Meteo geocoding (no key). */
export async function geocodeDestination(
  destination: string,
): Promise<{ lat: number; lng: number; name: string } | null> {
  const key = destination.trim().toLowerCase();
  if (!key) return null;
  const cached = geoCache.get(key);
  if (cached) return cached;
  try {
    const data = (await fetchJson(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(destination.trim())}&count=1&language=en&format=json`,
    )) as { results?: { latitude: number; longitude: number; name: string }[] };
    const first = data.results?.[0];
    if (!first) return null;
    const result = { lat: first.latitude, lng: first.longitude, name: first.name };
    cacheSet(geoCache, key, result);
    return result;
  } catch {
    return null;
  }
}

function isoAfter(start: string, offsetDays: number): string {
  const date = new Date(`${start}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

/**
 * Daily forecast for a trip window (server-side only).
 * Open-Meteo covers ~16 days ahead; the window is clamped, never invented.
 */
export async function fetchTripForecast(
  destination: string,
  startDate: string,
  endDate: string,
): Promise<TripForecast> {
  const geo = await geocodeDestination(destination);
  if (!geo) return { place: null, days: [] };
  const start = isoAfter(startDate, 0);
  // Clamp to the 16-day forecast horizon.
  const end = isoAfter(startDate, Math.min(daySpan(startDate, endDate), 15));
  try {
    const data = (await fetchJson(
      `https://api.open-meteo.com/v1/forecast?latitude=${geo.lat}&longitude=${geo.lng}` +
        `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,windspeed_10m_max,weathercode` +
        `&timezone=auto&start_date=${start}&end_date=${end}`,
    )) as {
      daily?: {
        time?: string[];
        temperature_2m_max?: (number | null)[];
        temperature_2m_min?: (number | null)[];
        precipitation_probability_max?: (number | null)[];
        windspeed_10m_max?: (number | null)[];
        weathercode?: (number | null)[];
      };
    };
    const daily = data.daily;
    if (!daily?.time?.length) return { place: geo.name, days: [] };
    const days: WeatherDay[] = daily.time.map((date, i) => {
      const tmax = daily.temperature_2m_max?.[i] ?? null;
      const tmin = daily.temperature_2m_min?.[i] ?? null;
      const precip = daily.precipitation_probability_max?.[i] ?? null;
      const wind = daily.windspeed_10m_max?.[i] ?? null;
      const code = daily.weathercode?.[i] ?? null;
      return {
        date,
        tmaxC: tmax,
        tminC: tmin,
        precipProbPct: precip,
        windKmh: wind,
        code,
        risk: assessRisk(precip, wind, code),
        summary: summarize(tmax, tmin, precip, wind),
      };
    });
    return { place: geo.name, days };
  } catch {
    return { place: geo.name, days: [] };
  }
}

function daySpan(start: string, end: string): number {
  const span = Math.round(
    (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000,
  );
  return Number.isFinite(span) && span >= 0 ? span : 0;
}

function summarize(
  tmax: number | null,
  tmin: number | null,
  precip: number | null,
  wind: number | null,
): string {
  const parts: string[] = [];
  if (tmin != null && tmax != null) parts.push(`${Math.round(tmin)}–${Math.round(tmax)}°C`);
  else if (tmax != null) parts.push(`${Math.round(tmax)}°C`);
  if (precip != null) parts.push(`${precip}% rain`);
  if (wind != null) parts.push(`${Math.round(wind)} km/h wind`);
  return parts.join(" · ") || "No data";
}
