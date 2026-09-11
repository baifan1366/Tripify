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
const { dayCount, dateAt, exampleTrip, applyDemoCompromise, estimatedTotal } = compiled.exports;
test('inclusive date-only ranges are stable across a DST boundary', () => {
  assert.equal(dayCount('2026-03-07', '2026-03-10'), 4);
  assert.equal(dayCount('2026-10-20', '2026-10-20'), 1);
  assert.equal(dateAt('2026-12-31', 2).toISOString(), '2027-01-01T00:00:00.000Z');
});
test('proposal application produces a new fixture and truthful derived costs', () => {
  const trip = exampleTrip();
  const result = applyDemoCompromise(trip);
  assert.equal(estimatedTotal(trip), 4120);
  assert.equal(estimatedTotal(result), 4140);
  assert.equal(trip.activities.some(item => item.id === 'shopping'), true);
  assert.equal(result.activities.some(item => item.id === 'shopping'), false);
  assert.equal(new Set(result.activities.map(item => item.id)).size, result.activities.length);
  assert.deepEqual(applyDemoCompromise(result), result);
  const realDraft = { ...trip, demo: false };
  assert.equal(applyDemoCompromise(realDraft), realDraft);
});
test('database.sql is deliberately a non-executable design artifact', () => {
  const sql = fs.readFileSync(path.join(__dirname, '../database.sql'), 'utf8');
  assert.equal(sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--[^\n]*/g, '').trim(), '');
  assert.equal((sql.match(/create table public\./g) || []).length, 3);
});
