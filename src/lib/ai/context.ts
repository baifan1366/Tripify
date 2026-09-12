export type TripContextOpts = {
  selectedDay?: number;
  chatLimit?: number;
};

/** PostgREST-shaped client (real Supabase server client or a test stub). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ContextClient = { from: (table: string) => any };

function rows(
  value: Record<string, unknown>[] | Record<string, unknown> | null,
): Record<string, unknown>[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function clip(text: string, max = 4000) {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/**
 * Loads only relevant trip data for the agent. RLS on the caller's client
 * enforces access; an invisible trip surfaces as TRIP_FORBIDDEN.
 */
export async function buildTripContext(
  client: ContextClient,
  tripId: string,
  opts: TripContextOpts = {},
): Promise<string> {
  const chatLimit = Math.min(opts.chatLimit ?? 12, 20);
  // Independent reads run concurrently so first-token latency is one
  // round trip, not four. Access is still enforced per query by RLS.
  const [tripRes, membersRes, actsRes, chatRes] = await Promise.all([
    client
      .from("trips")
      .select(
        "id,name,destination,start_date,end_date,currency,budget_total,timezone,version",
      )
      .eq("id", tripId)
      .maybeSingle(),
    client
      .from("trip_members")
      .select("display_name,interests,pace,budget_limit")
      .eq("trip_id", tripId)
      .limit(30),
    client
      .from("trip_activities")
      .select("day_number,start_time,title,location_name,estimated_cost")
      .eq("trip_id", tripId)
      .order("day_number", { ascending: true })
      .limit(60),
    client
      .from("chat_messages")
      .select("content,created_at")
      .eq("trip_id", tripId)
      .order("created_at", { ascending: false })
      .limit(chatLimit),
  ]);
  if (tripRes.error) throw new Error(`CONTEXT_FAILED: ${tripRes.error.message}`);
  if (!tripRes.data) throw new Error("TRIP_FORBIDDEN");
  const trip = tripRes.data as Record<string, string | number>;

  if (membersRes.error)
    throw new Error(`CONTEXT_FAILED: ${membersRes.error.message}`);

  if (actsRes.error) throw new Error(`CONTEXT_FAILED: ${actsRes.error.message}`);

  const chatErr = (
    chatRes as { error: { message: string } | null }
  ).error;
  if (chatErr) throw new Error(`CONTEXT_FAILED: ${chatErr.message}`);

  const memberLines = rows(
    membersRes.data as Record<string, unknown>[] | null,
  )
    .slice(0, 12)
    .map(
      (m) =>
        `- ${String(m.display_name ?? "?")} (interests: ${String(m.interests || "—")}; pace: ${String(m.pace ?? "—")}; budget: ${String(m.budget_limit ?? "—")})`,
    );
  const activityRows = rows(actsRes.data as Record<string, unknown>[] | null);
  const shown =
    opts.selectedDay != null
      ? activityRows.filter((a) => Number(a.day_number) === opts.selectedDay)
      : activityRows;
  const activityLines = shown.slice(0, 30).map(
    (a) =>
      `- Day ${String(a.day_number)} ${String(a.start_time).slice(0, 5)}: ${String(a.title)} @ ${String(a.location_name)} (${String(a.estimated_cost ?? 0)})`,
  );
  const chatLines = rows(chatRes.data as Record<string, unknown>[] | null)
    .slice(0, chatLimit)
    .reverse()
    .map((c) => `- ${String(c.content).slice(0, 160)}`);

  return clip(
    [
      `Trip: ${String(trip.name)} — ${String(trip.destination)} (${String(trip.start_date)} → ${String(trip.end_date)}, ${String(trip.currency)} ${String(trip.budget_total)}, tz ${String(trip.timezone)}, v${String(trip.version)})`,
      `Members (${memberLines.length}):`,
      ...memberLines,
      `Itinerary (${activityRows.length} activities${opts.selectedDay != null ? `, showing day ${opts.selectedDay}` : ""}):`,
      ...(activityLines.length ? activityLines : ["- (no activities yet)"]),
      `Recent chat (${chatLines.length}):`,
      ...(chatLines.length ? chatLines : ["- (no messages yet)"]),
    ].join("\n"),
  );
}
