/* eslint-disable @typescript-eslint/no-require-imports -- Standalone test runner. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../src/lib/auth/origin.ts'), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
for (const [environment, origin] of [['production', 'https://tripify-agent.vercel.app'], ['development', 'http://localhost:3000'], ['test', 'http://localhost:3000']]) {
  test(`${environment} auth redirects use the canonical origin and preserve locale/path`, () => {
    const context = { exports: {}, URL, process: { env: { NODE_ENV: environment } } };
    vm.runInNewContext(js, context);
    assert.equal(context.exports.getAuthOrigin(), origin);
    for (const route of ['/auth/callback', '/zh/auth/confirm', '/ms/dashboard', '/zh/sign-in?error=oauth']) assert.equal(context.exports.authURL(route), origin + route);
    for (const route of ['//evil.invalid', 'https://evil.invalid', '/\\evil.invalid']) assert.throws(() => context.exports.authURL(route));
  });
}
