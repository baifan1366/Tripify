/* eslint-disable @typescript-eslint/no-require-imports -- Standalone test runner. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const Module = require('node:module');
const source = path.join(__dirname, '../src/lib/mvp/model.ts');
const compiled = new Module(source, module);
compiled._compile(ts.transpileModule(fs.readFileSync(source, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, source);
const { dayCount, dateAt, estimatedTotal, forecastTotal } = compiled.exports;
const trip = {
  id: 't1',
  name: 'Tokyo',
  destination: 'Tokyo, Japan',
  start: '2026-10-20',
  end: '2026-10-24',
  currency: 'MYR',
  budget: 5000,
  timezone: 'Asia/Tokyo',
  activities: [
    { id: 'a', day: 1, time: '09:00', title: 'Museum', place: 'Town', cost: 100, duration: 60 },
    { id: 'b', day: 1, time: '14:00', title: 'Park', place: 'Town', cost: 20, duration: 60 },
    { id: 'c', day: 3, time: '10:00', title: 'Tower', place: 'City', cost: 80, duration: 60 },
  ],
  members: [],
};
test('inclusive date-only ranges are stable across a DST boundary', () => {
  assert.equal(dayCount('2026-03-07', '2026-03-10'), 4);
  assert.equal(dayCount('2026-10-20', '2026-10-20'), 1);
  assert.equal(dateAt('2026-12-31', 2).toISOString(), '2027-01-01T00:00:00.000Z');
});
test('budget totals derive truthfully from stored activities', () => {
  assert.equal(estimatedTotal(trip), 200);
  // 2 active days average 100/day; 3 empty days forecast +300.
  assert.equal(forecastTotal(trip), 500);
  assert.equal(forecastTotal({ ...trip, activities: [] }), 0);
});
test('database.sql is deliberately a non-executable design artifact', () => {
  const sql = fs.readFileSync(path.join(__dirname, '../database.sql'), 'utf8');
  assert.equal(sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--[^\n]*/g, '').trim(), '');
  assert.match(sql, /20260911123531_shared_trip_core.sql/);
  const migration = fs.readFileSync(path.join(__dirname, '../supabase/migrations/20260911123531_shared_trip_core.sql'), 'utf8');
  assert.equal((migration.match(/create table public\./g) || []).length, 6);
});
