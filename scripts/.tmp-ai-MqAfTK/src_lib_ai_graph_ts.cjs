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

// src/lib/ai/graph.ts
var graph_exports = {};
__export(graph_exports, {
  buildTripifyGraph: () => buildTripifyGraph,
  graphStructure: () => graphStructure,
  runTripifyTurn: () => runTripifyTurn
});
module.exports = __toCommonJS(graph_exports);
var import_messages = require("@langchain/core/messages");
var import_prebuilt = require("@langchain/langgraph/prebuilt");
var import_langgraph2 = require("@langchain/langgraph");

// src/lib/ai/checkpoint.ts
var import_langgraph_checkpoint = require("@langchain/langgraph-checkpoint");
var saver = null;
function getCheckpointer() {
  if (!saver) saver = new import_langgraph_checkpoint.MemorySaver();
  return saver;
}

// src/lib/ai/context.ts
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

// src/lib/ai/model.ts
var import_openai = require("@langchain/openai");

// src/lib/ai/config.ts
var import_zod = require("zod");
var TRIPIFY_MODEL = "google/gemma-4-26b-a4b-it:free";
var MAX_NUMBERED_KEYS = 20;
var aiEnvSchema = import_zod.z.object({
  OPENROUTER_MODEL: import_zod.z.string().min(1).default(TRIPIFY_MODEL),
  NEXT_PUBLIC_APP_URL: import_zod.z.string().min(1).optional()
});
var AiConfigError = class extends Error {
  constructor(message = "Tripify AI is not configured.") {
    super(message);
    this.code = "AI_NOT_CONFIGURED";
    this.name = "AiConfigError";
  }
};
function splitList(value) {
  if (!value) return [];
  return value.split(/[\n,]+/).map((part) => part.trim().replace(/^["']|["']$/g, "")).filter((part) => part.length > 0);
}
function collectApiKeys(env = process.env) {
  const keys = [];
  if (env.OPENROUTER_API_KEY) keys.push(env.OPENROUTER_API_KEY.trim());
  keys.push(...splitList(env.OPENROUTER_API_KEYS));
  for (let i = 1; i <= MAX_NUMBERED_KEYS; i++) {
    const a = env[`OPENROUTER_API_KEY_${i}`];
    const b = env[`OPEN_ROUTER_KEY_${i}`];
    if (a?.trim()) keys.push(a.trim());
    if (b?.trim()) keys.push(b.trim());
  }
  return [...new Set(keys.filter((key) => key.length > 0))];
}
function getAiConfig(env = process.env) {
  const parsed = aiEnvSchema.safeParse({
    OPENROUTER_MODEL: env.OPENROUTER_MODEL || TRIPIFY_MODEL,
    NEXT_PUBLIC_APP_URL: env.NEXT_PUBLIC_APP_URL
  });
  const apiKeys = collectApiKeys(env);
  if (apiKeys.length === 0) {
    throw new AiConfigError(
      "Missing OpenRouter API key. Set OPENROUTER_API_KEY (or OPENROUTER_API_KEYS / OPEN_ROUTER_KEY_1.._20) in your server environment to enable Tripify AI."
    );
  }
  return {
    apiKeys,
    apiKey: apiKeys[0],
    model: parsed.success ? parsed.data.OPENROUTER_MODEL : TRIPIFY_MODEL,
    appUrl: parsed.data?.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  };
}

// src/lib/ai/model.ts
function createTravelModel(apiKey, variant = "default") {
  const config = getAiConfig();
  void variant;
  return new import_openai.ChatOpenAI({
    apiKey: apiKey ?? config.apiKey,
    model: config.model,
    temperature: 0.4,
    maxRetries: 0,
    configuration: {
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": config.appUrl,
        "X-Title": "Tripify"
      }
    }
  });
}
function tripThreadId(tripId, userId) {
  return `trip:${tripId}:user:${userId}`;
}

// src/lib/ai/prompts.ts
function buildSystemPrompt(locale, tripContext) {
  return [
    "You are Tripify, an AI travel teammate for group trips. Core principle: AI proposes. Humans decide.",
    "",
    "Behavior:",
    "- Answer travel-planning questions using the trip context below.",
    "- Use available tools instead of inventing trip facts (members, itinerary, budget).",
    "- Live weather comes only from the get_weather tool; never invent forecasts.",
    "- Explain trade-offs (cost, preferences, pace) briefly and concretely.",
    "- Respect group preferences and budget; note conflicts instead of hiding them.",
    "- End with a practical next step or a question when the group must decide.",
    "- You may prepare a recommendation, but never claim a booking was made, an itinerary was changed, or live data was checked unless a tool actually did it.",
    "- If information is unavailable (no tool covers it), say so plainly.",
    `- Reply in the user's locale (${locale}). Keep responses focused; avoid generic travel filler.`,
    "",
    "Trip context:",
    tripContext || "(no trip context loaded)"
  ].join("\n");
}

// src/lib/ai/state.ts
var import_langgraph = require("@langchain/langgraph");
var TripifyState = import_langgraph.Annotation.Root({
  messages: (0, import_langgraph.Annotation)({
    reducer: (left, right) => left.concat(right),
    default: () => []
  }),
  tripId: (0, import_langgraph.Annotation)({ reducer: (_, next) => next, default: () => "" }),
  userId: (0, import_langgraph.Annotation)({ reducer: (_, next) => next, default: () => "" }),
  locale: (0, import_langgraph.Annotation)({ reducer: (_, next) => next, default: () => "en" }),
  tripContext: (0, import_langgraph.Annotation)({
    reducer: (_, next) => next,
    default: () => ""
  }),
  errors: (0, import_langgraph.Annotation)({
    reducer: (left, right) => left.concat(right),
    default: () => []
  })
});

// src/lib/ai/tools/trip-tools.ts
var import_zod2 = require("zod");
var import_tools = require("@langchain/core/tools");

// src/lib/weather/risk.ts
var STORM_CODES = /* @__PURE__ */ new Set([95, 96, 99]);
function assessRisk(precipProbPct, windKmh, code) {
  if (code != null && STORM_CODES.has(code)) return "high";
  if (precipProbPct != null && precipProbPct >= 60 || windKmh != null && windKmh >= 50)
    return "high";
  if (precipProbPct != null && precipProbPct >= 30 || windKmh != null && windKmh >= 30)
    return "medium";
  return "low";
}

// src/lib/weather/open-meteo.ts
var geoCache = /* @__PURE__ */ new Map();
function cacheSet(cache, key, value, max = 100) {
  if (cache.size >= max) {
    const oldest = cache.keys().next();
    if (!oldest.done) cache.delete(oldest.value);
  }
  cache.set(key, value);
}
async function fetchJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(8e3) });
  if (!response.ok) throw new Error(`WEATHER_UPSTREAM_${response.status}`);
  return response.json();
}
async function geocodeDestination(destination) {
  const key = destination.trim().toLowerCase();
  if (!key) return null;
  const cached = geoCache.get(key);
  if (cached) return cached;
  try {
    const data = await fetchJson(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(destination.trim())}&count=1&language=en&format=json`
    );
    const first = data.results?.[0];
    if (!first) return null;
    const result = { lat: first.latitude, lng: first.longitude, name: first.name };
    cacheSet(geoCache, key, result);
    return result;
  } catch {
    return null;
  }
}
function isoAfter(start, offsetDays) {
  const date = /* @__PURE__ */ new Date(`${start}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}
async function fetchTripForecast(destination, startDate, endDate) {
  const geo = await geocodeDestination(destination);
  if (!geo) return { place: null, days: [] };
  const start = isoAfter(startDate, 0);
  const end = isoAfter(startDate, Math.min(daySpan(startDate, endDate), 15));
  try {
    const data = await fetchJson(
      `https://api.open-meteo.com/v1/forecast?latitude=${geo.lat}&longitude=${geo.lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,windspeed_10m_max,weathercode&timezone=auto&start_date=${start}&end_date=${end}`
    );
    const daily = data.daily;
    if (!daily?.time?.length) return { place: geo.name, days: [] };
    const days = daily.time.map((date, i) => {
      const tmax = daily.temperature_2m_max?.[i] ?? null;
      const tmin = daily.temperature_2m_min?.[i] ?? null;
      const precip = daily.precipitation_probability_max?.[i] ?? null;
      const wind = daily.windspeed_10m_max?.[i] ?? null;
      const code = daily.weathercode?.[i] ?? null;
      return {
        date,
        tmaxC: tmax,
        tminC: tmin,
        precipProbPct: precip,
        windKmh: wind,
        code,
        risk: assessRisk(precip, wind, code),
        summary: summarize(tmax, tmin, precip, wind)
      };
    });
    return { place: geo.name, days };
  } catch {
    return { place: geo.name, days: [] };
  }
}
function daySpan(start, end) {
  const span = Math.round(
    (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 864e5
  );
  return Number.isFinite(span) && span >= 0 ? span : 0;
}
function summarize(tmax, tmin, precip, wind) {
  const parts = [];
  if (tmin != null && tmax != null) parts.push(`${Math.round(tmin)}\u2013${Math.round(tmax)}\xB0C`);
  else if (tmax != null) parts.push(`${Math.round(tmax)}\xB0C`);
  if (precip != null) parts.push(`${precip}% rain`);
  if (wind != null) parts.push(`${Math.round(wind)} km/h wind`);
  return parts.join(" \xB7 ") || "No data";
}

// src/lib/ai/tools/trip-tools.ts
var noInput = import_zod2.z.object({});
function summarize2(rows2, max = 12) {
  return Array.isArray(rows2) ? rows2.slice(0, max) : [];
}
function createTripTools(deps) {
  const getTrip = (0, import_tools.tool)(
    async () => {
      const res = await deps.client.from("trips").select(
        "id,name,destination,start_date,end_date,currency,budget_total,timezone,version"
      ).eq("id", deps.tripId).maybeSingle();
      if (res.error) throw new Error(`get_trip failed: ${res.error.message}`);
      if (!res.data) throw new Error("TRIP_FORBIDDEN");
      return res.data;
    },
    {
      name: "get_trip",
      description: "Get the trip's name, destination, dates, currency, budget, timezone and version.",
      schema: noInput
    }
  );
  const getTripMembers = (0, import_tools.tool)(
    async () => {
      const res = await deps.client.from("trip_members").select("display_name,interests,dislikes,food_preferences,pace,budget_limit").eq("trip_id", deps.tripId).limit(30);
      if (res.error)
        throw new Error(`get_trip_members failed: ${res.error.message}`);
      return summarize2(res.data ?? []);
    },
    {
      name: "get_trip_members",
      description: "List group members with their interests, pace and budget limits.",
      schema: noInput
    }
  );
  const getItinerary = (0, import_tools.tool)(
    async (input) => {
      let query = deps.client.from("trip_activities").select(
        "day_number,start_time,title,location_name,estimated_cost,duration_minutes"
      ).eq("trip_id", deps.tripId).order("day_number", { ascending: true });
      if (input.day != null) query = query.eq("day_number", input.day);
      const res = await query.limit(60);
      if (res.error)
        throw new Error(`get_itinerary failed: ${res.error.message}`);
      return summarize2(res.data ?? [], 30);
    },
    {
      name: "get_itinerary",
      description: "Get itinerary activities, optionally filtered by day number.",
      schema: import_zod2.z.object({
        day: import_zod2.z.number().int().min(1).max(60).optional()
      })
    }
  );
  const getWeather = (0, import_tools.tool)(
    async (input) => {
      const tripRes = await deps.client.from("trips").select("destination,start_date,end_date").eq("id", deps.tripId).maybeSingle();
      if (tripRes.error)
        throw new Error(`get_weather failed: ${tripRes.error.message}`);
      if (!tripRes.data) throw new Error("TRIP_FORBIDDEN");
      const trip = tripRes.data;
      const forecast = await fetchTripForecast(
        trip.destination,
        trip.start_date,
        trip.end_date
      );
      if (!forecast.place)
        return {
          unavailable: true,
          reason: "Destination could not be resolved to a forecast location."
        };
      if (!forecast.days.length)
        return {
          unavailable: true,
          reason: "No forecast available for these trip dates.",
          place: forecast.place
        };
      if (input.day != null) {
        const date = /* @__PURE__ */ new Date(`${trip.start_date}T00:00:00Z`);
        date.setUTCDate(date.getUTCDate() + input.day - 1);
        const iso = date.toISOString().slice(0, 10);
        const found = forecast.days.find((d) => d.date === iso);
        if (!found)
          return {
            unavailable: true,
            reason: "That day is outside the forecast horizon.",
            place: forecast.place
          };
        return { place: forecast.place, day: found };
      }
      return { place: forecast.place, days: forecast.days };
    },
    {
      name: "get_weather",
      description: "Get the real Open-Meteo weather forecast for the trip destination and dates, optionally for one day number. This is the only source of live weather.",
      schema: import_zod2.z.object({
        day: import_zod2.z.number().int().min(1).max(60).optional()
      })
    }
  );
  return [getTrip, getTripMembers, getItinerary, getWeather];
}

// src/lib/ai/graph.ts
function toBaseMessages(turns) {
  return turns.map(
    (t) => t.role === "user" ? new import_messages.HumanMessage(t.content) : new import_messages.AIMessage(t.content)
  );
}
function buildTripifyGraph(deps) {
  const tools = createTripTools({
    client: deps.client,
    tripId: deps.tripId
  });
  const model = createTravelModel(deps.apiKey).bindTools(tools);
  const toolNode = new import_prebuilt.ToolNode(tools);
  async function loadContext() {
    try {
      const tripContext = await buildTripContext(deps.client, deps.tripId, {
        selectedDay: deps.selectedDay
      });
      return { tripContext };
    } catch (error) {
      const message = error instanceof Error ? error.message : "CONTEXT_FAILED";
      return { tripContext: "", errors: [message] };
    }
  }
  async function agent(state) {
    const system = new import_messages.SystemMessage(
      buildSystemPrompt(deps.locale, state.tripContext)
    );
    const response = await model.invoke([system, ...state.messages]);
    return { messages: [response] };
  }
  function shouldContinue(state) {
    const last = state.messages[state.messages.length - 1];
    const calls = last?.tool_calls;
    return calls && calls.length > 0 ? "tools" : import_langgraph2.END;
  }
  const graph = new import_langgraph2.StateGraph(TripifyState).addNode("loadContext", loadContext).addNode("agent", agent).addNode("tools", toolNode).addEdge(import_langgraph2.START, "loadContext").addEdge("loadContext", "agent").addConditionalEdges("agent", shouldContinue).addEdge("tools", "agent").compile({ checkpointer: getCheckpointer() });
  return { graph, tools };
}
function graphStructure() {
  return {
    nodes: ["loadContext", "agent", "tools"],
    edges: [
      ["START", "loadContext"],
      ["loadContext", "agent"],
      ["agent", "tools|END"],
      ["tools", "agent"]
    ],
    threadIdFormat: "trip:{tripId}:user:{userId}"
  };
}
async function runTripifyTurn(deps, turns) {
  const { graph } = buildTripifyGraph(deps);
  const thread_id = tripThreadId(deps.tripId, deps.userId);
  const seenTools = /* @__PURE__ */ new Set();
  let text = "";
  const events = graph.streamEvents(
    { messages: toBaseMessages(turns) },
    { version: "v2", configurable: { thread_id } }
  );
  for await (const event of events) {
    if (event.event === "on_tool_start") {
      const name = String(event.name ?? "");
      if (name) seenTools.add(name);
    }
    if (event.event === "on_chat_model_stream") {
      const chunk = event.data.chunk;
      const content = chunk?.content;
      if (typeof content === "string") text += content;
      else if (Array.isArray(content)) {
        for (const part of content) {
          if (typeof part === "string") text += part;
          else if (part && typeof part === "object" && "text" in part && typeof part.text === "string")
            text += part.text;
        }
      }
    }
  }
  return { text, toolNames: [...seenTools] };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  buildTripifyGraph,
  graphStructure,
  runTripifyTurn
});
