"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import type { Trip } from "@/lib/mvp/model";
import { useMvp } from "@/components/mvp/mvp-provider";
import { AppButton, Field } from "@/components/mvp/primitives";
import { mutateSharedTrip, sharedError } from "@/lib/trips/repository";
export function TripSettings({ trip }: { trip: Trip }) {
  const t = useTranslations("shared");
  const m = useTranslations("mvp");
  const { viewer, refreshTrips, setNotice } = useMvp();
  const [draft, setDraft] = useState({
    name: trip.name,
    destination: trip.destination,
    start_date: trip.start,
    end_date: trip.end,
    timezone: trip.timezone,
    budget_total: String(trip.budget),
  });
  const [version, setVersion] = useState(trip.version);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [conflict, setConflict] = useState(false);
  const place = trip.activities.find(
    (a) => a.latitude !== undefined && a.longitude !== undefined,
  );
  if (viewer.id !== trip.createdBy) return null;
  return (
    <details className="shared-trip-settings">
      <summary>{t("editTrip")}</summary>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (pending || conflict) return;
          setPending(true);
          setError("");
          try {
            if (!/^\d+(\.\d{1,2})?$/.test(draft.budget_total))
              throw new Error("INVALID_BUDGET");
            const result = await mutateSharedTrip(
              { ...trip, version },
              "trip.update",
              null,
              { ...draft, budget_total: Number(draft.budget_total) },
            );
            setVersion(result.newVersion);
            setNotice(t("saved"));
            await refreshTrips();
          } catch (e) {
            setError(t(sharedError(e)));
            if (sharedError(e) === "conflict") {
              setConflict(true);
              await refreshTrips().catch(() => {});
            }
          } finally {
            setPending(false);
          }
        }}
      >
        {(
          [
            ["name", "name", "text", 100],
            ["destination", "destination", "text", 120],
            ["start_date", "start", "date", undefined],
            ["end_date", "end", "date", undefined],
            ["timezone", "timezone", "text", 100],
            ["budget_total", "budget", "number", undefined],
          ] as const
        ).map(([field, label, type, maxLength]) => (
          <Field
            key={field}
            label={m(label)}
            name={`shared-${field}`}
            type={type}
            required
            maxLength={maxLength}
            min={type === "number" ? 0 : undefined}
            step={type === "number" ? ".01" : undefined}
            value={draft[field]}
            onChange={(e) => setDraft({ ...draft, [field]: e.target.value })}
          />
        ))}
        {place && (
          <AppButton
            type="button"
            variant="outline"
            disabled={pending}
            onClick={async () => {
              setPending(true);
              setError("");
              try {
                const res = await fetch(
                  `/api/maps/timezone?trip=${trip.id}&activity=${place.id}`,
                );
                if (!res.ok) throw new Error("TIMEZONE_UNAVAILABLE");
                const data = await res.json();
                setDraft((d) => ({ ...d, timezone: data.timezone }));
              } catch {
                setError(t("failed"));
              } finally {
                setPending(false);
              }
            }}
          >
            {t("detectTimezone", { place: place.place })}
          </AppButton>
        )}
        {error && <p role="alert">{error}</p>}
        {conflict && (
          <AppButton
            type="button"
            variant="outline"
            onClick={() => {
              setVersion(trip.version);
              setConflict(false);
              setError("");
            }}
          >
            {t("reviewedVersion", { version: trip.version ?? 0 })}
          </AppButton>
        )}
        <AppButton type="submit" disabled={pending || conflict}>
          {t(pending ? "pending" : "save")}
        </AppButton>
      </form>
    </details>
  );
}
