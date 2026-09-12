"use client";
import { useEffect, useState } from "react";
import type { WeatherDay } from "@/lib/weather/risk";

export type TripWeather = {
  place: string | null;
  days: WeatherDay[];
  fetchedAt: string;
} | null;

/** Live Open-Meteo forecast for the trip destination. Read-only; never edits. */
export function useTripWeather(tripId: string): TripWeather {
  const [weather, setWeather] = useState<TripWeather>(null);
  useEffect(() => {
    let active = true;
    void fetch(`/api/weather?trip=${encodeURIComponent(tripId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (active && body && Array.isArray(body.days)) setWeather(body);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [tripId]);
  return weather;
}
