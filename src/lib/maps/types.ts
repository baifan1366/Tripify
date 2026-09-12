export type PlaceSelection = {
  placeId: string;
  latitude: number;
  longitude: number;
  name: string;
};
export type RouteSegment = {
  from: string;
  to: string;
  mode: "WALK" | "DRIVE" | "TRANSIT";
  seconds: number;
  meters: number;
  polyline?: string;
};
