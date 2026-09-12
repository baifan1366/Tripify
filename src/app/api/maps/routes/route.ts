import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { debugLog } from "@/lib/debug";
import { calculateRoute } from "@/lib/maps/routes";
import { withinQuota } from "@/lib/maps/server-cache";
export async function GET(request: Request) {
  const input = z.object({ trip: z.uuid(), day: z.coerce.number().int().min(1).max(60), mode: z.enum(["WALK", "DRIVE", "TRANSIT"]) }).safeParse(Object.fromEntries(new URL(request.url).searchParams));
  const reply = (body: object, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
  if (!input.success) return reply({ error: "INVALID_INPUT" }, 400);
  try {
    const client = await createClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return reply({ error: "UNAUTHENTICATED" }, 401);
    const trip = await client.from("trips").select("id,version").eq("id", input.data.trip).maybeSingle();
    if (trip.error) return reply({ error: "UNAVAILABLE" }, 503);
    if (!trip.data) return reply({ error: "FORBIDDEN" }, 403);
    if (!withinQuota(user.id)) return reply({ error: "RATE_LIMITED" }, 429);
    // Fail fast with a diagnosable code instead of silently empty segments.
    if (!process.env.GOOGLE_MAPS_SERVER_API_KEY) {
      console.error("[tripify:maps] routes: GOOGLE_MAPS_SERVER_API_KEY missing");
      return reply({ error: "MAPS_UNCONFIGURED" }, 503);
    }
    const activities = await client.from("trip_activities").select("id,latitude,longitude").eq("trip_id", input.data.trip).eq("day_number", input.data.day).order("start_time").order("id").limit(61);
    if (activities.error) return reply({ error: "UNAVAILABLE" }, 503);
    if (activities.data.length > 60) return reply({ error: "TOO_MANY_ACTIVITIES" }, 422);
    const withCoords = activities.data.filter((a) => a.latitude !== null && a.longitude !== null).length;
    debugLog("maps", "routes compute start", {
      trip: input.data.trip,
      day: input.data.day,
      mode: input.data.mode,
      activities: activities.data.length,
      withCoords,
    });
    // Overall deadline on top of per-segment timeouts: return what resolved
    // in time instead of holding the request open. The client renders
    // missing segments as "not calculated".
    const deadline = Date.now() + 20000;
    const segments = [];
    let partial = false;
    let skippedNoCoordinates = 0;
    for (let batch = 0; batch < activities.data.length - 1; batch += 4) {
      if (Date.now() > deadline) { partial = true; break; }
      const results = await Promise.all(activities.data.slice(batch, Math.min(batch + 4, activities.data.length - 1)).map(async (from, offset) => {
        const to = activities.data[batch + offset + 1];
        if ([from.latitude, from.longitude, to.latitude, to.longitude].some((v) => v === null)) { skippedNoCoordinates++; return null; }
        try { return await calculateRoute(from, to, input.data.mode); } catch (e) {
          console.error("[tripify:maps] routes upstream failed", {
            mode: input.data.mode,
            detail: e instanceof Error ? e.message : "unknown",
          });
          return null;
        }
      }));
      segments.push(...results.filter((segment) => segment !== null));
    }
    const latest = await client.from("trips").select("version").eq("id", input.data.trip).maybeSingle();
    if (latest.data?.version !== trip.data.version) return reply({ error: "VERSION_CONFLICT" }, 409);
    debugLog("maps", "routes compute done", {
      segments: segments.length,
      partial,
      skippedNoCoordinates,
    });
    return reply({ segments, partial, skippedNoCoordinates, version: trip.data.version, calculatedAt: new Date().toISOString() });
  } catch { return reply({ error: "UNAVAILABLE" }, 503); }
}
