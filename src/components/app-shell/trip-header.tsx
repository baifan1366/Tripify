"use client";
import { memo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarDays, MapPin, Share2, Users } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useMvp } from "@/components/mvp/mvp-provider";
import { AppButton, Field } from "@/components/mvp/primitives";
import { AppPopover } from "@/components/ui/app-popover";
import { createClient } from "@/lib/supabase/client";
import { sharedError } from "@/lib/trips/repository";
import { dateAt, estimatedTotal, type Trip } from "@/lib/mvp/model";
import { TripSwitcher } from "./trip-switcher";

export const TripHeader = memo(function TripHeader({
  trip,
  selectedDay,
}: {
  trip: Trip;
  selectedDay?: number;
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
          {typeof selectedDay === "number" && (
            <>
              <span>·</span>
              <span className="mvp-tag">{t("day", { day: selectedDay })}</span>
            </>
          )}
        </p>
      </div>
      <div className="mvp-trip-header-end">
        <ShareTripButton trip={trip} />
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

const ShareTripButton = memo(function ShareTripButton({
  trip,
}: {
  trip: Trip;
}) {
  const shared = useTranslations("shared");
  const d = useTranslations("dock");
  const { viewer, setNotice } = useMvp();
  const [token, setToken] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  // Same rule as People: only the creator can mint invite codes (the RPC
  // enforces this server-side too; non-creators get no button at all).
  if (viewer.id !== trip.createdBy) return null;
  async function invite() {
    setPending(true);
    setError("");
    try {
      const result = await createClient().rpc("trip_invite_create", {
        p_trip: trip.id,
      });
      if (result.error) throw result.error;
      setToken(result.data.token);
    } catch (e) {
      setError(shared(sharedError(e)));
    } finally {
      setPending(false);
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(token);
      setNotice(shared("copied"));
    } catch {
      setError(shared("failed"));
    }
  }
  return (
    <AppPopover
      className="mvp-share-trigger"
      label={d("shareTrip")}
      trigger={
        <>
          <Share2 size={16} aria-hidden="true" />
          {d("shareTrip")}
        </>
      }
    >
      <div className="mvp-share-panel">
        {!token ? (
          <>
            <p className="mvp-muted">{shared("inviteHint")}</p>
            <AppButton disabled={pending} onClick={() => void invite()}>
              {shared("invite")}
            </AppButton>
          </>
        ) : (
          <>
            <Field
              label={shared("code")}
              value={token}
              readOnly
              onFocus={(e) => e.target.select()}
              hint={shared("inviteHint")}
            />
            <div className="mvp-form-actions">
              <AppButton
                variant="outline"
                disabled={pending}
                onClick={() => void invite()}
              >
                {shared("invite")}
              </AppButton>
              <AppButton disabled={pending} onClick={() => void copy()}>
                {shared("copy")}
              </AppButton>
            </div>
          </>
        )}
        {pending && <p role="status">{shared("pending")}</p>}
        {error && <p role="alert">{error}</p>}
      </div>
    </AppPopover>
  );
});
