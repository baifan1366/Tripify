"use client";
import { memo } from "react";
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
  const count = dayCount(trip.start, trip.end);
  const short = new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  const weekday = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    timeZone: "UTC",
  });
  const heroDate = dateAt(trip.start, day);
  const heroLabel = `${t("day", { day })} · ${weekday.format(heroDate).toUpperCase()} ${short.format(heroDate)}`;
  const neighbours = [day - 1, day, day + 1];
  return (
    <div className="journey-days">
      <div className="journey-hero">
        <p className="journey-hero-eyebrow">{w("journey")}</p>
        <h3 className="journey-hero-title">{heroLabel}</h3>
        <p className="journey-hero-sub">
          {short.format(dateAt(trip.start, 1))} —{" "}
          {short.format(dateAt(trip.start, count))} ·{" "}
          {t("days", { count })}
        </p>
      </div>
      <div className="journey-neighbours">
        <button
          type="button"
          disabled={day === 1}
          onClick={() => onChange(day - 1)}
          aria-label={w("previousDay")}
        >
          <ChevronLeft size={18} />
        </button>
        <div className="journey-neighbour-track" role="group" aria-label={w("journey")}>
          {neighbours.map((d) => {
            if (d < 1 || d > count)
              return <span key={d} aria-hidden="true" />;
            const date = dateAt(trip.start, d);
            return (
              <button
                type="button"
                key={d}
                className="journey-neighbour"
                data-current={d === day}
                aria-pressed={d === day}
                aria-label={`${t("day", { day: d })} · ${short.format(date)}`}
                onClick={() => onChange(d)}
              >
                <span>{d === day ? short.format(date) : weekday.format(date)}</span>
                <small>
                  {d === day
                    ? weekday.format(date)
                    : short.format(date).split(" ").pop()}
                </small>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          disabled={day === count}
          onClick={() => onChange(day + 1)}
          aria-label={w("nextDay")}
        >
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="journey-jump">
        <CalendarDays size={15} aria-hidden="true" />
        <select
          aria-label={w("chooseDay")}
          value={day}
          onChange={(e) => onChange(Number(e.target.value))}
        >
          {Array.from({ length: count }, (_, i) => (
            <option key={i} value={i + 1}>
              {t("day", { day: i + 1 })} ·{" "}
              {short.format(dateAt(trip.start, i + 1))}
            </option>
          ))}
        </select>
      </div>
      {count <= 7 && (
        <div className="journey-rail-legacy" aria-hidden="true" tabIndex={-1}>
          {Array.from({ length: count }, (_, i) => (
            <button
              type="button"
              key={i}
              aria-pressed={day === i + 1}
              onClick={() => onChange(i + 1)}
              tabIndex={-1}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
