import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { calculateRoute } from "@/lib/maps/routes";
import { withinQuota } from "@/lib/maps/server-cache";
import { dayActivities, timeMinutes, clockTime } from "@/lib/maps/schedule";
import { openingAt, proximity } from "@/lib/maps/placement";
import { dayCount, dateAt, type Activity } from "@/lib/mvp/model";
import type { Placement, PlaceSelection } from "@/lib/maps/types";

const point = z.object({
  day: z.number().int().min(0).max(6),
  hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59),
});
const schema = z.object({
  trip: z.uuid(),
  version: z.number().int(),
  day: z.number().int().min(1).max(60),
  duration: z.number().int().min(1).max(1440),
  mode: z.enum(["WALK", "DRIVE", "TRANSIT", "BICYCLE"]),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  afterId: z.string().max(36).optional(),
  openingPeriods: z
    .array(z.object({ open: point, close: point.optional() }))
    .max(30)
    .optional(),
});
export async function POST(request: Request) {
  const reply = (body: object, status = 200) =>
    Response.json(body, {
      status,
      headers: { "Cache-Control": "private, no-store" },
    });
  try {
    const input = schema.safeParse(await request.json());
    if (!input.success) return reply({ error: "INVALID_INPUT" }, 400);
    const p = input.data;
    const client = await createClient();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) return reply({ error: "UNAUTHENTICATED" }, 401);
    const { data: trip, error } = await client
      .from("trips")
      .select("id,version,start_date,end_date")
      .eq("id", p.trip)
      .maybeSingle();
    if (error) return reply({ error: "UNAVAILABLE" }, 503);
    if (!trip) return reply({ error: "FORBIDDEN" }, 403);
    if (trip.version !== p.version)
      return reply({ error: "VERSION_CONFLICT" }, 409);
    if (!withinQuota(user.id)) return reply({ error: "RATE_LIMITED" }, 429);
    const { data: rows, error: activityError } = await client
      .from("trip_activities")
      .select("id,day_number,start_time,duration_minutes,latitude,longitude")
      .eq("trip_id", p.trip)
      .limit(3601);
    if (activityError || !rows || rows.length > 3600)
      return reply({ error: "UNAVAILABLE" }, 503);
    const activities: Activity[] = rows.map((a) => ({
      id: a.id,
      day: a.day_number,
      time: a.start_time.slice(0, 5),
      duration: a.duration_minutes,
      latitude: a.latitude ?? undefined,
      longitude: a.longitude ?? undefined,
      title: "",
      place: "",
      cost: 0,
    }));
    const place: PlaceSelection = {
      placeId: "",
      name: "",
      latitude: p.latitude,
      longitude: p.longitude,
    };
    const slots: {
      day: number;
      after?: Activity;
      before?: Activity;
      score: number;
    }[] = [];
    for (let day = 1; day <= dayCount(trip.start_date, trip.end_date); day++) {
      if (p.afterId !== undefined && day !== p.day) continue;
      const items = dayActivities(activities, day);
      for (let index = 0; index <= items.length; index++) {
        const after = items[index - 1],
          before = items[index];
        if (p.afterId !== undefined && (after?.id ?? "") !== p.afterId)
          continue;
        const score =
          (after ? proximity(after, place) : 0) +
          (before ? proximity(before, place) : 0) +
          (day === p.day ? 0 : 0.01);
        slots.push({ day, after, before, score });
      }
    }
    if (!slots.length) return reply({ error: "INVALID_INPUT" }, 400);
    // Bounded geographic shortlist; each ranking uses the same cached Google route service as the map.
    const candidates = await Promise.all(
      slots
        .sort((a, b) => a.score - b.score)
        .slice(0, 4)
        .map(async ({ day, after, before }): Promise<Placement> => {
          const waypoint = (a: Activity) =>
            a.latitude !== undefined && a.longitude !== undefined
              ? { id: a.id, latitude: a.latitude, longitude: a.longitude }
              : null;
          const target = {
            id: "discovery",
            latitude: p.latitude,
            longitude: p.longitude,
          };
          const from = after && waypoint(after),
            to = before && waypoint(before);
          const [inbound, outbound, original] = await Promise.all([
            from
              ? calculateRoute(from, target, p.mode).catch(() => null)
              : null,
            to ? calculateRoute(target, to, p.mode).catch(() => null) : null,
            from && to
              ? calculateRoute(from, to, p.mode).catch(() => null)
              : null,
          ]);
          const travelIn = Math.ceil((inbound?.seconds ?? 0) / 60),
            travelOut = Math.ceil((outbound?.seconds ?? 0) / 60);
          const earliest = after
            ? timeMinutes(after.time) + after.duration + travelIn
            : 480;
          const latest = before
            ? timeMinutes(before.time) - p.duration - travelOut
            : 1440 - p.duration;
          const weekday = dateAt(trip.start_date, day).getUTCDay();
          let start = earliest;
          // Find an open interval without moving any existing fixed time.
          for (
            let candidate = earliest;
            candidate <= Math.min(latest, 1439);
            candidate += 5
          ) {
            if (
              openingAt(p.openingPeriods, weekday, candidate, p.duration) ===
              "open"
            ) {
              start = candidate;
              break;
            }
          }
          const routesVerified =
            (!after || !!inbound) && (!before || !!outbound);
          return {
            day,
            afterId: after?.id ?? "",
            beforeId: before?.id,
            time: clockTime(Math.min(start, 1439)),
            routesVerified,
            conflictMinutes: Math.max(0, start - latest),
            opening: openingAt(p.openingPeriods, weekday, start, p.duration),
            detourMinutes:
              routesVerified && (!(after && before) || original)
                ? Math.ceil(
                    ((inbound?.seconds ?? 0) +
                      (outbound?.seconds ?? 0) -
                      (original?.seconds ?? 0)) /
                      60,
                  )
                : undefined,
          };
        }),
    );
    candidates.sort(
      (a, b) =>
        Number(!a.routesVerified) - Number(!b.routesVerified) ||
        a.conflictMinutes - b.conflictMinutes ||
        Number(a.opening === "closed") - Number(b.opening === "closed") ||
        (a.detourMinutes ?? 0) - (b.detourMinutes ?? 0),
    );
    const latest = await client
      .from("trips")
      .select("version")
      .eq("id", p.trip)
      .maybeSingle();
    if (latest.data?.version !== p.version)
      return reply({ error: "VERSION_CONFLICT" }, 409);
    return reply({ candidates, version: p.version });
  } catch {
    return reply({ error: "UNAVAILABLE" }, 503);
  }
}
