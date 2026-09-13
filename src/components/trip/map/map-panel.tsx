"use client";
import { memo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  TrainFront,
  CloudRain,
  Scan,
  Maximize2,
  MoreHorizontal,
  Plus,
  X,
  Info,
} from "lucide-react";
import { Dialog } from "@base-ui/react/dialog";
import type { Activity, Trip } from "@/lib/mvp/model";
import { dayCount } from "@/lib/mvp/model";
import { SchematicMap } from "./schematic-map";
import { GoogleCanvas } from "./google-canvas";
import { AddMapActivity } from "./add-map-activity";
import { useMapsEnabled } from "@/lib/maps/google-map-provider";
import type { PlaceSelection, RouteSegment } from "@/lib/maps/types";
import type { useRoutes } from "@/lib/maps/use-routes";
import type { WeatherDay } from "@/lib/weather/risk";
import { useMvp } from "@/components/mvp/mvp-provider";
import { AppPopover } from "@/components/ui/app-popover";
import { AppTooltip } from "@/components/ui/app-tooltip";
import { AppButton } from "@/components/mvp/primitives";
import "./map-workspace.css";

type DiscoveryState =
  | { kind: "idle" }
  | { kind: "coordinate" }
  | { kind: "preview" | "adding"; place: PlaceSelection };
