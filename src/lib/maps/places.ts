import type { PlaceSelection } from "./types";
export async function resolvePrediction(
  prediction: google.maps.places.PlacePrediction,
): Promise<PlaceSelection> {
  const place = prediction.toPlace();
  await place.fetchFields({ fields: ["id", "displayName", "location"] });
  if (!place.location || !place.displayName)
    throw new Error("PLACE_UNAVAILABLE");
  return {
    placeId: place.id,
    name: place.displayName,
    latitude: place.location.lat(),
    longitude: place.location.lng(),
  };
}
