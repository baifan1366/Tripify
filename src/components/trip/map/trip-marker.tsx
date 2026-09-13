"use client";
import { memo } from "react";
import { AdvancedMarker } from "@vis.gl/react-google-maps";
import { useTranslations } from "next-intl";
import type { Activity } from "@/lib/mvp/model";
import { coordinates } from "@/lib/maps/adapters";
import { activityEnd } from "@/lib/maps/schedule";

export const TripMarker = memo(function TripMarker({
  item,
  index,
  selected,
  hovered,
  onSelect,
  onHover,
}: {
  item: Activity;
  index: number;
  selected: boolean;
  hovered: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  const t = useTranslations("shared");
  const m = useTranslations("mvp");
  return (
    <AdvancedMarker
      position={coordinates(item)!}
      zIndex={selected ? 100 : hovered ? 90 : 10}
      title={t("stopLabel", {
        stop: index,
        title: item.title,
        time: item.time,
      })}
    >
      <button
        type="button"
        className="trip-marker"
        aria-label={t("stopLabel", {
          stop: index,
          title: item.title,
          time: item.time,
        })}
        aria-pressed={selected}
        data-hovered={hovered}
        onClick={() => onSelect(item.id)}
        onMouseEnter={() => onHover(item.id)}
        onMouseLeave={() => onHover(null)}
        onFocus={() => onHover(item.id)}
        onBlur={() => onHover(null)}
      >
        {(selected || hovered) && (
          <span className="trip-marker-ticket">
            <small>
              {m("day", { day: item.day })} / {t("stop", { stop: index })}
            </small>
            <strong>{item.title}</strong>
            {selected && (
              <>
                <span>
                  {item.time} — {activityEnd(item)}
                </span>
                <small>{m("minutes", { count: item.duration })}</small>
              </>
            )}
          </span>
        )}
        <span className="trip-marker-number">{index}</span>
      </button>
    </AdvancedMarker>
  );
});