export const MapPanel = memo(function MapPanel({
  trip,
  day,
  onDayChange,
  onFullscreen,
  items,
  selected,
  onSelect,
  hovered,
  onHover,
  routes = [],
  routing,
  dayRisk = null,
}: {
  trip: Trip;
  day: number;
  onDayChange: (day: number) => void;
  onFullscreen: () => void;
  items: Activity[];
  selected?: Activity;
  onSelect: (id: string) => void;
  hovered?: string | null;
  onHover: (id: string | null) => void;
  routes?: RouteSegment[];
  routing: ReturnType<typeof useRoutes>;
  dayRisk?: WeatherDay | null;
}) {
  const t = useTranslations("dock"),
    m = useTranslations("mvp"),
    s = useTranslations("shared");
  const [transit, setTransit] = useState(false),
    [risk, setRisk] = useState(false);
  const [fit, setFit] = useState(0);
  const [saving, setSaving] = useState(false);
  const [discovery, setDiscovery] = useState<DiscoveryState>({ kind: "idle" });
  const enabled = useMapsEnabled();
  const { viewer } = useMvp();
  const canEdit = trip.createdBy === viewer.id;
  const place =
    discovery.kind === "preview" || discovery.kind === "adding"
      ? discovery.place
      : null;
  const existing = place?.placeId
    ? trip.activities.find((a) => a.placeId === place.placeId)
    : undefined;
  const fallback = (
    <SchematicMap
      activities={items}
      selected={selected}
      onSelect={onSelect}
      fit={fit > 0}
      risk={risk && (dayRisk?.risk ?? "low") !== "low"}
    />
  );
  const openPlace = (value: PlaceSelection) =>
    setDiscovery({ kind: "preview", place: value });
  const custom = (position: google.maps.LatLngLiteral) =>
    openPlace({
      placeId: "",
      name: s("customActivity"),
      latitude: position.lat,
      longitude: position.lng,
    });
  return (
    <div className="travel-map itinerary-map">
      <div className="map-toolbar" aria-label={t("map")}>
        <label className="map-day-control">
          <span className="sr-only">{s("placementDay")}</span>
          <select
            value={day}
            onChange={(e) => onDayChange(Number(e.target.value))}
          >
            {Array.from({ length: dayCount(trip.start, trip.end) }, (_, i) => (
              <option key={i} value={i + 1}>
                {m("day", { day: i + 1 })} · {trip.destination}
              </option>
            ))}
          </select>
        </label>
        <label className="map-mode-control">
          <span className="sr-only">{s("transport")}</span>
          <select
            value={routing.mode}
            onChange={(e) =>
              routing.setMode(e.target.value as RouteSegment["mode"])
            }
          >
            {(["WALK", "DRIVE", "TRANSIT", "BICYCLE"] as const).map((mode) => (
              <option key={mode} value={mode}>
                {s(mode)}
              </option>
            ))}
          </select>
        </label>
        <button
          className="map-overlay-toggle"
          type="button"
          aria-pressed={transit}
          onClick={() => setTransit(!transit)}
          title={t("transit")}
        >
          <TrainFront size={16} />
          <span>{t("transit")}</span>
        </button>
        <button
          className="map-overlay-toggle"
          type="button"
          aria-pressed={risk}
          onClick={() => setRisk(!risk)}
          title={t("risk")}
        >
          <CloudRain size={16} />
          <span>{t("risk")}</span>
        </button>
        <button
          className="map-fit"
          type="button"
          onClick={() => setFit((n) => n + 1)}
          aria-label={t("fitRoute")}
          title={t("fitRoute")}
        >
          <Scan size={16} />
        </button>
        <button
          className="map-fullscreen"
          type="button"
          onClick={onFullscreen}
          aria-label={s("fullscreenMap")}
          title={s("fullscreenMap")}
        >
          <Maximize2 size={16} />
        </button>
        <AppPopover
          label={s("mapOptions")}
          className="map-more"
          trigger={<MoreHorizontal size={17} />}
        >
          {(close) => (
            <div className="map-options">
              <button
                type="button"
                onClick={() => {
                  setFit((value) => value + 1);
                  close();
                }}
              >
                {t("fitRoute")}
              </button>
              <button
                type="button"
                disabled={routing.pending}
                onClick={() => {
                  void routing.calculate();
                  close();
                }}
              >
                {s("refreshRoute")}
              </button>
              <button
                type="button"
                disabled={!enabled || !canEdit}
                onClick={() => {
                  setDiscovery({ kind: "coordinate" });
                  close();
                }}
              >
                {s("addPlaceHere")}
              </button>
              <button
                type="button"
                onClick={() => {
                  onFullscreen();
                  close();
                }}
              >
                {s("fullscreenMap")}
              </button>
            </div>
          )}
        </AppPopover>
      </div>
      <div className="map-stage">
        {enabled ? (
          <GoogleCanvas
            items={items}
            selected={selected}
            hovered={hovered}
            onHover={onHover}
            onSelect={onSelect}
            fit={fit}
            routes={routes}
            fallback={fallback}
            destination={trip.destination}
            onPlace={openPlace}
            onCustom={custom}
            customMode={discovery.kind === "coordinate"}
            transit={transit}
            preview={place}
          />
        ) : (
          <>
            <p className="travel-map-context">{s("mapUnavailable")}</p>
            {fallback}
            <p className="travel-map-footnote">{m("schematic")}</p>
          </>
        )}
        <div className="map-status-strip" role="status">
          {routing.pending ? (
            <span className="map-route-updating">{s("updatingRoute")}</span>
          ) : (
            <span>{s("travelLive")}</span>
          )}
          <AppTooltip label={s("routeEstimateTooltip")}>
            <button type="button" aria-label={s("routeEstimateTooltip")}>
              <Info size={13} />
            </button>
          </AppTooltip>
        </div>
        {routing.error && (
          <div className="map-notice" role="status">
            {s(
              routing.errorCode === "MAPS_UNCONFIGURED"
                ? "routeUnconfigured"
                : "routeUnavailable",
            )}
            <button
              type="button"
              disabled={routing.pending}
              onClick={() => void routing.calculate()}
            >
              {s("refreshRoute")}
            </button>
          </div>
        )}
        {!routing.error && routing.skipped > 0 && (
          <p className="map-notice" role="status">
            {s("routeNoCoordinates", { count: routing.skipped })}
          </p>
        )}
        {!routing.error && routing.partial && (
          <p className="map-notice" role="status">
            {s("routePartial")}
            <button
              type="button"
              disabled={routing.pending}
              onClick={() => void routing.calculate()}
            >
              {s("refreshRoute")}
            </button>
          </p>
        )}
        {risk && (
          <p className="map-risk-context" role="status">
            <CloudRain size={16} />
            {dayRisk
              ? `${t(`risk_${dayRisk.risk}`)} · ${dayRisk.date} · ${dayRisk.summary}`
              : t("riskEmpty")}
          </p>
        )}
        {discovery.kind === "coordinate" && (
          <div className="map-coordinate-hint" role="status">
            {s("tapCoordinate")}
            <button
              type="button"
              onClick={() => setDiscovery({ kind: "idle" })}
            >
              {s("cancel")}
            </button>
          </div>
        )}
        {discovery.kind === "preview" && place && (
          <section className="map-place-preview" aria-label={place.name}>
            <button
              className="map-preview-close"
              type="button"
              aria-label={m("close")}
              onClick={() => setDiscovery({ kind: "idle" })}
            >
              <X size={16} />
            </button>
            <small>
              {place.category ??
                s(place.placeId ? "discoveredPlace" : "customLocation")}
            </small>
            <h3>{place.name}</h3>
            {place.rating !== undefined && (
              <p>{s("placeRating", { rating: place.rating })}</p>
            )}
            {place.address && <p>{place.address}</p>}
            {place.openingHours?.length ? (
              <details>
                <summary>{s("openingHours")}</summary>
                {place.openingHours.map((hours) => (
                  <p key={hours}>{hours}</p>
                ))}
              </details>
            ) : null}
            {place.mapsUri && (
              <a href={place.mapsUri} target="_blank" rel="noopener noreferrer">
                {s("viewDetails")}
              </a>
            )}
            {existing ? (
              <AppButton
                onClick={() => {
                  onDayChange(existing.day);
                  onSelect(existing.id);
                  setDiscovery({ kind: "idle" });
                }}
              >
                {s("viewInPlanner")}
              </AppButton>
            ) : canEdit ? (
              <AppButton
                onClick={() => setDiscovery({ kind: "adding", place })}
              >
                <Plus size={15} />
                {s("addToItinerary")}
              </AppButton>
            ) : (
              <p>{s("readOnly")}</p>
            )}
          </section>
        )}
      </div>
      <Dialog.Root
        open={discovery.kind === "adding"}
        disablePointerDismissal
        onOpenChange={(open) => {
          if (!open && place && !saving)
            setDiscovery({ kind: "preview", place });
        }}
      >
        <Dialog.Portal keepMounted>
          <Dialog.Backdrop className="map-dialog-backdrop" />
          <Dialog.Popup
            className="trip-app-theme map-dialog"
            aria-describedby={undefined}
          >
            <Dialog.Title>{s("addToItinerary")}</Dialog.Title>
            <Dialog.Close
              className="map-dialog-close"
              aria-label={m("close")}
              disabled={saving}
            >
              <X size={18} />
            </Dialog.Close>
            {place && (
              <AddMapActivity
                key={`${trip.id}:${place.placeId}:${place.latitude}:${place.longitude}`}
                trip={trip}
                day={day}
                selectedId={selected?.id}
                place={place}
                mode={routing.mode}
                onBusy={setSaving}
                onCancel={() => setDiscovery({ kind: "preview", place })}
                onAdded={(nextDay, id) => {
                  onDayChange(nextDay);
                  onSelect(id);
                  setDiscovery({ kind: "idle" });
                }}
              />
            )}
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
});
