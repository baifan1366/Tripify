/* eslint-disable @typescript-eslint/no-require-imports -- Isolated TypeScript loader. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
function load(path, dependencies = {}) {
  const exports = {};
  new Function(
    "require",
    "exports",
    ts.transpileModule(fs.readFileSync(path, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
  )((name) => dependencies[name] ?? require(name), exports);
  return exports;
}
const model = load("src/lib/mvp/model.ts");
const { filmScenes } = load("src/lib/trips/video.ts", {
  "@/lib/mvp/model": model,
});
test("Film preserves all activities, empty days and costs across long-day pagination", () => {
  const trip = {
    name: "Tokyo",
    destination: "Tokyo",
    start: "2026-10-20",
    end: "2026-10-22",
    timezone: "Asia/Tokyo",
    currency: "MYR",
    budget: 5000,
    members: [],
    activities: Array.from({ length: 11 }, (_, i) => ({
      id: String(i),
      title: `Stop-${i}`,
      place: `Place-${i}`,
      day: i === 10 ? 3 : 1,
      time: `${String(9 + i).padStart(2, "0")}:00`,
      cost: 10,
      duration: 60,
    })).reverse(),
  };
  const before = JSON.stringify(trip);
  const scenes = filmScenes(trip, "en", {
    day: (n) => `Day ${n}`,
    empty: "Free day",
    summary: "Summary",
    budget: "Budget",
    estimated: "Estimate",
    minutes: (n) => `${n} minutes`,
    members: (n) => `${n} people`,
  });
  const rows = scenes.flatMap((s) => s.rows);
  for (const activity of trip.activities)
    assert.equal(
      rows.filter((r) => r.title.endsWith(`  ${activity.title}`)).length,
      1,
    );
  assert.ok(
    scenes.some((s) => s.eyebrow === "Day 2" && s.rows[0].title === "Free day"),
  );
  assert.match(scenes.at(-1).rows[0].title, /110\.00/);
  assert.equal(
    JSON.stringify(trip),
    before,
    "export must not reorder or mutate the shared trip",
  );
});
