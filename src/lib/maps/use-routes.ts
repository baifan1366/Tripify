"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Trip } from "@/lib/mvp/model";
import type { RouteSegment } from "./types";
export function useRoutes(trip: Trip, day: number) {
  const [mode, setMode] = useState<RouteSegment["mode"]>("WALK");
  const [result, setResult] = useState<{
    key: string;
    segments: RouteSegment[];
  }>({ key: "", segments: [] });
  const [pendingKey, setPendingKey] = useState("");
  const [errorKey, setErrorKey] = useState("");
  const abort = useRef<AbortController | null>(null);
  const key = `${trip.id}:${trip.version}:${day}:${mode}`;
  const tripId = trip.id;
  const tripVersion = trip.version;
  useEffect(() => () => abort.current?.abort(), [key]);
  const calculate = useCallback(async () => {
    if (!tripVersion) return;
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setPendingKey(key);
    setErrorKey("");
    try {
      const response = await fetch(
        `/api/maps/routes?trip=${tripId}&day=${day}&mode=${mode}`,
        { signal: controller.signal },
      );
      if (!response.ok) throw new Error("UNAVAILABLE");
      const data = (await response.json()) as {
        version: number;
        segments: RouteSegment[];
      };
      if (data.version !== tripVersion) throw new Error("STALE_ROUTES");
      setResult({ key, segments: data.segments });
    } catch {
      if (!controller.signal.aborted) setErrorKey(key);
    } finally {
      if (!controller.signal.aborted) setPendingKey("");
    }
  }, [tripId, tripVersion, day, mode, key]);
  return useMemo(
    () => ({
      mode,
      setMode,
      calculate,
      segments: result.key === key ? result.segments : [],
      pending: pendingKey === key,
      error: errorKey === key,
    }),
    [mode, calculate, result, key, pendingKey, errorKey],
  );
}
