"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Trip } from "@/lib/mvp/model";
import { debugLog } from "@/lib/debug";
import type { RouteSegment } from "./types";
import { dayActivities, routeFingerprint } from "./schedule";
export function useRoutes(trip: Trip, day: number) {
  const [mode, setMode] = useState<RouteSegment["mode"]>("WALK");
  const [result, setResult] = useState<{
    key: string;
    segments: RouteSegment[];
    skipped: number;
    partial: boolean;
    mode: RouteSegment["mode"];
    endpoints: Record<string, string>;
  }>({
    key: "",
    segments: [],
    skipped: 0,
    partial: false,
    mode: "WALK",
    endpoints: {},
  });
  const [pendingKey, setPendingKey] = useState("");
  const [errorKey, setErrorKey] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const abort = useRef<AbortController | null>(null);
  const fingerprint = routeFingerprint(trip.activities, day);
  const key = `${trip.id}:${day}:${mode}:${fingerprint}`;
  const adjacent = useMemo(() => {
    const items = dayActivities(trip.activities, day);
    return new Set(
      items
        .slice(0, -1)
        .map((item, index) => `${item.id}:${items[index + 1].id}`),
    );
  }, [trip.activities, day]);
  const tripId = trip.id;
  const version = useRef(trip.version);
  useEffect(() => {
    version.current = trip.version;
  }, [trip.version]);
  const persisted = !!trip.version;
  const endpoints = useMemo(
    () =>
      Object.fromEntries(
        trip.activities
          .filter((a) => a.day === day)
          .map((a) => [a.id, `${a.latitude}:${a.longitude}`]),
      ),
    [trip.activities, day],
  );
  const endpointsRef = useRef(endpoints);
  useEffect(() => {
    endpointsRef.current = endpoints;
  }, [endpoints]);
  useEffect(() => () => abort.current?.abort(), [key]);
  const calculate = useCallback(async () => {
    if (!persisted) return;
    abort.current?.abort();
    const controller = new AbortController();
    const requestedEndpoints = endpointsRef.current;
    abort.current = controller;
    setPendingKey(key);
    setErrorKey("");
    setErrorCode("");
    debugLog("maps", "routes request", { tripId, day, mode });
    try {
      const response = await fetch(
        `/api/maps/routes?trip=${tripId}&day=${day}&mode=${mode}`,
        {
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(30000),
          ]),
        },
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
      if (data.version !== version.current) throw new Error("STALE_ROUTES");
      if (controller.signal.aborted) return;
      setResult({
        key,
        segments: data.segments,
        skipped: data.skippedNoCoordinates ?? 0,
        partial: data.partial ?? false,
        mode,
        endpoints: requestedEndpoints,
      });
      debugLog("maps", "routes response", {
        segments: data.segments.length,
        skipped: data.skippedNoCoordinates ?? 0,
        partial: data.partial ?? false,
      });
    } catch (e) {
      if (!controller.signal.aborted) {
        const code = e instanceof Error ? e.message : "UNAVAILABLE";
        console.warn("[tripify:maps] routes failed", {
          tripId,
          day,
          mode,
          code,
        });
        setErrorKey(key);
        setErrorCode(code);
      }
    } finally {
      if (!controller.signal.aborted) setPendingKey("");
    }
  }, [tripId, persisted, day, mode, key]);
  useEffect(() => {
    const timer = setTimeout(() => void calculate(), 300);
    return () => {
      clearTimeout(timer);
      abort.current?.abort();
    };
  }, [calculate]);
  return useMemo(
    () => ({
      mode,
      setMode,
      calculate,
      segments:
        result.key === key
          ? result.segments
          : result.mode === mode
            ? result.segments.filter((segment) => {
                return (
                  adjacent.has(`${segment.from}:${segment.to}`) &&
                  endpoints[segment.from] === result.endpoints[segment.from] &&
                  endpoints[segment.to] === result.endpoints[segment.to]
                );
              })
            : [],
      partial: result.key === key && result.partial,
      skipped: result.key === key ? result.skipped : 0,
      pending:
        persisted &&
        (pendingKey === key || (result.key !== key && errorKey !== key)),
      error: errorKey === key,
      errorCode: errorKey === key ? errorCode || "UNAVAILABLE" : null,
    }),
    [
      mode,
      calculate,
      result,
      key,
      pendingKey,
      errorKey,
      errorCode,
      adjacent,
      endpoints,
      persisted,
    ],
  );
}
