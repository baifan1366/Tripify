"use client";
import { useEffect, useRef, useState } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { useTranslations } from "next-intl";
import { useMapsEnabled } from "@/lib/maps/google-map-provider";
import { debugLog } from "@/lib/debug";
import { resolvePrediction } from "@/lib/maps/places";
import type { PlaceSelection } from "@/lib/maps/types";
import { Field } from "@/components/mvp/primitives";
export function PlacesField({
  value,
  onChange,
  onSelect,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  onSelect: (place: PlaceSelection) => void;
  error?: string;
}) {
  const t = useTranslations("shared");
  const m = useTranslations("mvp");
  const enabled = useMapsEnabled();
  // Missing key (never configured) vs load failure need different fixes,
  // so they get different messages instead of one generic hint.
  const hasKey = !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  return (
    <div className="places-field">
      {enabled && <SearchPlace onSelect={onSelect} />}
      <Field
        label={m("place")}
        name="place"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={200}
        required
        error={error}
      />
      {!enabled && (
        <p className="mvp-hint">
          {t(hasKey ? "placesUnavailable" : "placesUnconfigured")}
        </p>
      )}
    </div>
  );
}
function SearchPlace({
  onSelect,
}: {
  onSelect: (place: PlaceSelection) => void;
}) {
  const library = useMapsLibrary("places");
  const host = useRef<HTMLDivElement>(null);
  const callback = useRef(onSelect);
  const [error, setError] = useState(false);
  const t = useTranslations("shared");
  useEffect(() => {
    callback.current = onSelect;
  }, [onSelect]);
  useEffect(() => {
    if (!library) {
      debugLog("maps", "places library not loaded yet");
      return;
    }
    if (!host.current) return;
    debugLog("maps", "places widget mounting");
    const widget = new library.PlaceAutocompleteElement();
    widget.setAttribute("aria-label", t("searchPlace"));
    let active = true;
    const select = async (
      event: google.maps.places.PlacePredictionSelectEvent,
    ) => {
      try {
        const place = await resolvePrediction(event.placePrediction);
        debugLog("maps", "place resolved", {
          name: place.name,
          hasCoords: place.latitude !== undefined,
        });
        if (active) {
          callback.current(place);
          setError(false);
        }
      } catch {
        console.warn("[tripify:maps] place resolve failed");
        if (active) setError(true);
      }
    };
    const failed = () => {
      console.warn("[tripify:maps] places widget error");
      setError(true);
    };
    widget.addEventListener("gmp-select", select);
    widget.addEventListener("gmp-error", failed);
    host.current.appendChild(widget);
    return () => {
      active = false;
      widget.removeEventListener("gmp-select", select);
      widget.removeEventListener("gmp-error", failed);
      widget.remove();
    };
  }, [library, t]);
  return (
    <>
      <div ref={host} />
      {error && <p role="status">{t("placesUnavailable")}</p>}
    </>
  );
}
