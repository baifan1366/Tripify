import { z } from "zod";
import { tool } from "@langchain/core/tools";
import type { ContextClient } from "@/lib/ai/context";
import { fetchTripForecast } from "@/lib/weather/open-meteo";

export type TripToolDeps = {
  client: ContextClient;
  tripId: string;
};

const noInput = z.object({});

function summarize(rows: unknown[], max = 12): unknown[] {
  return Array.isArray(rows) ? rows.slice(0, max) : [];
}

/** Read-only trip tools. No mutation tools are exposed to the agent. */
export function createTripTools(deps: TripToolDeps) {
  const getTrip = tool(
    async () => {
      const res = await deps.client
        .from("trips")
        .select(
          "id,name,destination,start_date,end_date,currency,budget_total,timezone,version",
        )
        .eq("id", deps.tripId)
        .maybeSingle();
      if (res.error) throw new Error(`get_trip failed: ${res.error.message}`);
      if (!res.data) throw new Error("TRIP_FORBIDDEN");
      return res.data;
    },
    {
      name: "get_trip",
      description:
        "Get the trip's name, destination, dates, currency, budget, timezone and version.",
      schema: noInput,
    },
  );

  const getTripMembers = tool(
    async () => {
      const res = await deps.client
        .from("trip_members")
        .select("display_name,interests,dislikes,food_preferences,pace,budget_limit")
        .eq("trip_id", deps.tripId)
        .limit(30);
      if (res.error)
        throw new Error(`get_trip_members failed: ${res.error.message}`);
      return summarize(res.data ?? []);
    },
    {
      name: "get_trip_members",
      description:
        "List group members with their interests, pace and budget limits.",
      schema: noInput,
    },
  );

  const getItinerary = tool(
    async (input: { day?: number }) => {
      let query = deps.client
        .from("trip_activities")
        .select(
          "day_number,start_time,title,location_name,estimated_cost,duration_minutes",
        )
        .eq("trip_id", deps.tripId)
        .order("day_number", { ascending: true });
      if (input.day != null) query = query.eq("day_number", input.day);
      const res = await query.limit(60);
      if (res.error)
        throw new Error(`get_itinerary failed: ${res.error.message}`);
      return summarize(res.data ?? [], 30);
    },
    {
      name: "get_itinerary",
      description:
        "Get itinerary activities, optionally filtered by day number.",
      schema: z.object({
        day: z.number().int().min(1).max(60).optional(),
      }),
    },
  );

  const getWeather = tool(
    async (input: { day?: number }) => {
      const tripRes = await deps.client
        .from("trips")
        .select("destination,start_date,end_date")
        .eq("id", deps.tripId)
        .maybeSingle();
      if (tripRes.error)
        throw new Error(`get_weather failed: ${tripRes.error.message}`);
      if (!tripRes.data) throw new Error("TRIP_FORBIDDEN");
      const trip = tripRes.data as {
        destination: string;
        start_date: string;
        end_date: string;
      };
      const forecast = await fetchTripForecast(
        trip.destination,
        trip.start_date,
        trip.end_date,
      );
      if (!forecast.place)
        return {
          unavailable: true,
          reason: "Destination could not be resolved to a forecast location.",
        };
      if (!forecast.days.length)
        return {
          unavailable: true,
          reason: "No forecast available for these trip dates.",
          place: forecast.place,
        };
      if (input.day != null) {
        const date = new Date(`${trip.start_date}T00:00:00Z`);
        date.setUTCDate(date.getUTCDate() + input.day - 1);
        const iso = date.toISOString().slice(0, 10);
        const found = forecast.days.find((d) => d.date === iso);
        if (!found)
          return {
            unavailable: true,
            reason: "That day is outside the forecast horizon.",
            place: forecast.place,
          };
        return { place: forecast.place, day: found };
      }
      return { place: forecast.place, days: forecast.days };
    },
    {
      name: "get_weather",
      description:
        "Get the real Open-Meteo weather forecast for the trip destination and dates, optionally for one day number. This is the only source of live weather.",
      schema: z.object({
        day: z.number().int().min(1).max(60).optional(),
      }),
    },
  );

  return [getTrip, getTripMembers, getItinerary, getWeather];
}

export const TRIP_TOOL_NAMES = [
  "get_trip",
  "get_trip_members",
  "get_itinerary",
  "get_weather",
] as const;

/** Registry for future tools (search_places, create_proposal, …). */
export type ToolRegistry = ReturnType<typeof createTripTools>;
