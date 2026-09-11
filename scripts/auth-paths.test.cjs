/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node test runner. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const Module = require('node:module');
const source = path.join(__dirname, '../src/lib/auth/paths.ts');
const compiled = new Module(source, module);
compiled._compile(ts.transpileModule(fs.readFileSync(source, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, source);
const { authLocale, localePath, safeAuthNext } = compiled.exports;

test('auth next rejects external, encoded, unimplemented and ambiguous destinations', () => {
  for (const input of ['https://evil.invalid', '//evil.invalid', '/\\evil.invalid', 'javascript:alert(1)', '/dashboard/../auth/callback', '/dashboard?next=//evil.invalid', '/%2f%2fevil.invalid', '/dashboard#x', ['/dashboard'], null, undefined, '/sign-in']) {
    assert.equal(safeAuthNext(input, 'zh'), '/zh/dashboard');
  }
});
test('valid dashboard routes retain their locale', () => {
  for (const route of ['/dashboard', '/zh/dashboard', '/ms/dashboard']) assert.equal(safeAuthNext(route, 'en'), route);
  assert.equal(localePath('en', '/sign-in'), '/sign-in');
  assert.equal(localePath('zh', '/sign-in'), '/zh/sign-in');
  assert.equal(authLocale('unexpected'), 'en');
});
test('MVP nested destinations are narrowly allowlisted', () => {
  for (const route of ['/dashboard/trips/new', '/zh/dashboard/account', '/ms/dashboard/preferences', '/zh/dashboard/trips/a1-b2']) assert.equal(safeAuthNext(route, 'en'), route);
  for (const route of ['/dashboard/admin', '/dashboard/trips/a/settings', '/dashboard/trips/../../auth', '/demo', '/dashboard/trips/a?view=budget']) assert.equal(safeAuthNext(route, 'en'), '/dashboard');
});
