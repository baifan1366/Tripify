/* eslint-disable @typescript-eslint/no-require-imports -- Isolated TypeScript test loader. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
function load(file, overrides = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  new Function("require", "exports", source)(
    (name) => (name in overrides ? overrides[name] : require(name)),
    exports,
  );
  return exports;
}
const schedule = load("src/lib/maps/schedule.ts");
const placement = load("src/lib/maps/placement.ts", { "./schedule": schedule });
const a = {
  id: "a",
  day: 1,
  time: "09:00",
  duration: 90,
  latitude: 35,
  longitude: 139,
  title: "Museum",
  cost: 0,
};
const b = { ...a, id: "b", time: "10:30" };
test("Travel duration is additional to activity duration; fixed times never mutate", () => {
  const route = {
    from: "a",
    to: "b",
    seconds: 1081,
    meters: 1000,
    mode: "WALK",
  };
  assert.deepEqual(schedule.segmentTiming(a, b, route), {
    arrival: 649,
    conflict: 19,
    verified: true,
  });
  assert.equal(b.time, "10:30");
  assert.equal(schedule.activityEnd({ ...a, time: "23:30" }), "01:00 +1");
  assert.equal(schedule.segmentTiming(a, b).verified, false);
});
test("Chronological ordering matches server ties and fingerprint ignores unrelated edits", () => {
  assert.deepEqual(
    schedule.dayActivities([b, { ...a, id: "z" }, a], 1).map((a) => a.id),
    ["a", "z", "b"],
  );
  const key = schedule.routeFingerprint([a, b], 1);
  assert.equal(
    key,
    schedule.routeFingerprint([{ ...a, title: "Renamed", cost: 50 }, b], 1),
  );
  for (const changes of [
    { time: "08:30" },
    { duration: 120 },
    { latitude: 36 },
    { longitude: 140 },
    { day: 2 },
  ])
    assert.notEqual(
      key,
      schedule.routeFingerprint([{ ...a, ...changes }, b], 1),
    );
});
test("Opening hours require the entire visit and handle overnight/week boundaries", () => {
  const periods = [
    {
      open: { day: 6, hour: 22, minute: 0 },
      close: { day: 0, hour: 2, minute: 0 },
    },
  ];
  assert.equal(placement.openingAt(periods, 0, 30, 60), "open");
  assert.equal(placement.openingAt(periods, 0, 90, 60), "closed");
  assert.equal(placement.openingAt(undefined, 0, 30, 60), "unknown");
  assert.equal(
    placement.openingAt([{ open: { day: 0, hour: 0, minute: 0 } }], 4, 500, 60),
    "open",
  );
});
test("Placement endpoint authenticates and authorizes before calling paid route API", async () => {
  let paid = 0;
  const tripId = "55555555-5555-4555-8555-555555555555";
  for (const user of [null, { id: "outsider" }]) {
    const { POST } = load("src/app/api/maps/placement/route.ts", {
      "@/lib/supabase/server": {
        createClient: async () => ({
          auth: { getUser: async () => ({ data: { user } }) },
          from: () => ({
            select() {
              return this;
            },
            eq() {
              return this;
            },
            maybeSingle: async () => ({ data: null }),
          }),
        }),
      },
      "@/lib/maps/routes": {
        calculateRoute: async () => {
          paid++;
        },
      },
      "@/lib/maps/server-cache": { withinQuota: () => true },
      "@/lib/maps/schedule": schedule,
      "@/lib/maps/placement": placement,
      "@/lib/mvp/model": load("src/lib/mvp/model.ts"),
    });
    const response = await POST(
      new Request("http://localhost/api/maps/placement", {
        method: "POST",
        body: JSON.stringify({
          trip: tripId,
          version: 1,
          day: 1,
          duration: 60,
          mode: "WALK",
          latitude: 35,
          longitude: 139,
        }),
      }),
    );
    assert.equal(response.status, user ? 403 : 401);
  }
  assert.equal(paid, 0);
});
test("Existing segment cache recomputes only changed neighboring coordinates", async () => {
  const cache = load("src/lib/maps/server-cache.ts", { "server-only": {} });
  const { calculateRoute } = load("src/lib/maps/routes.ts", {
    "server-only": {},
    "./server-cache": cache,
  });
  const originalFetch = global.fetch,
    originalKey = process.env.GOOGLE_MAPS_SERVER_API_KEY;
  process.env.GOOGLE_MAPS_SERVER_API_KEY = "test-only";
  let calls = 0;
  global.fetch = async () => {
    calls++;
    return Response.json({
      routes: [{ duration: "600s", distanceMeters: 800 }],
    });
  };
  try {
    const c = { ...a, id: "c", latitude: 37 },
      d = { ...a, id: "d", latitude: 38 };
    await calculateRoute(a, b, "WALK");
    await calculateRoute(b, c, "WALK");
    await calculateRoute(c, d, "WALK");
    assert.equal(calls, 3);
    const changed = { ...b, latitude: 36 };
    await calculateRoute(a, changed, "WALK");
    await calculateRoute(changed, c, "WALK");
    await calculateRoute(c, d, "WALK");
    assert.equal(calls, 5);
    await calculateRoute(c, d, "BICYCLE");
    assert.equal(calls, 6);
  } finally {
    global.fetch = originalFetch;
    if (originalKey === undefined)
      delete process.env.GOOGLE_MAPS_SERVER_API_KEY;
    else process.env.GOOGLE_MAPS_SERVER_API_KEY = originalKey;
  }
});
