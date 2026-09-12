"use client";
import { useTranslations } from "next-intl";
import { MapPin, Sparkles } from "lucide-react";
import type { Activity } from "@/lib/mvp/model";
import { coordinates } from "@/lib/maps/adapters";
export function SchematicMap({
  activities,
  selected,
  onSelect,
  fit = false,
  risk = false,
}: {
  activities: Activity[];
  selected?: Activity;
  onSelect: (id: string) => void;
  fit?: boolean;
  risk?: boolean;
}) {
  const t = useTranslations("mvp");
  const nodes = activities.filter(
    (a) => a.x !== undefined && a.y !== undefined,
  );
  const xs = nodes.map((n) => n.x!),
    ys = nodes.map((n) => n.y!);
  const point = (node: Activity) => ({
    x: fit
      ? 18 +
        ((node.x! - Math.min(...xs)) /
          (Math.max(...xs) - Math.min(...xs) || 1)) *
          64
      : node.x!,
    y: fit
      ? 18 +
        ((node.y! - Math.min(...ys)) /
          (Math.max(...ys) - Math.min(...ys) || 1)) *
          64
      : node.y!,
  });
  return (
    <div className="mvp-route-map">
      <div className="mvp-map-canvas">
        <svg
          viewBox="0 0 600 600"
          fill="none"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            className="mvp-map-water"
            d="M530 -30C400 90 610 210 495 340S480 480 550 650H650V-30Z"
          />
          <path
            className="mvp-map-park"
            d="M140 75L245 95L215 185L105 165Z M90 380L200 350L250 455L125 490Z"
          />
          {[60, 150, 260, 370, 480, 570].map((n) => (
            <path
              key={n}
              className="mvp-map-road"
              d={`M-20 ${n}L620 ${n - 45}M${n} -20L${n - 75} 620`}
            />
          ))}
          <path className="mvp-map-major" d="M-30 420L660 145M85 -30L400 630" />
          {nodes.length > 1 && (
            <polyline
              points={nodes
                .map((n) => `${point(n).x * 6},${point(n).y * 6}`)
                .join(" ")}
              className="mvp-map-route"
            />
          )}
        </svg>
        {nodes.map((node, i) => (
          <button
            key={node.id}
            type="button"
            className="mvp-map-pin"
            style={{ left: `${point(node).x}%`, top: `${point(node).y}%` }}
            data-risk={risk}
            aria-pressed={selected?.id === node.id}
            aria-label={`${i + 1}. ${node.title}`}
            onClick={() => onSelect(node.id)}
          >
            <span>{i + 1}</span>
            <strong>{node.title}</strong>
          </button>
        ))}
        {!nodes.length && (
          <div className="mvp-map-empty">
            <MapPin size={28} />
            <p>{t("noCoordinates")}</p>
          </div>
        )}
        <span className="mvp-map-compass" aria-hidden="true">
          N<br />↑
        </span>
      </div>
      {activities.some((a) => a.x === undefined) && (
        <div className="schematic-activity-list">
          {activities.map((activity) => (
            <button
              type="button"
              key={activity.id}
              aria-pressed={selected?.id === activity.id}
              onClick={() => onSelect(activity.id)}
            >
              {activity.time} · {activity.title}
            </button>
          ))}
        </div>
      )}
      {selected && (
        <div className="mvp-map-selection">
          <span>
            <MapPin size={18} />
          </span>
          <div>
            <small>{t("selected")}</small>
            <strong>{selected.title}</strong>
            <p>
              {selected.place} · {selected.time}
            </p>
            {selected.x === undefined && !coordinates(selected) && (
              <p>{t("noCoordinates")}</p>
            )}
          </div>
          <Sparkles size={18} />
        </div>
      )}
    </div>
  );
}
