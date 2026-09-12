"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import type { Trip } from "@/lib/mvp/model";
import {
  versionChanges,
  type HistoryEntry,
  type Snapshot,
} from "@/lib/trips/history";
import { AppButton } from "@/components/mvp/primitives";
import { TripSettings } from "./trip-settings";

type EntryMeta = Omit<HistoryEntry, "snapshot"> & { snapshot?: Snapshot };

export function HistoryPanel({ trip }: { trip: Trip }) {
  const t = useTranslations("shared");
  const locale = useLocale();
  const [entries, setEntries] = useState<EntryMeta[]>([]);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(51);
  const [retry, setRetry] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [snapshots, setSnapshots] = useState<Record<string, Snapshot>>({});
  const [snapLoading, setSnapLoading] = useState<Set<string>>(new Set());
  const fetchedSnaps = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!trip.version) return;
    let active = true;
    // Metadata only: full snapshots load on expand, not for all 50 rows.
    void createClient()
      .from("trip_versions")
      .select("id,version,actor_user_id,change_type,created_at")
      .eq("trip_id", trip.id)
      .order("version", { ascending: false })
      .limit(limit)
      .then(({ data, error }) => {
        if (!active) return;
        setError(!!error);
        setLoading(false);
        if (!error) {
          const rows = data as EntryMeta[];
          setEntries(rows);
          // Rows that already carry a snapshot (older schemas, test
          // fixtures) are usable without a second fetch.
          setSnapshots((prev) => {
            const next = { ...prev };
            for (const row of rows) {
              if (row.snapshot) {
                next[row.id] = row.snapshot;
                fetchedSnaps.current.add(row.id);
              }
            }
            return next;
          });
        }
      });
    return () => {
      active = false;
    };
  }, [trip.id, trip.version, limit, retry]);
  const ensureSnapshot = useCallback(
    async (id: string) => {
      if (!id || fetchedSnaps.current.has(id)) return;
      fetchedSnaps.current.add(id);
      setSnapLoading((prev) => new Set(prev).add(id));
      try {
        const { data, error } = await createClient()
          .from("trip_versions")
          .select("id,snapshot")
          .eq("trip_id", trip.id)
          .eq("id", id)
          .maybeSingle();
        if (!error && (data as { snapshot?: Snapshot } | null)?.snapshot) {
          const snapshot = (data as { snapshot: Snapshot }).snapshot;
          setSnapshots((prev) => ({ ...prev, [id]: snapshot }));
        } else {
          // Let a later expand retry instead of showing a spinner forever.
          fetchedSnaps.current.delete(id);
        }
      } finally {
        setSnapLoading((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [trip.id],
  );
  const memberNames = useMemo(
    () => new Map(trip.members.map((m) => [m.id, m.name] as const)),
    [trip.members],
  );
  const visible = useMemo(
    () =>
      entries.slice(0, limit - 1).map((entry, index) => ({
        entry,
        previous: entries[index + 1],
      })),
    [entries, limit],
  );
  const [showAll, setShowAll] = useState(false);
  if (!trip.version) return <p>{t("emptyHistory")}</p>;
  function display(value: unknown, field: string, currency: string) {
    if (value === undefined || value === null) return "—";
    if (["budget_total", "estimated_cost"].includes(field))
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
      }).format(Number(value));
    if (["start_date", "end_date"].includes(field))
      return new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeZone: "UTC",
      }).format(new Date(`${value}T00:00:00Z`));
    if (field === "start_time") return String(value).slice(0, 5);
    return String(value);
  }
  const actionLabel = (changeType: string) =>
    t(
      (
        {
          "trip.created": "trip_create",
          "trip.updated": "trip_update",
          "activity.added": "activity_add",
          "activity.updated": "activity_update",
          "activity.removed": "activity_remove",
        } as Record<string, string>
      )[changeType] ?? "trip_update",
    );
  const latest = visible[0];
  const latestAuthor = latest
    ? (memberNames.get(latest.entry.actor_user_id) ?? t("formerMember"))
    : "";
  const renderEntry = ({
    entry,
    previous,
  }: {
    entry: EntryMeta;
    previous?: EntryMeta;
  }) => {
        const author =
          memberNames.get(entry.actor_user_id) ?? t("formerMember");
        const isOpen = expanded.has(entry.id);
        const snapshot = entry.snapshot ?? snapshots[entry.id];
        const prevSnapshot = previous
          ? (previous.snapshot ?? snapshots[previous.id])
          : undefined;
        const ready = !!snapshot && (!previous || !!prevSnapshot);
        const changes =
          isOpen && snapshot
            ? versionChanges(snapshot, prevSnapshot)
            : [];
        return (
          <details
            className="history-entry"
            key={entry.id}
            data-entry={entry.id}
            onToggle={(e) => {
              const open = e.currentTarget.open;
              setExpanded((prev) => {
                const next = new Set(prev);
                if (open) next.add(entry.id);
                else next.delete(entry.id);
                return next;
              });
              if (open) {
                void ensureSnapshot(entry.id);
                if (previous) void ensureSnapshot(previous.id);
              }
            }}
          >
            <summary>
              <span>
                {author} · {actionLabel(entry.change_type)}
              </span>
              <time dateTime={entry.created_at}>
                {new Intl.DateTimeFormat(locale, {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: trip.timezone,
                }).format(new Date(entry.created_at))}
              </time>
              <small>{t("version", { version: entry.version })}</small>
            </summary>
            {isOpen && (
              <dl>
                {!ready || snapLoading.has(entry.id) ? (
                  <div role="status">{t("loadingHistory")}</div>
                ) : (
                  changes.map((change, i) => (
                    <div key={i}>
                      <dt>
                        {change.name && <strong>{change.name} · </strong>}
                        {t(`field_${change.field}`)}
                      </dt>
                      <dd>
                        {display(
                          change.before,
                          change.field,
                          String(
                            prevSnapshot?.trip.currency ?? trip.currency,
                          ),
                        )}{" "}
                        →{" "}
                        {display(
                          change.after,
                          change.field,
                          String(snapshot?.trip.currency ?? trip.currency),
                        )}
                      </dd>
                    </div>
                  ))
                )}
              </dl>
            )}
          </details>
        );
      };
  return (
    <section className="shared-panel">
      <TripSettings trip={trip} />
      {loading && <p role="status">{t("loadingHistory")}</p>}
      {error && (
        <div role="alert">
          <p>{t("failed")}</p>
          <AppButton onClick={() => setRetry((r) => r + 1)}>
            {t("retry")}
          </AppButton>
        </div>
      )}
      {!loading && !error && !entries.length && <p>{t("emptyHistory")}</p>}
      {!loading && !error && latest && !showAll && (
        <div className="history-summary">
          <strong>
            {latestAuthor} · {actionLabel(latest.entry.change_type)}
          </strong>
          <p>
            <time dateTime={latest.entry.created_at}>
              {new Intl.DateTimeFormat(locale, {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: trip.timezone,
              }).format(new Date(latest.entry.created_at))}
            </time>{" "}
            · {t("version", { version: latest.entry.version })}
          </p>
          <AppButton variant="outline" onClick={() => setShowAll(true)}>
            {t("olderHistory")}
          </AppButton>
        </div>
      )}
      {!loading && !error && showAll && (
        <div className="history-full">{visible.map(renderEntry)}</div>
      )}
      {showAll && entries.length >= limit && (
        <AppButton variant="outline" onClick={() => setLimit((n) => n + 50)}>
          {t("olderHistory")}
        </AppButton>
      )}
    </section>
  );
}
