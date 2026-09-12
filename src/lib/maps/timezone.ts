import "server-only";
import { z } from "zod";
import { cached } from "./server-cache";
export async function lookupTimezone(latitude: number, longitude: number) {
  const key = process.env.GOOGLE_MAPS_SERVER_API_KEY;
  if (!key) throw new Error("MAPS_UNCONFIGURED");
  return cached(`timezone:${latitude}:${longitude}`, 86400000, async () => {
    const url = new URL("https://maps.googleapis.com/maps/api/timezone/json");
    url.searchParams.set("location", `${latitude},${longitude}`);
    url.searchParams.set("timestamp", String(Math.floor(Date.now() / 1000)));
    url.searchParams.set("key", key);
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error("TIMEZONE_UNAVAILABLE");
    const data = z
      .object({ status: z.literal("OK"), timeZoneId: z.string() })
      .parse(await res.json());
    new Intl.DateTimeFormat("en", { timeZone: data.timeZoneId }).format();
    return data.timeZoneId;
  });
}
