"use client";
import { memo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useMvp } from "@/components/mvp/mvp-provider";
import { dateAt, estimatedTotal, type Trip } from "@/lib/mvp/model";
import { TripSwitcher } from "./trip-switcher";

export const TripHeader = memo(function TripHeader({
  trip,
}: {
  trip: Trip;
}) {
  const t = useTranslations("mvp");
  const shared = useTranslations("shared");
  const locale = useLocale();
  const { base } = useMvp();
  const url = (view: string) => `${base}/trips/${trip.id}?view=${view}`;
  const amount = (n: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: trip.currency,
      maximumFractionDigits: 0,
    })
      .formatToParts(n)
      .map((part) =>
        part.type === "currency" && trip.currency === "MYR" ? "RM" : part.value,
      )
      .join("");
  const planned = estimatedTotal(trip);
  return (
    <header className="mvp-trip-header">
      <div>
        <div className="mvp-trip-title">
          <h1>
            <TripSwitcher trip={trip} />
          </h1>
          <span className="mvp-tag">
            {trip.version ? shared("shared") : t("draft")}
          </span>
        </div>
        <p>
          <MapPin size={14} />
          {trip.destination}
          <span>·</span>
          <CalendarDays size={14} />
          {new Intl.DateTimeFormat(locale, {
            month: "short",
            day: "numeric",
            timeZone: "UTC",
          }).format(dateAt(trip.start, 1))}{" "}
          —{" "}
          {new Intl.DateTimeFormat(locale, {
            month: "short",
            day: "numeric",
            timeZone: "UTC",
          }).format(dateAt(trip.end, 1))}
        </p>
      </div>
      <div className="mvp-trip-header-end">
        <Link
          href={url("people")}
          className="mvp-avatar-group"
          aria-label={t("people")}
        >
          {trip.members.slice(0, 4).map((member) => (
            <span key={member.id} title={member.name}>
              {member.name.slice(0, 1)}
            </span>
          ))}
          <Users size={17} aria-hidden="true" />
          <span className="trip-member-count">
            {t("members", { count: trip.members.length })}
          </span>
        </Link>
        <Link href={url("budget")} className="mvp-budget-mini">
          <small>{t("currentEstimate")}</small>
          <strong>
            {amount(planned)}
            <span> / {amount(trip.budget)}</span>
          </strong>
          <span className="trip-budget-track" aria-hidden="true">
            <i
              style={{
                width: `${Math.min(100, trip.budget > 0 ? (planned / trip.budget) * 100 : 0)}%`,
              }}
            />
          </span>
        </Link>
      </div>
    </header>
  );
});
