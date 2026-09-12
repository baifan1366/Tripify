"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/lib/ai/context.ts
var context_exports = {};
__export(context_exports, {
  buildTripContext: () => buildTripContext
});
module.exports = __toCommonJS(context_exports);
function rows(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}
function clip(text, max = 4e3) {
  return text.length > max ? `${text.slice(0, max)}\u2026` : text;
}
async function buildTripContext(client, tripId, opts = {}) {
  const chatLimit = Math.min(opts.chatLimit ?? 12, 20);
  const [tripRes, membersRes, actsRes, chatRes] = await Promise.all([
    client.from("trips").select(
      "id,name,destination,start_date,end_date,currency,budget_total,timezone,version"
    ).eq("id", tripId).maybeSingle(),
    client.from("trip_members").select("display_name,interests,pace,budget_limit").eq("trip_id", tripId).limit(30),
    client.from("trip_activities").select("day_number,start_time,title,location_name,estimated_cost").eq("trip_id", tripId).order("day_number", { ascending: true }).limit(60),
    client.from("chat_messages").select("content,created_at").eq("trip_id", tripId).order("created_at", { ascending: false }).limit(chatLimit)
  ]);
  if (tripRes.error) throw new Error(`CONTEXT_FAILED: ${tripRes.error.message}`);
  if (!tripRes.data) throw new Error("TRIP_FORBIDDEN");
  const trip = tripRes.data;
  if (membersRes.error)
    throw new Error(`CONTEXT_FAILED: ${membersRes.error.message}`);
  if (actsRes.error) throw new Error(`CONTEXT_FAILED: ${actsRes.error.message}`);
  const chatErr = chatRes.error;
  if (chatErr) throw new Error(`CONTEXT_FAILED: ${chatErr.message}`);
  const memberLines = rows(
    membersRes.data
  ).slice(0, 12).map(
    (m) => `- ${String(m.display_name ?? "?")} (interests: ${String(m.interests || "\u2014")}; pace: ${String(m.pace ?? "\u2014")}; budget: ${String(m.budget_limit ?? "\u2014")})`
  );
  const activityRows = rows(actsRes.data);
  const shown = opts.selectedDay != null ? activityRows.filter((a) => Number(a.day_number) === opts.selectedDay) : activityRows;
  const activityLines = shown.slice(0, 30).map(
    (a) => `- Day ${String(a.day_number)} ${String(a.start_time).slice(0, 5)}: ${String(a.title)} @ ${String(a.location_name)} (${String(a.estimated_cost ?? 0)})`
  );
  const chatLines = rows(chatRes.data).slice(0, chatLimit).reverse().map((c) => `- ${String(c.content).slice(0, 160)}`);
  return clip(
    [
      `Trip: ${String(trip.name)} \u2014 ${String(trip.destination)} (${String(trip.start_date)} \u2192 ${String(trip.end_date)}, ${String(trip.currency)} ${String(trip.budget_total)}, tz ${String(trip.timezone)}, v${String(trip.version)})`,
      `Members (${memberLines.length}):`,
      ...memberLines,
      `Itinerary (${activityRows.length} activities${opts.selectedDay != null ? `, showing day ${opts.selectedDay}` : ""}):`,
      ...activityLines.length ? activityLines : ["- (no activities yet)"],
      `Recent chat (${chatLines.length}):`,
      ...chatLines.length ? chatLines : ["- (no messages yet)"]
    ].join("\n")
  );
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  buildTripContext
});
