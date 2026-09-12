export type PlaceSelection = {
  placeId: string;
  latitude: number;
  longitude: number;
  name: string;
  address?: string;
  rating?: number;
  category?: string;
  openingHours?: string[];
  openingPeriods?: {
    open: { day: number; hour: number; minute: number };
    close?: { day: number; hour: number; minute: number };
  }[];
  mapsUri?: string;
};
export type Placement = {
  day: number;
  afterId: string;
  beforeId?: string;
  time: string;
  detourMinutes?: number;
  conflictMinutes: number;
  opening: "open" | "closed" | "unknown";
  routesVerified: boolean;
};
export type RouteSegment = {
  from: string;
  to: string;
  mode: "WALK" | "DRIVE" | "TRANSIT" | "BICYCLE";
  seconds: number;
  meters: number;
  polyline?: string;
};
