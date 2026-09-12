import { createClient } from "@/lib/supabase/client";
import type { Activity, Member, Trip, TripDraft } from "@/lib/mvp/model";

type ActivityRow = {
  id: string;
  day_number: number;
  start_time: string;
  title: string;
  location_name: string;
  estimated_cost: number;
  duration_minutes: number;
  latitude: number | null;
  longitude: number | null;
  google_place_id: string | null;
};
type MemberRow = {
  user_id: string;
  display_name: string;
  interests: string;
  dislikes: string;
  food_preferences: string;
  pace: Member["pace"];
  budget_limit: number | null;
};
type TripRow = {
  id: string;
  created_by: string;
  version: number;
  name: string;
  destination: string;
  start_date: string;
  end_date: string;
  currency: string;
  timezone: string;
  budget_total: number;
  trip_members: MemberRow[];
  trip_activities: ActivityRow[];
};
export function activityFromRow(a: ActivityRow): Activity {
  return {
    id: a.id,
    day: a.day_number,
    time: a.start_time.slice(0, 5),
    title: a.title,
    place: a.location_name,
    cost: Number(a.estimated_cost),
    duration: a.duration_minutes,
    latitude: a.latitude ?? undefined,
    longitude: a.longitude ?? undefined,
    placeId: a.google_place_id ?? undefined,
  };
}
export function activityData(a: Activity) {
  return {
    day_number: a.day,
    start_time: a.time,
    title: a.title,
    location_name: a.place,
    estimated_cost: a.cost,
    duration_minutes: a.duration,
    latitude: a.latitude ?? null,
    longitude: a.longitude ?? null,
    google_place_id: a.placeId ?? null,
  };
}
export async function loadTrips(): Promise<Trip[]> {
  const { data, error } = await createClient()
    .from("trips")
    .select(
      "id,created_by,version,name,destination,start_date,end_date,currency,timezone,budget_total,trip_members(user_id,display_name,interests,dislikes,food_preferences,pace,budget_limit),trip_activities(id,day_number,start_time,title,location_name,estimated_cost,duration_minutes,latitude,longitude,google_place_id)",
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as TripRow[]).map((t) => ({
    id: t.id,
    createdBy: t.created_by,
    version: t.version,
    name: t.name,
    destination: t.destination,
    start: t.start_date,
    end: t.end_date,
    currency: t.currency,
    timezone: t.timezone,
    budget: Number(t.budget_total),
    demo: false,
    activities: t.trip_activities.map(activityFromRow),
    members: t.trip_members.map((m) => ({
      id: m.user_id,
      name: m.display_name,
      interests: m.interests,
      dislikes: m.dislikes,
      food: m.food_preferences,
      pace: m.pace,
      budget: Number(m.budget_limit ?? 0),
    })),
  }));
}
export async function createSharedTrip(draft: TripDraft, displayName: string) {
  const { data, error } = await createClient().rpc("trip_create", {
    p_data: {
      name: draft.name.trim(),
      destination: draft.destination.trim(),
      start_date: draft.start,
      end_date: draft.end,
      currency: draft.currency,
      timezone: draft.timezone,
      budget_total: Number(draft.budget),
    },
    p_display_name: displayName,
  });
  if (error) throw error;
  return data.trip.id as string;
}
export async function mutateSharedTrip(
  trip: Trip,
  operation:
    | "trip.update"
    | "activity.add"
    | "activity.update"
    | "activity.remove",
  entity: string | null,
  changes: object,
) {
  const { data, error } = await createClient().rpc("trip_mutate", {
    p_trip: trip.id,
    p_expected_version: trip.version,
    p_operation: operation,
    p_entity: entity,
    p_data: changes,
  });
  if (error) throw error;
  return data as { newVersion: number; updatedEntity: ActivityRow | null };
}
export function sharedError(
  error: unknown,
):
  | "conflict"
  | "inviteExpired"
  | "inviteUsed"
  | "forbidden"
  | "failed"
  | "noChanges" {
  const message =
    error && typeof error === "object" && "message" in error
      ? String(error.message)
      : "";
  if (message.includes("VERSION_CONFLICT")) return "conflict";
  if (message.includes("NO_CHANGES")) return "noChanges";
  if (message.includes("INVITE_EXPIRED")) return "inviteExpired";
  if (/INVITE_USED|ALREADY_MEMBER/.test(message)) return "inviteUsed";
  if (/FORBIDDEN|NOT_AUTHENTICATED|NOT_MEMBER/.test(message))
    return "forbidden";
  return "failed";
}
