import type { Activity } from "@/lib/mvp/model";
export function coordinates(
  activity?: Activity,
): { lat: number; lng: number } | null {
  if (
    !activity ||
    !Number.isFinite(activity.latitude) ||
    !Number.isFinite(activity.longitude)
  )
    return null;
  const lat = activity.latitude!,
    lng = activity.longitude!;
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
}
/** Google encoded polyline geometry only; never synthesize route geometry. */
export function decodePolyline(
  encoded: string,
): { lat: number; lng: number }[] {
  let index = 0,
    lat = 0,
    lng = 0;
  const result = [];
  function next() {
    let value = 0,
      shift = 0,
      byte: number;
    do {
      if (index >= encoded.length || shift > 30)
        throw new Error("INVALID_POLYLINE");
      byte = encoded.charCodeAt(index++) - 63;
      if (byte < 0 || byte > 63) throw new Error("INVALID_POLYLINE");
      value |= (byte & 31) << shift;
      shift += 5;
    } while (byte >= 32);
    return value & 1 ? ~(value >> 1) : value >> 1;
  }
  while (index < encoded.length) {
    lat += next();
    lng += next();
    result.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return result;
}
