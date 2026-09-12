"use client";
import { memo, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { dateAt, dayCount, type Trip } from "@/lib/mvp/model";

export const DayNavigator = memo(function DayNavigator({
  trip,
  day,
  onChange,
}: {
  trip: Trip;
  day: number;
  onChange: (day: number) => void;
}) {
  const t = useTranslations("mvp"),
    w = useTranslations("dock"),
    locale = useLocale();
  const strip = useRef<HTMLDivElement>(null);
  const count = dayCount(trip.start, trip.end);
  const format = new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  useEffect(() => {
    strip.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
      behavior: "instant",
    });
  }, [day]);
  return (
    <div className="journey-days">
      <div className="journey-day-controls">
        <button
          type="button"
          disabled={day === 1}
          onClick={() => onChange(day - 1)}
          aria-label={w("previousDay")}
        >
          <ChevronLeft size={18} />
        </button>
        <label className="journey-day-jump">
          <CalendarDays size={16} aria-hidden="true" />
          <select
            aria-label={w("chooseDay")}
            value={day}
            onChange={(e) => onChange(Number(e.target.value))}
          >
            {Array.from({ length: count }, (_, i) => (
              <option key={i} value={i + 1}>
                {t("day", { day: i + 1 })} ·{" "}
                {format.format(dateAt(trip.start, i + 1))}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={day === count}
          onClick={() => onChange(day + 1)}
          aria-label={w("nextDay")}
        >
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="journey-day-strip" ref={strip} aria-label={w("journey")}>
        {Array.from({ length: count }, (_, i) => (
          <button
            type="button"
            key={i}
            aria-pressed={day === i + 1}
            onClick={() => onChange(i + 1)}
          >
            <span>{t("day", { day: i + 1 })}</span>
            <small>{format.format(dateAt(trip.start, i + 1))}</small>
          </button>
        ))}
      </div>
    </div>
  );
});
