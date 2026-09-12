"use client";
import { useEffect, useSyncExternalStore } from "react";
import {
  defaultLayout,
  parseLayout,
  layoutStorageKey,
  type WorkspaceLayout,
} from "@/lib/mvp/workspace-layout";
import {
  loadWorkspaceLayout,
  saveWorkspaceLayout,
} from "@/lib/trips/workspace-prefs";

const server = { layout: defaultLayout(), unavailable: false, synced: false };
let snapshot: typeof server | undefined;
const listeners = new Set<() => void>();
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let remoteLoaded = false;

function getSnapshot() {
  if (!snapshot) {
    try {
      snapshot = {
        layout: parseLayout(
          JSON.parse(localStorage.getItem(layoutStorageKey) || "null"),
        ),
        unavailable: false,
        synced: false,
      };
    } catch {
      snapshot = { ...server, unavailable: true };
    }
  }
  return snapshot;
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function persist(layout: WorkspaceLayout) {
  try {
    localStorage.setItem(layoutStorageKey, JSON.stringify(layout));
  } catch {
    snapshot = { ...(snapshot ?? server), layout, unavailable: true };
    listeners.forEach((listener) => listener());
    return;
  }
  snapshot = { layout, unavailable: false, synced: true };
  listeners.forEach((listener) => listener());
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    void saveWorkspaceLayout(layout).catch(() => {});
  }, 900);
}
function updateLayout(update: (current: WorkspaceLayout) => WorkspaceLayout) {
  persist(parseLayout(update(getSnapshot().layout)));
}
export function useWorkspaceLayout() {
  const state = useSyncExternalStore(subscribe, getSnapshot, () => server);
  useEffect(() => {
    if (remoteLoaded) return;
    remoteLoaded = true;
    void loadWorkspaceLayout()
      .then((remote) => {
        if (!remote) return;
        const localRaw =
          typeof window === "undefined"
            ? null
            : window.localStorage.getItem(layoutStorageKey);
        // Local device preference wins when it exists; otherwise adopt server.
        if (!localRaw || localRaw === "null") {
          snapshot = { layout: remote, unavailable: false, synced: true };
          try {
            window.localStorage.setItem(
              layoutStorageKey,
              JSON.stringify(remote),
            );
          } catch {}
          listeners.forEach((listener) => listener());
        } else {
          // Push local up so other devices converge on next load.
          void saveWorkspaceLayout(getSnapshot().layout).catch(() => {});
        }
      })
      .catch(() => {});
  }, []);
  return { ...state, updateLayout };
}
