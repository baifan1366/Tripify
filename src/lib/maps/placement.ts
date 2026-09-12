import type { Activity } from "@/lib/mvp/model";
import type { PlaceSelection, Placement } from "./types";
import { clockTime, timeMinutes } from "./schedule";

export function openingAt(
  periods: PlaceSelection["openingPeriods"],
  weekday: number,
  start: number,
  duration: number,
): Placement["opening"] {
  if (!periods?.length) return "unknown";
  const target = weekday * 1440 + start;
  for (const period of periods) {
    if (
      !period.close &&
      period.open.day === 0 &&
      period.open.hour === 0 &&
      period.open.minute === 0
    )
      return "open";
    if (!period.close) continue;
    const open =
      period.open.day * 1440 + period.open.hour * 60 + period.open.minute;
    let close =
      period.close.day * 1440 + period.close.hour * 60 + period.close.minute;
    if (close <= open) close += 10080;
    for (const offset of [-10080, 0, 10080])
      if (target >= open + offset && target + duration <= close + offset)
        return "open";
  }
  return periods.some((p) => !p.close) ? "unknown" : "closed";
}

/** Geometry only shortlists candidates; never presented as a travel-time estimate. */
export function proximity(
  a: { latitude?: number; longitude?: number },
  b: PlaceSelection,
) {
  if (a.latitude === undefined || a.longitude === undefined) return Infinity;
  const dy = a.latitude - b.latitude;
  const dx =
    (a.longitude - b.longitude) * Math.cos((b.latitude * Math.PI) / 180);
  return dx * dx + dy * dy;
}
export function placementTime(
  before: Activity | undefined,
  after: Activity | undefined,
  duration: number,
  inbound = 0,
) {
  return clockTime(
    Math.min(
      1439,
      after
        ? timeMinutes(after.time) + after.duration + inbound
        : before
          ? Math.max(0, timeMinutes(before.time) - duration - 30)
          : 540,
    ),
  );
}
