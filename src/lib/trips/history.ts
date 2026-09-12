export type Snapshot = {
  trip: Record<string, unknown>;
  activities: Record<string, unknown>[];
};
export type HistoryEntry = {
  id: string;
  version: number;
  actor_user_id: string;
  change_type: string;
  created_at: string;
  snapshot: Snapshot;
};
export type Change = {
  field: string;
  name?: string;
  before: unknown;
  after: unknown;
};
const tripFields = [
  "name",
  "destination",
  "start_date",
  "end_date",
  "timezone",
  "currency",
  "budget_total",
];
const activityFields = [
  "title",
  "day_number",
  "start_time",
  "location_name",
  "duration_minutes",
  "estimated_cost",
];
export function versionChanges(
  current: Snapshot,
  previous?: Snapshot,
): Change[] {
  const changes: Change[] = [];
  for (const field of tripFields)
    if (current.trip[field] !== previous?.trip[field])
      changes.push({
        field,
        before: previous?.trip[field],
        after: current.trip[field],
      });
  const old = new Map((previous?.activities ?? []).map((a) => [a.id, a]));
  const next = new Map(current.activities.map((a) => [a.id, a]));
  for (const activity of current.activities) {
    const before = old.get(activity.id);
    if (!before)
      changes.push({
        field: "activityAdded",
        after: activity.title,
        before: undefined,
      });
    else
      for (const field of activityFields)
        if (before[field] !== activity[field])
          changes.push({
            field,
            name: String(activity.title),
            before: before[field],
            after: activity[field],
          });
  }
  for (const activity of old.values())
    if (!next.has(activity.id))
      changes.push({
        field: "activityRemoved",
        before: activity.title,
        after: undefined,
      });
  return changes;
}
