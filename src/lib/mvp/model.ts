export type Activity = {
  id: string;
  day: number;
  time: string;
  title: string;
  place: string;
  cost: number;
  duration: number;
  x?: number;
  y?: number;
};
export type Member = {
  id: string;
  name: string;
  interests: string;
  pace: "slow" | "balanced" | "active";
  budget: number;
  dislikes: string;
  food: string;
};
export type Trip = {
  id: string;
  name: string;
  destination: string;
  start: string;
  end: string;
  currency: string;
  budget: number;
  timezone: string;
  demo: boolean;
  activities: Activity[];
  members: Member[];
};
export type Message = { id: string; author: string; text: string };
export type ProposalState = "voting" | "approved" | "applied" | "rejected";
export type TripDraft = {
  name: string;
  destination: string;
  start: string;
  end: string;
  currency: string;
  budget: string;
  timezone: string;
};

export const emptyDraft: TripDraft = {
  name: "",
  destination: "",
  start: "",
  end: "",
  currency: "MYR",
  budget: "",
  timezone: "Asia/Kuala_Lumpur",
};
export function dayCount(start: string, end: string) {
  return (
    Math.round(
      (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) /
        86400000,
    ) + 1
  );
}
export function dateAt(start: string, day: number) {
  const value = new Date(`${start}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + day - 1);
  return value;
}
export function estimatedTotal(trip: Trip) {
  return trip.activities.reduce((total, activity) => total + activity.cost, 0);
}

export function exampleTrip(): Trip {
  return {
    id: "tokyo",
    name: "Tokyo, together",
    destination: "Tokyo, Japan",
    start: "2026-10-20",
    end: "2026-10-24",
    currency: "MYR",
    budget: 5000,
    timezone: "Asia/Tokyo",
    demo: true,
    members: [
      {
        id: "alice",
        name: "Alice",
        interests: "Cafés · Photography",
        pace: "balanced",
        budget: 1200,
        dislikes: "Long queues",
        food: "Vegetarian options",
      },
      {
        id: "bob",
        name: "Bob",
        interests: "Anime · Gaming",
        pace: "active",
        budget: 1500,
        dislikes: "Too much shopping",
        food: "Ramen",
      },
      {
        id: "charlie",
        name: "Charlie",
        interests: "Culture · Architecture",
        pace: "slow",
        budget: 1000,
        dislikes: "Long walks",
        food: "Local food",
      },
      {
        id: "david",
        name: "David",
        interests: "Nature · Food",
        pace: "balanced",
        budget: 1300,
        dislikes: "Rushed meals",
        food: "Anything local",
      },
    ],
    activities: [
      {
        id: "arrival",
        day: 1,
        time: "14:00",
        title: "Arrive in Tokyo",
        place: "Haneda Airport",
        cost: 2400,
        duration: 60,
      },
      {
        id: "hotel",
        day: 1,
        time: "16:00",
        title: "Check in & settle in",
        place: "Shinjuku",
        cost: 1000,
        duration: 60,
      },
      {
        id: "asakusa",
        day: 2,
        time: "10:00",
        title: "A morning in Asakusa",
        place: "Sensō-ji",
        cost: 300,
        duration: 120,
      },
      {
        id: "teamlab",
        day: 3,
        time: "09:00",
        title: "teamLab Borderless",
        place: "Azabudai Hills",
        cost: 120,
        duration: 120,
        x: 61,
        y: 66,
      },
      {
        id: "sky",
        day: 3,
        time: "14:00",
        title: "Shibuya Sky",
        place: "Shibuya Scramble Square",
        cost: 100,
        duration: 90,
        x: 34,
        y: 36,
      },
      {
        id: "shopping",
        day: 3,
        time: "16:00",
        title: "Shibuya shopping",
        place: "Cat Street",
        cost: 80,
        duration: 90,
        x: 39,
        y: 23,
      },
      {
        id: "dinner",
        day: 3,
        time: "18:30",
        title: "Dinner together",
        place: "Ebisu",
        cost: 120,
        duration: 90,
        x: 42,
        y: 79,
      },
    ],
  };
}

// A deterministic UI fixture, never a production approval/application engine.
export function applyDemoCompromise(trip: Trip): Trip {
  if (!trip.demo) return trip;
  return {
    ...trip,
    activities: trip.activities
      .map((activity) =>
        activity.id === "shopping"
          ? {
              ...activity,
              id: "cafe",
              title: "A café break",
              place: "Near Shibuya",
              time: "13:00",
              cost: 100,
              x: 31,
              y: 45,
            }
          : activity.id === "sky"
            ? { ...activity, time: "15:00" }
            : activity.id === "teamlab"
              ? { ...activity, time: "09:30" }
              : activity,
      )
      .sort((a, b) => a.day - b.day || a.time.localeCompare(b.time)),
  };
}
