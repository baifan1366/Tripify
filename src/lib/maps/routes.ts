import "server-only";
import { z } from "zod";
import { cached } from "./server-cache";
import type { RouteSegment } from "./types";
const response = z.object({
  routes: z
    .array(
      z.object({
        duration: z.string().regex(/^\d+(\.\d+)?s$/),
        distanceMeters: z.number().nonnegative(),
        polyline: z.object({ encodedPolyline: z.string() }).optional(),
      }),
    )
    .optional(),
});
export async function calculateRoute(
  from: { id: string; latitude: number; longitude: number },
  to: { id: string; latitude: number; longitude: number },
  mode: RouteSegment["mode"],
): Promise<RouteSegment> {
  const key = process.env.GOOGLE_MAPS_SERVER_API_KEY;
  if (!key) throw new Error("MAPS_UNCONFIGURED");
  return cached(
    `route:${JSON.stringify([from, to, mode])}`,
    300000,
    async () => {
      const waypoint = (p: typeof from) => ({
        location: { latLng: { latitude: p.latitude, longitude: p.longitude } },
      });
      const res = await fetch(
        "https://routes.googleapis.com/directions/v2:computeRoutes",
        {
          method: "POST",
          cache: "no-store",
          signal: AbortSignal.timeout(8000),
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": key,
            "X-Goog-FieldMask":
              "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline",
          },
          body: JSON.stringify({
            origin: waypoint(from),
            destination: waypoint(to),
            travelMode: mode,
            units: "METRIC",
          }),
        },
      );
      if (!res.ok) throw new Error("ROUTE_UNAVAILABLE");
      const route = response.parse(await res.json()).routes?.[0];
      if (!route) throw new Error("ROUTE_UNAVAILABLE");
      return {
        from: from.id,
        to: to.id,
        mode,
        seconds: Number(route.duration.slice(0, -1)),
        meters: route.distanceMeters,
        polyline: route.polyline?.encodedPolyline,
      };
    },
  );
}
