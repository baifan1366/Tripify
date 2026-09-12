"use client";
import { memo, useState } from "react";
import { useTranslations } from "next-intl";
import { Route, TrainFront, CloudRain, Scan } from "lucide-react";
import type { Activity } from "@/lib/mvp/model";
import { SchematicMap } from "./schematic-map";
import { GoogleCanvas } from "./google-canvas";
import { useMapsEnabled } from "@/lib/maps/google-map-provider";
import { coordinates } from "@/lib/maps/adapters";
import type { RouteSegment } from "@/lib/maps/types";
import type { useRoutes } from "@/lib/maps/use-routes";
import type { WeatherDay } from "@/lib/weather/risk";

export const MapPanel = memo(function MapPanel({
  items,
  selected,
  onSelect,
  hovered,
  onHover,
  routes = [],
  routing,
  dayRisk = null,
}: {
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
    m = useTranslations("mvp");
  const [lens, setLens] = useState<"route" | "transit" | "risk">("route");
  const [fit, setFit] = useState(0);
  const enabled = useMapsEnabled();
  const shared = useTranslations("shared");
  const risky = (dayRisk?.risk ?? "low") !== "low";
  const fallback = <SchematicMap activities={items} selected={selected} onSelect={onSelect} fit={fit > 0} risk={risky} />;
  return (
    <div className="travel-map" data-lens={lens}>
      <div className="travel-map-controls" aria-label={t("map")}>
        {(
          [
            ["route", Route],
            ["transit", TrainFront],
            ["risk", CloudRain],
          ] as const
        ).map(([key, Icon]) => (
          <button
            key={key}
            type="button"
            aria-pressed={lens === key}
            onClick={() => {
              setLens(key);
              if (key === "transit") routing.setMode("TRANSIT");
            }}
          >
            <Icon size={16} aria-hidden="true" />
            {t(key)}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setFit((count) => count + 1)}
          disabled={
            !items.some(
              (item) =>
                coordinates(item) ||
                (item.x !== undefined && item.y !== undefined),
            )
          }
        >
          <Scan size={16} aria-hidden="true" />
          {t("fitRoute")}
        </button>
      </div>
      <div className="travel-route-tools">
        <label>
          {shared("transport")}
          <select
            value={routing.mode}
            onChange={(e) =>
              routing.setMode(e.target.value as RouteSegment["mode"])
            }
          >
            {(["WALK", "DRIVE", "TRANSIT"] as const).map((mode) => (
              <option key={mode} value={mode}>
                {shared(mode)}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={routing.pending || items.length < 2}
          onClick={() => void routing.calculate()}
        >
          {shared(routing.pending ? "calculating" : "calculateRoutes")}
        </button>
        <p>{shared("routeEstimate")}</p>
        {routing.error && <p role="status">{shared("routeUnavailable")}</p>}
      </div>
      {lens === "risk" && (
        <p className="travel-map-context" role="status">
          {dayRisk
            ? `${t(`risk_${dayRisk.risk}`)} · ${dayRisk.date} · ${dayRisk.summary}`
            : t("riskEmpty")}
        </p>
      )}
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
        />
      ) : (
        <>
          <p className="travel-map-context">{shared("mapUnavailable")}</p>
          {fallback}
          <p className="travel-map-footnote">{m("schematic")}</p>
        </>
      )}
    </div>
  );
});
