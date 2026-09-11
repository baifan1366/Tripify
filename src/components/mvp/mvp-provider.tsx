"use client";

import {
  createContext,
  useContext,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  exampleTrip,
  emptyDraft,
  type Trip,
  type TripDraft,
  type Message,
  type ProposalState,
} from "@/lib/mvp/model";

type Store = {
  demo: boolean;
  viewer: { name: string; email: string };
  trips: Trip[];
  setTrips: Dispatch<SetStateAction<Trip[]>>;
  draft: TripDraft;
  setDraft: Dispatch<SetStateAction<TripDraft>>;
  messages: Record<string, Message[]>;
  setMessages: Dispatch<SetStateAction<Record<string, Message[]>>>;
  proposal: ProposalState;
  setProposal: Dispatch<SetStateAction<ProposalState>>;
  notice: string;
  setNotice: Dispatch<SetStateAction<string>>;
  base: string;
  updateTrip: (trip: Trip) => void;
};
const Context = createContext<Store | null>(null);

export function MvpProvider({
  children,
  demo,
  viewer,
}: {
  children: React.ReactNode;
  demo: boolean;
  viewer: { name: string; email: string };
}) {
  const [trips, setTrips] = useState<Trip[]>(() =>
    demo ? [exampleTrip()] : [],
  );
  const [draft, setDraft] = useState(emptyDraft);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [proposal, setProposal] = useState<ProposalState>("voting");
  const [notice, setNotice] = useState("");
  return (
    <Context.Provider
      value={{
        demo,
        viewer,
        trips,
        setTrips,
        draft,
        setDraft,
        messages,
        setMessages,
        proposal,
        setProposal,
        notice,
        setNotice,
        base: demo ? "/demo" : "/dashboard",
        updateTrip: (trip) =>
          setTrips((all) => all.map((t) => (t.id === trip.id ? trip : t))),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useMvp() {
  const value = useContext(Context);
  if (!value) throw new Error("Missing MvpProvider");
  return value;
}
