import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { lookupTimezone } from "@/lib/maps/timezone";
import { withinQuota } from "@/lib/maps/server-cache";
export async function GET(request: Request) {
  const input = z.object({ trip: z.uuid(), activity: z.uuid() }).safeParse(Object.fromEntries(new URL(request.url).searchParams));
  const reply = (body: object, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
  if (!input.success) return reply({ error: "INVALID_INPUT" }, 400);
  try {
    const client = await createClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return reply({ error: "UNAUTHENTICATED" }, 401);
    const trip = await client.from("trips").select("created_by").eq("id", input.data.trip).maybeSingle();
    if (trip.data?.created_by !== user.id) return reply({ error: "FORBIDDEN" }, 403);
    const activity = await client.from("trip_activities").select("latitude,longitude").eq("trip_id", input.data.trip).eq("id", input.data.activity).maybeSingle();
    if (!activity.data || activity.data.latitude === null || activity.data.longitude === null) return reply({ error: "MISSING_COORDINATES" }, 422);
    if (!withinQuota(user.id)) return reply({ error: "RATE_LIMITED" }, 429);
    return reply({ timezone: await lookupTimezone(activity.data.latitude, activity.data.longitude) });
  } catch { return reply({ error: "UNAVAILABLE" }, 503); }
}
