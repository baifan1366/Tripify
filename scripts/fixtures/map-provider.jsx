import React, { createContext, useContext, useState } from "react";
const Context = createContext(null);
const initial = {
  id: "55555555-5555-4555-8555-555555555555",
  createdBy: "owner",
  version: 1,
  name: "Kyoto together",
  destination: "Kyoto",
  start: "2026-10-20",
  end: "2026-10-21",
  currency: "JPY",
  budget: 5000,
  timezone: "Asia/Tokyo",
  members: [],
  activities: [
    {
      id: "a",
      day: 1,
      time: "09:00",
      title: "Temple",
      place: "Kyoto",
      latitude: 35.001,
      longitude: 135.761,
      duration: 90,
      cost: 0,
    },
    {
      id: "b",
      day: 1,
      time: "10:30",
      title: "Lunch",
      place: "Kyoto",
      latitude: 35.006,
      longitude: 135.764,
      duration: 60,
      cost: 20,
    },
  ],
};
window.mapDb = JSON.parse(
  sessionStorage.getItem("map-test-trip") || JSON.stringify(initial),
);
window.mapWrites = [];
export function createClient() {
  return {
    rpc: async (name, args) => {
      window.mapWrites.push(args);
      await new Promise((r) => setTimeout(r, 150));
      if (window.failSave) return { error: { message: "NETWORK" } };
      if (args.p_expected_version !== window.mapDb.version)
        return { error: { message: "VERSION_CONFLICT" } };
      const d = args.p_data;
      const id = crypto.randomUUID();
      window.mapDb.activities.push({
        id,
        day: d.day_number,
        time: d.start_time,
        title: d.title,
        place: d.location_name,
        duration: d.duration_minutes,
        cost: d.estimated_cost,
        latitude: d.latitude,
        longitude: d.longitude,
        placeId: d.google_place_id,
      });
      window.mapDb.version++;
      sessionStorage.setItem("map-test-trip", JSON.stringify(window.mapDb));
      return {
        data: { newVersion: window.mapDb.version, updatedEntity: { id } },
      };
    },
  };
}
export function Provider({ children }) {
  const [trip, setTrip] = useState(window.mapDb);
  const [notice, setNotice] = useState("");
  const value = {
    viewer: { id: "owner" },
    setNotice,
    refreshTrips: async () => {
      if (window.failRefresh) throw Error("NETWORK");
      setTrip(structuredClone(window.mapDb));
    },
  };
  return (
    <Context.Provider value={value}>
      {children(trip)}
      <p role="status">{notice}</p>
    </Context.Provider>
  );
}
export const useMvp = () => useContext(Context);
