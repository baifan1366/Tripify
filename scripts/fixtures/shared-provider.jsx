import React, { createContext, useContext, useState } from "react";
import { database, owner, tripId } from "./shared-backend";
import { emptyDraft } from "../../src/lib/mvp/model";
const Context = createContext(null);
export function Provider({ children }) {
  const [draft, setDraft] = useState(emptyDraft);
  const [notice, setNotice] = useState("");
  const [trip, setTrip] = useState({
    id: tripId,
    createdBy: owner,
    version: 1,
    name: "Shared Tokyo · 一个真正的共享行程",
    destination: "Tokyo",
    start: "2026-10-20",
    end: "2026-10-24",
    currency: "MYR",
    budget: 5000,
    timezone: "Asia/Tokyo",
    demo: false,
    activities: [
      {
        id: "66666666-6666-4666-8666-666666666666",
        day: 1,
        time: "09:00",
        title: "Museum",
        place: "Tokyo",
        duration: 90,
        cost: 20,
      },
    ],
    members: [
      {
        id: owner,
        name: "Tan",
        interests: "",
        dislikes: "",
        food: "",
        pace: "balanced",
        budget: 0,
      },
      {
        id: "other",
        name: "Alice",
        interests: "",
        dislikes: "",
        food: "",
        pace: "balanced",
        budget: 0,
      },
    ],
  });
  const value = {
    draft,
    setDraft,
    demo: false,
    viewer: { id: owner, name: "Tan", email: "" },
    trips: [trip],
    base: "/dashboard",
    notice,
    setNotice,
    refreshTrips: async () =>
      setTrip((t) => ({
        ...t,
        version: database.version,
        members: t.members.filter((m) => !database.removed.includes(m.id)),
      })),
    proposal: "voting",
    messages: {},
    setMessages: () => {},
    updateTrip: () => {},
  };
  return (
    <Context.Provider value={value}>
      {children(trip)}
      <p role="status">{notice}</p>
    </Context.Provider>
  );
}
export const useMvp = () => useContext(Context);
