"use client";
import { useEffect, useRef, useState } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { useTranslations } from "next-intl";
import { useMapsEnabled } from "@/lib/maps/google-map-provider";
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
      {!enabled && <p className="mvp-hint">{t("placesUnavailable")}</p>}
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
    if (!library || !host.current) return;
    const widget = new library.PlaceAutocompleteElement();
    widget.setAttribute("aria-label", t("searchPlace"));
    let active = true;
    const select = async (
      event: google.maps.places.PlacePredictionSelectEvent,
    ) => {
      try {
        const place = await resolvePrediction(event.placePrediction);
        if (active) {
          callback.current(place);
          setError(false);
        }
      } catch {
        if (active) setError(true);
      }
    };
    const failed = () => setError(true);
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
