"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Trip } from "@/lib/mvp/model";
import { debugLog } from "@/lib/debug";
import type { RouteSegment } from "./types";
export function useRoutes(trip: Trip, day: number) {
  const [mode, setMode] = useState<RouteSegment["mode"]>("WALK");
  const [result, setResult] = useState<{
    key: string;
    segments: RouteSegment[];
    skipped: number;
  }>({ key: "", segments: [], skipped: 0 });
  const [pendingKey, setPendingKey] = useState("");
  const [errorKey, setErrorKey] = useState("");
  const [errorCode, setErrorCode] = useState("");
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
    setErrorCode("");
    debugLog("maps", "routes request", { tripId, day, mode });
    try {
      const response = await fetch(
        `/api/maps/routes?trip=${tripId}&day=${day}&mode=${mode}`,
        { signal: controller.signal },
      );
      if (!response.ok) {
        let code = "UNAVAILABLE";
        try {
          const body = (await response.json()) as { error?: string };
          if (body?.error) code = body.error;
        } catch {
          /* keep generic code */
        }
        const failure = new Error(code);
        (failure as { code?: string }).code = code;
        throw failure;
      }
      const data = (await response.json()) as {
        version: number;
        segments: RouteSegment[];
        skippedNoCoordinates?: number;
        partial?: boolean;
      };
      if (data.version !== tripVersion) throw new Error("STALE_ROUTES");
      setResult({ key, segments: data.segments, skipped: data.skippedNoCoordinates ?? 0 });
      debugLog("maps", "routes response", {
        segments: data.segments.length,
        skipped: data.skippedNoCoordinates ?? 0,
        partial: data.partial ?? false,
      });
    } catch (e) {
      if (!controller.signal.aborted) {
        const code = e instanceof Error ? e.message : "UNAVAILABLE";
        console.warn("[tripify:maps] routes failed", { tripId, day, mode, code });
        setErrorKey(key);
        setErrorCode(code);
      }
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
      skipped: result.key === key ? result.skipped : 0,
      pending: pendingKey === key,
      error: errorKey === key,
      errorCode: errorKey === key ? errorCode || "UNAVAILABLE" : null,
    }),
    [mode, calculate, result, key, pendingKey, errorKey, errorCode],
  );
}
