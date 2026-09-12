"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { debugLog } from "@/lib/debug";
import {
  AdvancedMarker,
  Map,
  Polyline,
  useMap,
  useApiLoadingStatus,
  APILoadingStatus,
} from "@vis.gl/react-google-maps";
import { useTranslations } from "next-intl";
import type { Activity } from "@/lib/mvp/model";
import type { RouteSegment } from "@/lib/maps/types";
import { coordinates, decodePolyline } from "@/lib/maps/adapters";

export function GoogleCanvas({
  items,
  selected,
  hovered,
  onSelect,
  onHover,
  fit,
  routes,
  fallback,
}: {
  items: Activity[];
  selected?: Activity;
  hovered?: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  fit: number;
  routes: RouteSegment[];
  fallback: React.ReactNode;
}) {
  const t = useTranslations("shared");
  const status = useApiLoadingStatus();
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;
  const points = items.filter((item) => coordinates(item));
  useEffect(() => {
    debugLog("maps", "canvas status", {
      status,
      hasMapId: !!mapId,
      items: items.length,
      points: points.length,
    });
  }, [status, mapId, items.length, points.length]);
  // Tiles can stay gray with status LOADED (referrer-blocked key, billing
  // off, bad Map ID). The watchdog turns that silent gray into the fallback.
  const [tilesStuck, setTilesStuck] = useState(false);
  const handleStuck = useCallback(() => setTilesStuck(true), []);
  if (
    status === APILoadingStatus.FAILED ||
    status === APILoadingStatus.AUTH_FAILURE ||
    !mapId
  )
    return (
      <>
        <p className="travel-map-context" role="status">
          {t("mapUnavailable")}
        </p>
        {fallback}
      </>
    );
  if (status !== APILoadingStatus.LOADED)
    return (
      <>
        <p className="travel-map-context" role="status">
          {t("mapLoading")}
        </p>
        {fallback}
      </>
    );
  if (!points.length)
    return (
      <>
        <p className="travel-map-context">{t("missingCoordinates")}</p>
        {fallback}
      </>
    );
  if (tilesStuck)
    return (
      <>
        <p className="travel-map-context" role="status">
          {t("mapUnavailable")}
        </p>
        {fallback}
        <button type="button" onClick={() => setTilesStuck(false)}>
          {t("retry")}
        </button>
      </>
    );
  return (
    <>
      {points.length < items.length && (
        <p className="travel-map-context">{t("partialCoordinates")}</p>
      )}
      <div className="google-map-canvas">
        <Map
          mapId={mapId}
          defaultCenter={coordinates(points[0])!}
          defaultZoom={13}
          defaultTilt={0}
          defaultHeading={0}
          gestureHandling="cooperative"
          disableDefaultUI={false}
          mapTypeControl={false}
          streetViewControl={false}
          fullscreenControl={false}
        >
          {points.map((item) => (
            <AdvancedMarker
              key={item.id}
              position={coordinates(item)!}
              title={item.title}
            >
              <button
                type="button"
                className="google-activity-pin"
                aria-label={item.title}
                aria-pressed={selected?.id === item.id}
                data-hovered={hovered === item.id}
                onClick={() => onSelect(item.id)}
                onMouseEnter={() => onHover(item.id)}
                onMouseLeave={() => onHover(null)}
                onFocus={() => onHover(item.id)}
                onBlur={() => onHover(null)}
              >
                {items.findIndex((a) => a.id === item.id) + 1}
              </button>
            </AdvancedMarker>
          ))}
          <Camera items={items} selected={selected} fit={fit} />
          {routes.map((route) => (
            <RouteLine key={`${route.from}:${route.to}`} route={route} />
          ))}
          <TilesWatchdog
            key={items.map((a) => a.id).join("|")}
            onStuck={handleStuck}
          />
        </Map>
      </div>
    </>
  );
}
function Camera({
  items,
  selected,
  fit,
}: {
  items: Activity[];
  selected?: Activity;
  fit: number;
}) {
  const map = useMap();
  const boundsKey = items
    .map((a) => `${a.id}:${a.latitude}:${a.longitude}`)
    .join("|");
  useEffect(() => {
    if (!map) return;
    const points = boundsKey.split("|").map((p) => p.split(":"));
    const bounds = new google.maps.LatLngBounds();
    for (const [, lat, lng] of points)
      if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)))
        bounds.extend({ lat: Number(lat), lng: Number(lng) });
    if (bounds.isEmpty()) return;
    const ne = bounds.getNorthEast(),
      sw = bounds.getSouthWest();
    let lngSpan = ne.lng() - sw.lng();
    if (lngSpan < 0) lngSpan += 360;
    const mercator = (latitude: number) =>
      Math.log(
        Math.tan(
          Math.PI / 4 + (Math.max(-85, Math.min(85, latitude)) * Math.PI) / 360,
        ),
      );
    const latSpan =
      Math.abs(mercator(ne.lat()) - mercator(sw.lat())) / (2 * Math.PI);
    const width = Math.max(100, map.getDiv().clientWidth - 100),
      height = Math.max(100, map.getDiv().clientHeight - 100);
    const zoom = Math.min(
      16,
      Math.log2(width / 256 / Math.max(lngSpan / 360, 0.00001)),
      Math.log2(height / 256 / Math.max(latSpan, 0.00001)),
    );
    // No implicit fitBounds/pan animation: reduced motion is respected for all camera operations.
    map.moveCamera({
      center: bounds.getCenter(),
      zoom: Math.max(1, zoom),
      tilt: 0,
      heading: 0,
    });
  }, [map, boundsKey, fit]);
  const position = coordinates(selected);
  const lat = position?.lat,
    lng = position?.lng;
  useEffect(() => {
    if (map && lat !== undefined && lng !== undefined)
      map.moveCamera({ center: { lat, lng }, tilt: 0, heading: 0 });
  }, [map, lat, lng]);
  return null;
}
function TilesWatchdog({ onStuck }: { onStuck: () => void }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    let settled = false;
    const listener = google.maps.event.addListener(map, "tilesloaded", () => {
      settled = true;
    });
    const timer = setTimeout(() => {
      if (!settled) {
        try {
          const center = map.getCenter()?.toJSON();
          debugLog("maps", "tiles stuck", {
            center,
            zoom: map.getZoom(),
            mapType: map.getMapTypeId(),
          });
        } catch {
          /* ignore introspection failures */
        }
        console.warn(
          "[tripify:maps] map tiles never loaded (12s) — likely key restrictions, billing, or Map ID. Falling back.",
        );
        onStuck();
      }
    }, 12000);
    return () => {
      clearTimeout(timer);
      listener.remove();
    };
  }, [map, onStuck]);
  return null;
}
function RouteLine({ route }: { route: RouteSegment }) {
  const path = useMemo(() => {
    try {
      return route.polyline ? decodePolyline(route.polyline) : [];
    } catch {
      return [];
    }
  }, [route.polyline]);
  return path.length ? (
    <Polyline path={path} strokeColor="#2e7af8" strokeWeight={4} />
  ) : null;
}
