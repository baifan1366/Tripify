"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { useMvp } from "@/components/mvp/mvp-provider";
import type { WidgetId } from "./widget-registry";

export interface ViewerPresence {
  userId: string;
  name: string;
  widget: WidgetId;
  at: number;
}

interface PresenceApi {
  /** Other members currently on each widget (never includes self). */
  others: ViewerPresence[];
  /** Announce which widget this client is viewing (change-only, throttled). */
  report: (widget: WidgetId) => void;
}

const PresenceContext = createContext<PresenceApi>({
  others: [],
  report: () => {},
});

type PresenceChannel = {
  on: (
    type: string,
    filter: Record<string, string>,
    callback: () => void,
  ) => PresenceChannel;
  subscribe: (callback: (status: string) => void) => void;
  track: (payload: Record<string, unknown>) => Promise<void>;
  presenceState: () => Record<string, Array<Record<string, unknown>>>;
  [key: string]: unknown;
};

function asPresenceChannel(value: unknown): PresenceChannel | null {
  if (!value || typeof value !== "object") return null;
  const c = value as Record<string, unknown>;
  // Fixture/test backends stub channel() without presence support.
  if (
    typeof c.on !== "function" ||
    typeof c.subscribe !== "function" ||
    typeof c.track !== "function" ||
    typeof c.presenceState !== "function"
  )
    return null;
  return c as unknown as PresenceChannel;
}

const STALE_MS = 90000;

/**
 * Figma-style "who is looking at what", scoped to widget granularity.
 * Fully defensive: no realtime backend, no presence UI — the workspace
 * works exactly as before. Never carries trip content, only presence.
 */
export function PresenceProvider({
  tripId,
  children,
}: {
  tripId: string;
  children: ReactNode;
}) {
  const { viewer } = useMvp();
  const [others, setOthers] = useState<Map<string, ViewerPresence>>(new Map());
  const selfWidget = useRef<WidgetId | null>(null);
  const channelRef = useRef<PresenceChannel | null>(null);

  useEffect(() => {
    if (!viewer.id) return;
    let alive = true;
    let channel: PresenceChannel | null = null;
    let sweep: ReturnType<typeof setInterval> | null = null;
    const read = () => {
      if (!alive || !channel) return;
      try {
        const state = channel.presenceState();
        const cutoff = Date.now() - STALE_MS;
        const next = new Map<string, ViewerPresence>();
        for (const presences of Object.values(state)) {
          for (const p of presences) {
            if (
              !p ||
              typeof p.user_id !== "string" ||
              p.user_id === viewer.id ||
              typeof p.at !== "number" ||
              p.at < cutoff
            )
              continue;
            next.set(p.user_id, {
              userId: p.user_id,
              name: typeof p.name === "string" && p.name ? p.name : "?",
              widget: p.widget as WidgetId,
              at: p.at,
            });
          }
        }
        setOthers(next);
      } catch {
        /* presence unavailable; stay empty */
      }
    };
    try {
      const client = createClient();
      // Per-instance topic (same singleton-channel rule as chat/proposals).
      const instance = crypto.randomUUID();
      channel = asPresenceChannel(
        client.channel(`presence:trip:${tripId}:${instance}`, {
          config: { presence: { key: viewer.id } },
        }),
      );
      if (!channel) return;
      channel
        .on("presence", { event: "sync" }, () => read())
        .on("presence", { event: "join" }, () => read())
        .on("presence", { event: "leave" }, () => read())
        .subscribe(async (status) => {
          if (!alive || !channel) return;
          if (status === "SUBSCRIBED") {
            try {
              await channel.track({
                user_id: viewer.id,
                name: viewer.name,
                widget: selfWidget.current ?? "plan",
                at: Date.now(),
              });
            } catch {
              /* offline: others simply won't see us */
            }
            read();
          }
        });
      channelRef.current = channel;
      sweep = setInterval(read, 30000);
    } catch {
      channel = null;
    }
    return () => {
      alive = false;
      if (sweep) clearInterval(sweep);
      channelRef.current = null;
      if (channel) {
        try {
          const client = createClient();
          type Removable = Parameters<typeof client.removeChannel>[0];
          void client
            .removeChannel(channel as unknown as Removable)
            .catch(() => {});
        } catch {
          /* ignore teardown failures */
        }
      }
    };
  }, [tripId, viewer.id, viewer.name]);

  const report = useCallback(
    (widget: WidgetId) => {
      if (selfWidget.current === widget || !viewer.id) return;
      selfWidget.current = widget;
      const channel = channelRef.current;
      if (!channel) return;
      void channel
        .track({
          user_id: viewer.id,
          name: viewer.name,
          widget,
          at: Date.now(),
        })
        .catch(() => {});
    },
    [viewer.id, viewer.name],
  );

  const api = useMemo<PresenceApi>(
    () => ({ others: [...others.values()], report }),
    [others, report],
  );
  return (
    <PresenceContext.Provider value={api}>
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresence(): PresenceApi {
  return useContext(PresenceContext);
}
