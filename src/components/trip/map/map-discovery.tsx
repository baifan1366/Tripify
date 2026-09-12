"use client";
import { useEffect, useRef, useState } from "react";
import {
  AdvancedMarker,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import { useTranslations } from "next-intl";
import { Search, X, MapPin } from "lucide-react";
import { resolvePlace, withPlaceTimeout } from "@/lib/maps/places";
import type { PlaceSelection } from "@/lib/maps/types";

/** Explicit search avoids paid requests during dragging and IME composition. */
export function MapDiscovery({
  destination,
  onPlace,
  onCustom,
  customMode,
}: {
  destination: string;
  onPlace: (place: PlaceSelection) => void;
  onCustom: (position: google.maps.LatLngLiteral) => void;
  customMode: boolean;
}) {
  const t = useTranslations("shared");
  const map = useMap();
  const places = useMapsLibrary("places");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<google.maps.places.Place[]>([]);
  const [state, setState] = useState<"idle" | "searching" | "empty" | "error">(
    "idle",
  );
  const [moved, setMoved] = useState(false);
  const sequence = useRef(0);
  const input = useRef<HTMLInputElement>(null);
  const callbacks = useRef({ onPlace, onCustom, customMode });
  useEffect(() => {
    callbacks.current = { onPlace, onCustom, customMode };
  }, [onPlace, onCustom, customMode]);
  useEffect(
    () => () => {
      sequence.current++;
    },
    [],
  );
  useEffect(() => {
    if (!map || !places) return;
    const click = map.addListener(
      "click",
      async (event: google.maps.IconMouseEvent) => {
        if (callbacks.current.customMode && event.latLng) {
          sequence.current++;
          setState("idle");
          event.stop();
          callbacks.current.onCustom(event.latLng.toJSON());
          return;
        }
        if (!event.placeId) return;
        event.stop();
        const request = ++sequence.current;
        setState("searching");
        try {
          const place = await resolvePlace(
            new places.Place({ id: event.placeId }),
          );
          if (request === sequence.current) {
            callbacks.current.onPlace(place);
            setState("idle");
          }
        } catch {
          if (request === sequence.current) setState("error");
        }
      },
    );
    const right = map.addListener(
      "contextmenu",
      (event: google.maps.MapMouseEvent) => {
        if (event.latLng) {
          sequence.current++;
          setState("idle");
          callbacks.current.onCustom(event.latLng.toJSON());
        }
      },
    );
    const drag = map.addListener("dragend", () => setMoved(true));
    return () => {
      click.remove();
      right.remove();
      drag.remove();
    };
  }, [map, places]);
  async function search(area = false) {
    if (!query.trim() || !places || !map) return;
    const request = ++sequence.current;
    setState("searching");
    try {
      const response = await withPlaceTimeout(
        places.Place.searchByText({
          textQuery: area ? query.trim() : `${query.trim()} ${destination}`,
          fields: ["id", "displayName", "location"],
          maxResultCount: 8,
          locationBias: map.getBounds(),
        }),
      );
      if (request !== sequence.current) return;
      setResults(response.places);
      setState(response.places.length ? "idle" : "empty");
      setMoved(false);
    } catch {
      if (request === sequence.current) {
        setResults([]);
        setState("error");
      }
    }
  }
  async function select(place: google.maps.places.Place) {
    const request = ++sequence.current;
    setState("searching");
    try {
      const detail = await resolvePlace(place);
      if (request === sequence.current) {
        onPlace(detail);
        setState("idle");
        const center = { lat: detail.latitude, lng: detail.longitude };
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
          map?.moveCamera({ center });
        else map?.panTo(center);
      }
    } catch {
      if (request === sequence.current) setState("error");
    }
  }
  return (
    <>
      <div className="map-discovery">
        <form
          noValidate
          className="map-search"
          onSubmit={(e) => {
            e.preventDefault();
            void search();
          }}
        >
          <Search size={16} aria-hidden="true" />
          <input
            ref={input}
            aria-label={t("searchIn", { destination })}
            placeholder={t("searchIn", { destination })}
            value={query}
            maxLength={160}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.nativeEvent.isComposing)
                e.preventDefault();
            }}
            onChange={(e) => {
              sequence.current++;
              setQuery(e.target.value);
              setResults([]);
              setState("idle");
            }}
          />
          {query && (
            <button
              type="button"
              aria-label={t("clearSearch")}
              onClick={() => {
                sequence.current++;
                setQuery("");
                setResults([]);
                setState("idle");
                input.current?.focus();
              }}
            >
              <X size={15} />
            </button>
          )}
          <button
            type="submit"
            disabled={!places || !query.trim() || state === "searching"}
            aria-label={t("searchPlace")}
          >
            <Search size={16} />
          </button>
        </form>
        {moved && query.trim() && (
          <button
            className="map-area-search"
            type="button"
            disabled={state === "searching"}
            onClick={() => void search(true)}
          >
            {t("searchArea")}
          </button>
        )}
        {state !== "idle" && (
          <p className="map-search-status" role="status">
            {t(
              state === "searching"
                ? "searchingPlaces"
                : state === "empty"
                  ? "noPlaces"
                  : "placesUnavailable",
            )}
          </p>
        )}
        {results.length > 0 && (
          <div className="map-search-results" aria-label={t("searchResults")}>
            {results.map((place) => (
              <button
                type="button"
                key={place.id}
                onClick={() => void select(place)}
              >
                <MapPin size={14} />
                {place.displayName}
              </button>
            ))}
          </div>
        )}
      </div>
      {results
        .filter((place) => place.location)
        .map((place) => (
          <AdvancedMarker key={place.id} position={place.location} zIndex={1}>
            <button
              className="discovery-pin"
              type="button"
              aria-label={place.displayName ?? t("viewDetails")}
              onClick={() => void select(place)}
            >
              <MapPin size={18} />
            </button>
          </AdvancedMarker>
        ))}
    </>
  );
}
