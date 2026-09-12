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
import { useLocale, useTranslations } from "next-intl";
import type { Activity } from "@/lib/mvp/model";
import type { RouteSegment } from "@/lib/maps/types";
import { coordinates, decodePolyline } from "@/lib/maps/adapters";
import { TripMarker } from "./trip-marker";
import { MapDiscovery } from "./map-discovery";
import type { PlaceSelection } from "@/lib/maps/types";
import { segmentTiming } from "@/lib/maps/schedule";

export function GoogleCanvas({
  items,
  selected,
  hovered,
  onSelect,
  onHover,
  fit,
  routes,
  fallback,
  destination,
  onPlace,
  onCustom,
  customMode,
  transit,
  preview,
}: {
  items: Activity[];
  selected?: Activity;
  hovered?: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  fit: number;
  routes: RouteSegment[];
  fallback: React.ReactNode;
  destination: string;
  onPlace: (place: PlaceSelection) => void;
  onCustom: (position: google.maps.LatLngLiteral) => void;
  customMode: boolean;
  transit: boolean;
  preview?: PlaceSelection | null;
}) {
  const t = useTranslations("shared");
  const status = useApiLoadingStatus();
  // Env values pasted with stray whitespace become invalid Map IDs (gray map).
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID?.trim() || "";
  const points = items.filter((item) => coordinates(item));
  useEffect(() => {
    debugLog("maps", "canvas status", {
      status,
      hasMapId: !!mapId,
      mapIdLen: mapId.length,
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
          defaultCenter={coordinates(points[0]) ?? { lat: 20, lng: 0 }}
          defaultZoom={points.length ? 13 : 2}
          defaultTilt={0}
          defaultHeading={0}
          gestureHandling="cooperative"
          disableDefaultUI={false}
          mapTypeControl={false}
          streetViewControl={false}
          fullscreenControl={false}
        >
          {points.map((item) => (
            <TripMarker
              key={item.id}
              item={item}
              index={items.findIndex((a) => a.id === item.id) + 1}
              selected={selected?.id === item.id}
              hovered={hovered === item.id}
              onSelect={onSelect}
              onHover={onHover}
            />
          ))}
          <MapDiscovery
            destination={destination}
            onPlace={onPlace}
            onCustom={onCustom}
            customMode={customMode}
          />
          <TransitContext visible={transit} />
          {preview && (
            <AdvancedMarker
              position={{ lat: preview.latitude, lng: preview.longitude }}
              zIndex={5}
            >
              <span className="map-preview-pin" aria-label={preview.name} />
            </AdvancedMarker>
          )}
          <Camera items={items} selected={selected} fit={fit} />
          <ResizeNotifier />
          {routes.map((route) => (
            <RouteLine
              key={`${route.from}:${route.to}`}
              route={route}
              from={items.find((a) => a.id === route.from)}
              to={items.find((a) => a.id === route.to)}
              active={
                !selected ||
                route.from === selected.id ||
                route.to === selected.id
              }
              onSelect={onSelect}
            />
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
    if (map && lat !== undefined && lng !== undefined) {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
        map.moveCamera({ center: { lat, lng }, tilt: 0, heading: 0 });
      else map.panTo({ lat, lng });
    }
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
function ResizeNotifier() {
  const map = useMap();
  // Widget resize changes the container div behind the map's back (drag the
  // s/se handle and tiles would otherwise keep the old viewport). Nudging
  // the resize event keeps tiles, markers and camera in sync with the box.
  useEffect(() => {
    if (!map || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      try {
        google.maps.event.trigger(map, "resize");
      } catch {
        /* map torn down mid-resize; safe to ignore */
      }
    });
    ro.observe(map.getDiv());
    return () => ro.disconnect();
  }, [map]);
  return null;
}
function TransitContext({ visible }: { visible: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !visible) return;
    const layer = new google.maps.TransitLayer();
    layer.setMap(map);
    return () => layer.setMap(null);
  }, [map, visible]);
  return null;
}
function RouteLine({
  route,
  active,
  onSelect,
  from,
  to,
}: {
  route: RouteSegment;
  active: boolean;
  onSelect: (id: string) => void;
  from?: Activity;
  to?: Activity;
}) {
  const t = useTranslations("shared");
  const m = useTranslations("mvp");
  const locale = useLocale();
  const conflict = from && to ? segmentTiming(from, to, route).conflict : 0;
  const path = useMemo(() => {
    try {
      return route.polyline ? decodePolyline(route.polyline) : [];
    } catch {
      return [];
    }
  }, [route.polyline]);
  return path.length ? (
    <>
      {active && (
        <Polyline
          path={path}
          strokeColor="#ffffff"
          strokeOpacity={0.9}
          strokeWeight={8}
          clickable={false}
          zIndex={1}
        />
      )}
      <Polyline
        path={path}
        strokeColor={active ? "#2F7DF4" : "#6B7F93"}
        strokeOpacity={active ? 1 : 0.4}
        strokeWeight={active ? 4 : 3}
        zIndex={2}
        onClick={() => onSelect(route.to)}
      />
      <AdvancedMarker
        position={path[Math.floor(path.length / 2)]}
        zIndex={active ? 6 : 2}
      >
        <button
          type="button"
          className="map-route-label"
          data-active={active}
          onClick={() => onSelect(route.to)}
        >
          {t(route.mode)} ·{" "}
          {m("minutes", { count: Math.ceil(route.seconds / 60) })}
          <span>
            {new Intl.NumberFormat(locale, {
              style: "unit",
              unit: route.meters < 1000 ? "meter" : "kilometer",
              maximumFractionDigits: route.meters < 1000 ? 0 : 1,
            }).format(route.meters < 1000 ? route.meters : route.meters / 1000)}
          </span>
          {conflict > 0 && active && (
            <small className="map-timing-warning">
              {t("scheduleConflict", { minutes: conflict })}
            </small>
          )}
        </button>
      </AdvancedMarker>
    </>
  ) : null;
}
