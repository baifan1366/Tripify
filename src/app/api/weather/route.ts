import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { fetchTripForecast } from "@/lib/weather/open-meteo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({ trip: z.uuid() });

type CacheEntry = { at: number; body: object };
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function reply(body: object, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function GET(request: Request) {
  const input = querySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!input.success) return reply({ error: "INVALID_INPUT" }, 400);
  try {
    const client = await createClient();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) return reply({ error: "UNAUTHENTICATED" }, 401);
    const cached = cache.get(input.data.trip);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) return reply(cached.body);
    // RLS enforces membership: invisible trips read as no row → forbidden.
    const trip = await client
      .from("trips")
      .select("destination,start_date,end_date")
      .eq("id", input.data.trip)
      .maybeSingle();
    if (trip.error) return reply({ error: "UNAVAILABLE" }, 503);
    if (!trip.data) return reply({ error: "FORBIDDEN" }, 403);
    const row = trip.data as {
      destination: string;
      start_date: string;
      end_date: string;
    };
    const forecast = await fetchTripForecast(
      row.destination,
      row.start_date,
      row.end_date,
    );
    const body = { ...forecast, fetchedAt: new Date().toISOString() };
    if (cache.size >= 200) {
      const oldest = cache.keys().next();
      if (!oldest.done) cache.delete(oldest.value);
    }
    cache.set(input.data.trip, { at: Date.now(), body });
    return reply(body);
  } catch {
    return reply({ error: "UNAVAILABLE" }, 503);
  }
}
