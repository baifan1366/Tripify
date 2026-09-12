"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type DraftKind = "chat" | "proposal" | "ai";

export async function loadDraft(
  tripId: string,
  kind: DraftKind,
): Promise<string | null> {
  const client = createClient();
  const { data: auth } = await client.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await client
    .from("trip_drafts")
    .select("content")
    .eq("trip_id", tripId)
    .eq("user_id", auth.user.id)
    .eq("kind", kind)
    .maybeSingle();
  if (error) throw error;
  return data?.content ?? null;
}

export async function saveDraft(
  tripId: string,
  kind: DraftKind,
  content: string,
): Promise<void> {
  const client = createClient();
  const { data: auth } = await client.auth.getUser();
  if (!auth.user) return;
  if (!content.trim()) {
    const { error } = await client
      .from("trip_drafts")
      .delete()
      .eq("trip_id", tripId)
      .eq("user_id", auth.user.id)
      .eq("kind", kind);
    if (error) throw error;
    return;
  }
  const { error } = await client.from("trip_drafts").upsert(
    {
      trip_id: tripId,
      user_id: auth.user.id,
      kind,
      content: content.slice(0, 10000),
    },
    { onConflict: "trip_id,user_id,kind" },
  );
  if (error) throw error;
}

/**
 * Trip-scoped input draft that survives refresh and navigation.
 * Loads once per trip/kind (never clobbering fresh typing) and
 * debounces saves; clearing the input deletes the stored draft.
 */
export function usePersistentDraft(
  tripId: string,
  kind: DraftKind,
): [string, (value: string) => void] {
  const [value, setValue] = useState("");
  const touched = useRef(false);
  const loaded = useRef(false);

  // Scoped per mount: TripWorkspace remounts per trip, so no in-effect reset
  // is needed when the trip changes.
  useEffect(() => {
    let active = true;
    void loadDraft(tripId, kind)
      .then((saved) => {
        if (!active) return;
        loaded.current = true;
        if (saved && !touched.current) setValue(saved);
      })
      .catch(() => {
        if (active) loaded.current = true;
      });
    return () => {
      active = false;
    };
  }, [tripId, kind]);

  useEffect(() => {
    if (!loaded.current || !touched.current) return;
    const timer = setTimeout(() => {
      void saveDraft(tripId, kind, value).catch(() => {});
    }, 800);
    return () => clearTimeout(timer);
  }, [value, tripId, kind]);

  const set = useCallback((next: string) => {
    touched.current = true;
    setValue(next);
  }, []);

  return [value, set];
}
