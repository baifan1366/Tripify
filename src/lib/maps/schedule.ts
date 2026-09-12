import type { Activity } from "@/lib/mvp/model";
import type { RouteSegment } from "./types";

/** Match the database's chronological order, including its deterministic tie break. */
export function dayActivities(activities: Activity[], day: number) {
  return activities
    .filter((a) => a.day === day)
    .sort((a, b) => a.time.localeCompare(b.time) || a.id.localeCompare(b.id));
}
export function timeMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}
export function clockTime(minutes: number) {
  const value = Math.max(0, Math.round(minutes));
  return `${String(Math.floor(value / 60) % 24).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}
export function activityEnd(activity: Activity) {
  const end = timeMinutes(activity.time) + activity.duration;
  return `${clockTime(end)}${end >= 1440 ? " +1" : ""}`;
}
/** Saved times remain fixed. Feasibility is derived, never a silent reschedule. */
export function segmentTiming(
  from: Activity,
  to: Activity,
  route?: RouteSegment,
) {
  const end = timeMinutes(from.time) + from.duration;
  const arrival = end + (route ? Math.ceil(route.seconds / 60) : 0);
  return {
    arrival,
    conflict: Math.max(0, arrival - timeMinutes(to.time)),
    verified: !!route,
  };
}
export function routeFingerprint(activities: Activity[], day: number) {
  return JSON.stringify(
    dayActivities(activities, day).map(
      ({ id, time, duration, latitude, longitude }) => [
        id,
        time,
        duration,
        latitude,
        longitude,
      ],
    ),
  );
}
