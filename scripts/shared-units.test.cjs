/* eslint-disable @typescript-eslint/no-require-imports -- TypeScript unit loader without a second runtime. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
function load(file, overrides = {}) {
  const filename = path.join(__dirname, "..", file);
  const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const exports = {};
  new Function("require", "exports", source)(
    (name) => (name in overrides ? overrides[name] : require(name)),
    exports,
  );
  return exports;
}
test("layout parser keeps business data out and clamps, deduplicates and migrates panels", () => {
  const { parseLayout, movePanel, panelIds } = load(
    "src/lib/mvp/workspace-layout.ts",
  );
  const layout = parseLayout({
    version: 1,
    trips: [{ secret: true }],
    panels: [
      { id: "map", width: -50, state: "open" },
      { id: "map", width: 4000 },
      { id: "history", width: 4000, state: "collapsed" },
      { id: "intruder" },
    ],
  });
  assert.deepEqual(Object.keys(layout), ["version", "panels"]);
  assert.equal(layout.panels.length, panelIds.length);
  assert.equal(layout.panels[0].width, 320);
  assert.equal(layout.panels[1].width, 960);
  assert.equal(movePanel(layout, "history", "map").panels[0].id, "history");
  assert.equal(layout.panels[0].id, "map");
});
test("geographic adapters reject missing/invalid coordinates and decode Google geometry", () => {
  const { coordinates, decodePolyline } = load("src/lib/maps/adapters.ts");
  assert.equal(coordinates({ x: 34, y: 36 }), null);
  assert.equal(coordinates({ latitude: NaN, longitude: 0 }), null);
  assert.equal(coordinates({ latitude: 100, longitude: 0 }), null);
  assert.deepEqual(coordinates({ latitude: 0, longitude: 0 }), {
    lat: 0,
    lng: 0,
  });
  assert.deepEqual(decodePolyline("_p~iF~ps|U_ulLnnqC_mqNvxq`@"), [
    { lat: 38.5, lng: -120.2 },
    { lat: 40.7, lng: -120.95 },
    { lat: 43.252, lng: -126.453 },
  ]);
  assert.throws(() => decodePolyline("_"), /INVALID_POLYLINE/);
});
test("history produces readable meaningful changes, not timestamps or chat snapshots", () => {
  const { versionChanges } = load("src/lib/trips/history.ts");
  const before = {
    trip: { name: "Tokyo", budget_total: 5000, updated_at: "old" },
    activities: [{ id: "a", title: "Museum", start_time: "09:00:00" }],
  };
  const after = {
    trip: { name: "Tokyo", budget_total: 5500, updated_at: "new" },
    activities: [{ id: "a", title: "Museum", start_time: "10:30:00" }],
  };
  assert.deepEqual(versionChanges(after, before), [
    { field: "budget_total", before: 5000, after: 5500 },
    {
      field: "start_time",
      name: "Museum",
      before: "09:00:00",
      after: "10:30:00",
    },
  ]);
});
test("Routes handler refuses unauthenticated/outsider requests before any paid API call", async () => {
  let authenticated = false,
    allowed = false,
    paid = 0;
  const client = {
    auth: {
      getUser: async () => ({
        data: { user: authenticated ? { id: "owner" } : null },
      }),
    },
    from: () => ({
      select() {
        return this;
      },
      eq() {
        return this;
      },
      maybeSingle: async () => ({
        data: allowed ? { id: "trip", version: 1 } : null,
      }),
    }),
  };
  const handler = load("src/app/api/maps/routes/route.ts", {
    "@/lib/supabase/server": { createClient: async () => client },
    "@/lib/debug": { debugLog: () => {} },
    "@/lib/maps/routes": {
      calculateRoute: async () => {
        paid++;
      },
    },
    "@/lib/maps/server-cache": { withinQuota: () => true },
  });
  const request = () =>
    new Request(
      "http://localhost/api/maps/routes?trip=55555555-5555-4555-8555-555555555555&day=1&mode=WALK",
    );
  assert.equal((await handler.GET(request())).status, 401);
  authenticated = true;
  assert.equal((await handler.GET(request())).status, 403);
  assert.equal(paid, 0);
  assert.equal(
    (
      await handler.GET(
        new Request("http://localhost/api/maps/routes?trip=wrong"),
      )
    ).status,
    400,
  );
});
test("shared/dock/mvp locale catalogs have identical keys", () => {
  for (const namespace of ["shared", "dock", "mvp"]) {
    const keys = ["en", "zh", "ms"].map((locale) =>
      Object.keys(
        JSON.parse(
          fs.readFileSync(
            path.join(__dirname, `../src/messages/${namespace}/${locale}.json`),
            "utf8",
          ),
        ),
      ).sort(),
    );
    assert.deepEqual(keys[0], keys[1]);
    assert.deepEqual(keys[0], keys[2]);
  }
});
