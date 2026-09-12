"use client";
import { memo, useState, useEffect, useRef, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Clock3, MapPin, Plus, Route } from "lucide-react";
import { type Trip, type Activity } from "@/lib/mvp/model";
import { useMvp } from "@/components/mvp/mvp-provider";
import { AppButton, Field } from "@/components/mvp/primitives";
import {
  activityData,
  mutateSharedTrip,
  sharedError,
} from "@/lib/trips/repository";
import { PlacesField } from "../map/places-field";
import type { PlaceSelection } from "@/lib/maps/types";
import type { RouteSegment } from "@/lib/maps/types";
export const DayTimeline = memo(function DayTimeline({
  trip,
  day,
  items,
  selected,
  onSelect,
  hovered,
  onHover,
  routes = [],
}: {
  trip: Trip;
  day: number;
  items: Activity[];
  selected?: string;
  onSelect: (id: string) => void;
  hovered?: string | null;
  onHover: (id: string | null) => void;
  routes?: RouteSegment[];
}) {
  const t = useTranslations("mvp");
  const locale = useLocale();
  const w = useTranslations("dock");
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    root.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
      behavior: "instant",
    });
  }, [selected]);
  const { setNotice, viewer, refreshTrips } = useMvp();
  const shared = useTranslations("shared");
  const canEdit = trip.createdBy === viewer.id;
  const [pending, setPending] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [location, setLocation] = useState("");
  const [place, setPlace] = useState<PlaceSelection | null>(null);
  const [editing, setEditing] = useState<Activity | null>(null);
  const [editVersion, setEditVersion] = useState(trip.version);
  const [conflict, setConflict] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !canEdit || conflict) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const errors: Record<string, string> = {};
    for (const key of ["title", "place", "time"])
      if (!String(data.get(key) ?? "").trim()) errors[key] = t("required");
    if (
      !/^\d+(\.\d{1,2})?$/.test(String(data.get("cost"))) ||
      !Number.isFinite(Number(data.get("cost")))
    )
      errors.cost = t("invalidBudget");
    if (
      !/^\d+$/.test(String(data.get("duration"))) ||
      Number(data.get("duration")) < 1 ||
      Number(data.get("duration")) > 1440
    )
      errors.duration = t("invalidDuration");
    setErrors(errors);
    if (Object.keys(errors).length) {
      form
        .querySelector<HTMLInputElement>(`[name="${Object.keys(errors)[0]}"]`)
        ?.focus();
      return;
    }
    const activity: Activity = {
      id: crypto.randomUUID(),
      day: editing?.day ?? day,
      time: String(data.get("time")),
      title: String(data.get("title")).trim(),
      place: String(data.get("place")).trim(),
      cost: Number(data.get("cost")),
      duration: Number(data.get("duration")),
      latitude: place?.latitude,
      longitude: place?.longitude,
      placeId: place?.placeId,
    };
    setPending(true);
    setSaveError("");
    try {
      const result = await mutateSharedTrip(
        { ...trip, version: editVersion },
        editing ? "activity.update" : "activity.add",
        editing?.id ?? null,
        activityData(activity),
      );
      if (result.updatedEntity) onSelect(result.updatedEntity.id);
      setAdding(false);
      await refreshTrips();
      setAdding(false);
      setLocation("");
      setPlace(null);
      setNotice(shared("saved"));
    } catch (e) {
      setSaveError(shared(sharedError(e)));
      if (sharedError(e) === "conflict") {
        setConflict(true);
        void refreshTrips().catch(() => {});
      }
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="mvp-timeline" ref={root}>
      {items.map((item, i) => (
        <div key={item.id} className="mvp-timeline-stop">
          <div className="mvp-timeline-dot">{i + 1}</div>
          <button
            type="button"
            className="mvp-activity-card"
            aria-pressed={selected === item.id}
            onClick={() => onSelect(item.id)}
            data-hovered={hovered === item.id}
            onMouseEnter={() => onHover(item.id)}
            onMouseLeave={() => onHover(null)}
            onFocus={() => onHover(item.id)}
            onBlur={() => onHover(null)}
          >
            <span className="mvp-activity-time">
              {item.time}
              <span>
                <Clock3 size={12} />
                {t("minutes", { count: item.duration })}
              </span>
            </span>
            <strong>{item.title}</strong>
            <small>
              <MapPin size={12} />
              {item.place}
            </small>
            <span className="mvp-activity-bottom">
              {new Intl.NumberFormat(locale, {
                style: "currency",
                currency: trip.currency,
                maximumFractionDigits: 2,
              }).format(item.cost)}
              <span>↗</span>
            </span>
          </button>
          {canEdit && selected === item.id && (
            <div className="journey-edit-actions">
              <AppButton
                variant="outline"
                disabled={pending}
                onClick={() => {
                  setEditing(item);
                  setEditVersion(trip.version);
                  setLocation(item.place);
                  setPlace(
                    item.placeId &&
                      item.latitude !== undefined &&
                      item.longitude !== undefined
                      ? {
                          placeId: item.placeId,
                          name: item.place,
                          latitude: item.latitude,
                          longitude: item.longitude,
                        }
                      : null,
                  );
                  setAdding(true);
                  setConflict(false);
                  setSaveError("");
                  setRemoving(null);
                }}
              >
                {shared("editActivity")}
              </AppButton>
              {removing === item.id ? (
                <>
                  <span>
                    {shared("confirmActivityRemove", { title: item.title })}
                  </span>
                  <AppButton
                    variant="outline"
                    disabled={pending}
                    onClick={() => setRemoving(null)}
                  >
                    {shared("cancel")}
                  </AppButton>
                  <AppButton
                    disabled={pending || conflict}
                    onClick={async () => {
                      setPending(true);
                      setSaveError("");
                      try {
                        await mutateSharedTrip(
                          { ...trip, version: editVersion },
                          "activity.remove",
                          item.id,
                          {},
                        );
                        setRemoving(null);
                        await refreshTrips();
                      } catch (e) {
                        setSaveError(shared(sharedError(e)));
                        if (sharedError(e) === "conflict") {
                          setConflict(true);
                          await refreshTrips().catch(() => {});
                        }
                      } finally {
                        setPending(false);
                      }
                    }}
                  >
                    {shared("remove")}
                  </AppButton>
                </>
              ) : (
                <AppButton
                  variant="outline"
                  disabled={pending}
                  onClick={() => {
                    setRemoving(item.id);
                    setEditVersion(trip.version);
                    setConflict(false);
                  }}
                >
                  {shared("remove")}
                </AppButton>
              )}
            </div>
          )}
          {i < items.length - 1 && (
            <div className="journey-segment">
              <Route size={14} aria-hidden="true" />
              <span>
                {(() => {
                  const segment = routes.find(
                    (r) => r.from === item.id && r.to === items[i + 1].id,
                  );
                  return segment
                    ? `${shared(segment.mode)} · ${t("minutes", { count: Math.ceil(segment.seconds / 60) })} · ${new Intl.NumberFormat(locale, { style: "unit", unit: "kilometer", maximumFractionDigits: 1 }).format(segment.meters / 1000)}`
                    : w("transportPending");
                })()}
              </span>
            </div>
          )}
        </div>
      ))}
      {!items.length && (
        <div className="mvp-inline-empty">
          <p>{w("emptyDay")}</p>
        </div>
      )}
      {canEdit &&
        (adding ? (
          <form
            key={editing?.id ?? "new"}
            className="mvp-activity-form"
            noValidate
            onSubmit={submit}
          >
            {editing && <p>{editing.title} · {t("day", { day: editing.day })}</p>}
            <Field
              label={t("activity")}
              name="title"
              required
              maxLength={160}
              error={errors.title}
              defaultValue={editing?.title}
            />
            <PlacesField
              value={location}
              onChange={(value) => {
                setLocation(value);
                setPlace(null);
              }}
              onSelect={(value) => {
                setPlace(value);
                setLocation(value.name);
              }}
              error={errors.place}
            />
            <Field
              label={t("time")}
              name="time"
              type="time"
              required
              error={errors.time}
              defaultValue={editing?.time}
            />
            <Field
              label={`${t("cost")} (${trip.currency})`}
              name="cost"
              type="number"
              min="0"
              step=".01"
              defaultValue={editing?.cost ?? "0"}
              error={errors.cost}
            />
            <Field
              label={t("duration")}
              name="duration"
              type="number"
              min="1"
              max="1440"
              defaultValue={editing?.duration ?? "60"}
              error={errors.duration}
            />
            <div className="mvp-form-actions">
              <AppButton
                variant="outline"
                disabled={pending}
                onClick={() => setAdding(false)}
              >
                {t("close")}
              </AppButton>
              <AppButton type="submit" disabled={pending || conflict}>
                {shared(pending ? "pending" : "save")}
              </AppButton>
            </div>
          </form>
        ) : (
          <AppButton
            variant="outline"
            className="mvp-add-activity"
            onClick={() => {
              setEditing(null);
              setLocation("");
              setPlace(null);
              setEditVersion(trip.version);
              setConflict(false);
              setSaveError("");
              setAdding(true);
            }}
          >
            <Plus size={16} />
            {t("addActivity")}
          </AppButton>
        ))}
      {!canEdit && <p className="decision-quiet">{shared("readOnly")}</p>}
      {saveError && <p role="alert">{saveError}</p>}
      {conflict && (
        <AppButton
          variant="outline"
          onClick={() => {
            setEditVersion(trip.version);
            setConflict(false);
            setSaveError("");
          }}
        >
          {shared("reviewedVersion", { version: trip.version ?? 0 })}
        </AppButton>
      )}
    </div>
  );
});
