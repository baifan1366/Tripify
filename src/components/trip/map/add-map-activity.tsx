"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { AppButton, Field } from "@/components/mvp/primitives";
import { useMvp } from "@/components/mvp/mvp-provider";
import {
  activityData,
  mutateSharedTrip,
  sharedError,
} from "@/lib/trips/repository";
import { dayCount, type Trip } from "@/lib/mvp/model";
import { dayActivities, timeMinutes, clockTime } from "@/lib/maps/schedule";
import { placementTime } from "@/lib/maps/placement";
import type { Placement, PlaceSelection, RouteSegment } from "@/lib/maps/types";
import { useAiAsk } from "../ai/use-ai-ask";

export function AddMapActivity({
  trip,
  day: initialDay,
  selectedId,
  place,
  mode,
  onAdded,
  onCancel,
  onBusy,
}: {
  trip: Trip;
  day: number;
  selectedId?: string;
  place: PlaceSelection;
  mode: RouteSegment["mode"];
  onAdded: (day: number, id: string) => void;
  onCancel: () => void;
  onBusy: (busy: boolean) => void;
}) {
  const t = useTranslations("shared"),
    m = useTranslations("mvp");
  const { viewer, refreshTrips, setNotice } = useMvp();
  const [version, setVersion] = useState(trip.version);
  const [day, setDay] = useState(initialDay);
  const [afterId, setAfterId] = useState(selectedId ?? "");
  const items = dayActivities(trip.activities, day);
  const index = afterId ? items.findIndex((a) => a.id === afterId) + 1 : 0;
  const after = items[index - 1],
    before = items[index];
  const [title, setTitle] = useState(place.name);
  const [duration, setDuration] = useState("60");
  const [time, setTime] = useState(() => placementTime(before, after, 60));
  const [cost, setCost] = useState("0");
  const [pending, setPending] = useState(false);
  const [finding, setFinding] = useState(false);
  const [suggestion, setSuggestion] = useState<Placement | null>(null);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [conflict, setConflict] = useState(false);
  const [saved, setSaved] = useState<{ day: number; id: string } | null>(null);
  const abort = useRef<AbortController | null>(null);
  const lock = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const ai = useAiAsk();
  useEffect(() => () => abort.current?.abort(), []);
  const canEdit = viewer.id === trip.createdBy;
  function clearSuggestion() {
    abort.current?.abort();
    setFinding(false);
    setSuggestion(null);
    ai.reset();
  }
  function position(nextDay: number, nextAfter: string) {
    clearSuggestion();
    setDay(nextDay);
    setAfterId(nextAfter);
    const next = dayActivities(trip.activities, nextDay);
    const at = nextAfter ? next.findIndex((a) => a.id === nextAfter) + 1 : 0;
    setTime(placementTime(next[at], next[at - 1], Number(duration) || 60));
  }
  async function findBest() {
    if (
      finding ||
      !Number.isInteger(Number(duration)) ||
      Number(duration) < 1 ||
      Number(duration) > 1440
    )
      return;
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setFinding(true);
    setError("");
    ai.reset();
    try {
      const response = await fetch("/api/maps/placement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(30000),
        ]),
        body: JSON.stringify({
          trip: trip.id,
          version,
          day,
          duration: Number(duration),
          mode,
          latitude: place.latitude,
          longitude: place.longitude,
          openingPeriods: place.openingPeriods,
        }),
      });
      if (response.status === 409) {
        setConflict(true);
        void refreshTrips().catch(() => {});
        throw new Error("VERSION_CONFLICT");
      }
      if (!response.ok) throw new Error("PLACEMENT_UNAVAILABLE");
      const data = (await response.json()) as { candidates: Placement[] };
      if (controller.signal.aborted) return;
      const best = data.candidates[0];
      if (!best) throw new Error("PLACEMENT_UNAVAILABLE");
      setSuggestion(best);
      // Existing read-only agent explains actual candidates; it cannot mutate the itinerary.
      void ai.ask(
        trip.id,
        `Explain this proposed placement of ${place.name} (${Number(duration)} minutes) in one short paragraph. Use only these route and schedule facts: ${JSON.stringify(best)}. Opening status is recurring Google hours, not confirmed holiday hours. Unverified routes must be described as unknown. Do not claim the activity has been added.`,
        best.day,
      );
    } catch (e) {
      if (!controller.signal.aborted)
        setError(
          t(
            sharedError(e) === "conflict" ? "conflict" : "placementUnavailable",
          ),
        );
    } finally {
      if (!controller.signal.aborted) setFinding(false);
    }
  }
  async function reconcile(result: { day: number; id: string }) {
    try {
      await refreshTrips();
      setNotice(t("saved"));
      onAdded(result.day, result.id);
    } catch {
      setError(t("savedRefreshFailed"));
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current || pending || !canEdit || conflict || saved) return;
    const issues: Record<string, string> = {};
    if (!title.trim()) issues.title = m("required");
    if (
      !/^\d{2}:\d{2}$/.test(time) ||
      !Number.isFinite(timeMinutes(time)) ||
      timeMinutes(time) > 1439
    )
      issues.time = m("required");
    if (
      !/^\d+$/.test(duration) ||
      Number(duration) < 1 ||
      Number(duration) > 1440
    )
      issues.duration = m("invalidDuration");
    if (!/^\d+(\.\d{1,2})?$/.test(cost) || Number(cost) > 9999999999.99)
      issues.cost = m("invalidBudget");
    if (afterId && !after) issues.time = t("positionChanged");
    if (
      (after && timeMinutes(time) <= timeMinutes(after.time)) ||
      (before && timeMinutes(time) >= timeMinutes(before.time))
    )
      issues.time = t("positionTime");
    setErrors(issues);
    if (Object.keys(issues).length) {
      formRef.current
        ?.querySelector<HTMLInputElement>(`[name="${Object.keys(issues)[0]}"]`)
        ?.focus();
      return;
    }
    lock.current = true;
    setPending(true);
    onBusy(true);
    setError("");
    try {
      const result = await mutateSharedTrip(
        { ...trip, version },
        "activity.add",
        null,
        activityData({
          id: crypto.randomUUID(),
          day,
          time,
          title: title.trim(),
          place: place.placeId ? place.name : title.trim(),
          duration: Number(duration),
          cost: Number(cost),
          latitude: place.latitude,
          longitude: place.longitude,
          placeId: place.placeId || undefined,
        }),
      );
      if (!result.updatedEntity) throw new Error("MISSING_ACTIVITY");
      const committed = { day, id: result.updatedEntity.id };
      setSaved(committed);
      await reconcile(committed);
    } catch (e) {
      setError(t(sharedError(e)));
      if (sharedError(e) === "conflict") {
        setConflict(true);
        void refreshTrips().catch(() => {});
      }
    } finally {
      lock.current = false;
      setPending(false);
      onBusy(false);
    }
  }
  const overlap =
    (after
      ? Math.max(
          0,
          timeMinutes(after.time) + after.duration - timeMinutes(time),
        )
      : 0) +
    (before
      ? Math.max(
          0,
          timeMinutes(time) + Number(duration) - timeMinutes(before.time),
        )
      : 0);
  return (
    <form ref={formRef} className="map-placement" noValidate onSubmit={submit}>
      <Field
        name="title"
        label={m("activity")}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        error={errors.title}
        maxLength={160}
      />
      <div className="map-placement-row">
        <label>
          {t("placementDay")}
          <select
            value={day}
            disabled={pending || !!saved}
            onChange={(e) => position(Number(e.target.value), "")}
          >
            {Array.from({ length: dayCount(trip.start, trip.end) }, (_, i) => (
              <option key={i} value={i + 1}>
                {m("day", { day: i + 1 })} · {trip.destination}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("addAfter")}
          <select
            value={afterId}
            disabled={pending || !!saved}
            onChange={(e) => position(day, e.target.value)}
          >
            <option value="">{t("dayStart")}</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.time} · {item.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="map-placement-row">
        <Field
          name="time"
          label={m("time")}
          type="time"
          value={time}
          onChange={(e) => {
            clearSuggestion();
            setTime(e.target.value);
          }}
          error={errors.time}
        />
        <Field
          name="duration"
          label={m("duration")}
          type="number"
          min={1}
          max={1440}
          value={duration}
          onChange={(e) => {
            clearSuggestion();
            setDuration(e.target.value);
          }}
          error={errors.duration}
        />
      </div>
      <Field
        name="cost"
        label={`${m("cost")} (${trip.currency})`}
        type="number"
        min={0}
        step="0.01"
        value={cost}
        onChange={(e) => setCost(e.target.value)}
        error={errors.cost}
      />
      <p className="map-placement-hint">
        {t("fixedOnSave")} · {time} —{" "}
        {clockTime(timeMinutes(time) + Number(duration))}
      </p>
      {overlap > 0 && (
        <p className="map-timing-warning" role="status">
          {t("scheduleConflict", { minutes: overlap })}
        </p>
      )}
      <AppButton
        variant="outline"
        disabled={finding || pending || conflict || !!saved}
        onClick={() => void findBest()}
      >
        <Sparkles size={15} />
        {t(finding ? "findingTime" : "findBestTime")}
      </AppButton>
      {suggestion && (
        <div className="map-best-fit" role="status">
          <strong>
            {t("bestFit")} · {m("day", { day: suggestion.day })} ·{" "}
            {suggestion.time}
          </strong>
          <p>
            {suggestion.afterId
              ? t("afterActivity", {
                  title:
                    trip.activities.find((a) => a.id === suggestion.afterId)
                      ?.title ?? "",
                })
              : t("dayStart")}
          </p>
          {suggestion.beforeId && (
            <p>
              {t("beforeActivity", {
                title:
                  trip.activities.find((a) => a.id === suggestion.beforeId)
                    ?.title ?? "",
              })}
            </p>
          )}
          <p>
            {suggestion.detourMinutes !== undefined
              ? t("detour", { minutes: suggestion.detourMinutes })
              : t("travelUnverified")}
          </p>
          <p>
            {t(
              suggestion.opening === "open"
                ? "regularHoursOpen"
                : suggestion.opening === "closed"
                  ? "regularHoursClosed"
                  : "hoursUnknown",
            )}
          </p>
          <p>
            {suggestion.conflictMinutes
              ? t("scheduleConflict", { minutes: suggestion.conflictMinutes })
              : t(
                  suggestion.routesVerified ? "noConflict" : "travelUnverified",
                )}
          </p>
          <AppButton
            variant="outline"
            disabled={pending || conflict || !!saved}
            onClick={() => {
              setDay(suggestion.day);
              setAfterId(suggestion.afterId);
              setTime(suggestion.time);
            }}
          >
            {t("usePlacement")}
          </AppButton>
          {ai.state.status === "working" && <small>{t("aiReviewing")}</small>}
          {ai.state.status === "done" && (
            <p className="map-ai-reason">{ai.state.text}</p>
          )}
          {ai.state.status === "error" && (
            <small>{t("aiPlacementUnavailable")}</small>
          )}
        </div>
      )}
      {error && <p role="alert">{error}</p>}
      {conflict && (
        <AppButton
          variant="outline"
          onClick={() => {
            setVersion(trip.version);
            setConflict(false);
            setError("");
            clearSuggestion();
          }}
        >
          {t("reviewedVersion", { version: trip.version ?? 0 })}
        </AppButton>
      )}
      {saved ? (
        <AppButton disabled={pending} onClick={() => void reconcile(saved)}>
          {t("retry")}
        </AppButton>
      ) : (
        <div className="mvp-form-actions">
          <AppButton variant="outline" disabled={pending} onClick={onCancel}>
            {t("cancel")}
          </AppButton>
          <AppButton type="submit" disabled={pending || conflict || !canEdit}>
            {t(pending ? "pending" : "addToItinerary")}
          </AppButton>
        </div>
      )}
    </form>
  );
}
