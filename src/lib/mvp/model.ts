export type Activity = {
  id: string;
  day: number;
  time: string;
  title: string;
  place: string;
  cost: number;
  duration: number;
  x?: number;
  y?: number;
  latitude?: number;
  longitude?: number;
  placeId?: string;
};
export type Member = {
  id: string;
  name: string;
  interests: string;
  pace: "slow" | "balanced" | "active";
  budget: number;
  dislikes: string;
  food: string;
};
export type Trip = {
  version?: number;
  createdBy?: string;
  id: string;
  name: string;
  destination: string;
  start: string;
  end: string;
  currency: string;
  budget: number;
  timezone: string;
  activities: Activity[];
  members: Member[];
};
export type TripDraft = {
  travelStyle?: string;
  name: string;
  destination: string;
  start: string;
  end: string;
  currency: string;
  budget: string;
  timezone: string;
};

export const emptyDraft: TripDraft = {
  travelStyle: "",
  name: "",
  destination: "",
  start: "",
  end: "",
  currency: "MYR",
  budget: "",
  timezone: "Asia/Kuala_Lumpur",
};
export function dayCount(start: string, end: string) {
  return (
    Math.round(
      (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) /
        86400000,
    ) + 1
  );
}
export function dateAt(start: string, day: number) {
  const value = new Date(`${start}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + day - 1);
  return value;
}
export function estimatedTotal(trip: Trip) {
  return trip.activities.reduce((total, activity) => total + activity.cost, 0);
}
/**
 * Forecast extends the planned cost with the average daily spend applied to
 * days that have no activities yet. Deterministic from stored activities —
 * no AI or placeholder numbers involved.
 */
export function forecastTotal(trip: Trip) {
  const planned = estimatedTotal(trip);
  const days = dayCount(trip.start, trip.end);
  const activeDays = new Set(trip.activities.map((a) => a.day)).size;
  const average = activeDays > 0 ? planned / activeDays : 0;
  return planned + average * Math.max(0, days - activeDays);
}
