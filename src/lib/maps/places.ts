import type { PlaceSelection } from "./types";
export async function withPlaceTimeout<T>(request: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      request,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("PLACE_TIMEOUT")), 15000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
export async function resolvePrediction(
  prediction: google.maps.places.PlacePrediction,
): Promise<PlaceSelection> {
  const place = prediction.toPlace();
  return resolvePlace(place);
}
export async function resolvePlace(
  place: google.maps.places.Place,
): Promise<PlaceSelection> {
  await withPlaceTimeout(
    place.fetchFields({
      fields: [
        "id",
        "displayName",
        "location",
        "formattedAddress",
        "rating",
        "primaryTypeDisplayName",
        "regularOpeningHours",
        "googleMapsURI",
      ],
    }),
  );
  if (!place.location || !place.displayName)
    throw new Error("PLACE_UNAVAILABLE");
  return {
    placeId: place.id,
    name: place.displayName,
    latitude: place.location.lat(),
    longitude: place.location.lng(),
    address: place.formattedAddress ?? undefined,
    rating: place.rating ?? undefined,
    category: place.primaryTypeDisplayName ?? undefined,
    openingHours: place.regularOpeningHours?.weekdayDescriptions ?? undefined,
    openingPeriods: place.regularOpeningHours?.periods?.map((period) => ({
      open: {
        day: period.open.day,
        hour: period.open.hour,
        minute: period.open.minute,
      },
      close: period.close
        ? {
            day: period.close.day,
            hour: period.close.hour,
            minute: period.close.minute,
          }
        : undefined,
    })),
    mapsUri: place.googleMapsURI ?? undefined,
  };
}
