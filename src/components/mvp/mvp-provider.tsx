"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  emptyDraft,
  type Trip,
  type TripDraft,
} from "@/lib/mvp/model";
import { loadTrips } from "@/lib/trips/repository";
import { createClient } from "@/lib/supabase/client";

type Store = {
  viewer: { id?: string; name: string; email: string };
  loading: boolean;
  loadError: boolean;
  refreshTrips: () => Promise<void>;
  trips: Trip[];
  draft: TripDraft;
  setDraft: Dispatch<SetStateAction<TripDraft>>;
  notice: string;
  setNotice: Dispatch<SetStateAction<string>>;
  base: string;
};
const Context = createContext<Store | null>(null);

export function MvpProvider({
  children,
  viewer,
}: {
  children: React.ReactNode;
  viewer: { id?: string; name: string; email: string };
}) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [draft, setDraft] = useState(emptyDraft);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const generation = useRef(0);
  const refreshTrips = useCallback(async () => {
    const request = ++generation.current;
    try {
      const result = await loadTrips();
      if (request === generation.current) {
        // Preserve array identity when nothing changed so memoized panels
        // skip re-renders on every poll.
        setTrips((prev) =>
          JSON.stringify(prev) === JSON.stringify(result) ? prev : result,
        );
        setLoadError(false);
      }
    } catch (error) {
      if (request === generation.current) setLoadError(true);
      throw error;
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, []);
  // Per-instance topic: the browser client is a singleton and
  // RealtimeClient.channel() reuses an existing topic, which would throw
  // when calling .on() on an already-subscribed channel after remounts.
  const instance = useRef(crypto.randomUUID());
  const failCount = useRef(0);
  useEffect(() => {
    const refresh = () => {
      void refreshTrips()
        .then(() => {
          failCount.current = 0;
        })
        .catch(() => {
          failCount.current++;
        });
    };
    refresh();
    const client = createClient();
    let channel: ReturnType<typeof client.channel> | null = null;
    try {
      channel = client
        .channel(`trip-workspace-reads:${instance.current}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "trips" },
          refresh,
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "trip_members" },
          refresh,
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "trip_activities" },
          refresh,
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") refresh();
        });
    } catch {
      channel = null;
    }
    // Deletes may not reach a removed member under RLS. Realtime first;
    // poll as backup with backoff on failures. Hidden tabs skip.
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (!document.hidden) refresh();
      const delay = Math.min(60000, 15000 * 2 ** Math.min(failCount.current, 2));
      timer = setTimeout(tick, delay);
    };
    timer = setTimeout(tick, 15000);
    window.addEventListener("focus", refresh);
    return () => {
      // This is a request generation, not a DOM ref; invalidate pending reads on cleanup.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      generation.current++;
      clearTimeout(timer);
      window.removeEventListener("focus", refresh);
      if (channel) void client.removeChannel(channel).catch(() => {});
    };
  }, [refreshTrips]);
  const store = useMemo(
    () => ({
      viewer,
      loading,
      loadError,
      refreshTrips,
      trips,
      draft,
      setDraft,
      notice,
      setNotice,
      base: "/dashboard",
    }),
    [viewer, loading, loadError, refreshTrips, trips, draft, setDraft, notice, setNotice],
  );
  return <Context.Provider value={store}>{children}</Context.Provider>;
}
export function useMvp() {
  const value = useContext(Context);
  if (!value) throw new Error("Missing MvpProvider");
  return value;
}
