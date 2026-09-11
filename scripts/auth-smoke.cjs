/* eslint-disable @typescript-eslint/no-require-imports -- Standalone CommonJS Node test runner. */
/* Run with PLAYWRIGHT_MODULE pointing to an installed Playwright package if needed.
 * No account is created and no email is sent. Provider failure responses are mocked.
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const base = process.env.AUTH_TEST_URL || 'http://localhost:3000';
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const out = path.join(process.cwd(), 'test-results', 'auth');
  fs.mkdirSync(out, { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const checks = [];
  try {
    for (const locale of ['en', 'zh', 'ms']) {
      const prefix = locale === 'en' ? '' : '/' + locale;
      await page.goto(base + prefix + '/sign-up');
      await page.locator('#name').waitFor();
      assert.equal(await page.locator('html').getAttribute('lang'), locale);
      assert.equal(await page.locator('form input:not([type=hidden])').count(), 4);
      await page.locator('button[type=submit]').click();
      assert.equal(await page.locator('input[aria-invalid=true]').count(), 3);
      assert.equal(await page.locator('#name').evaluate(el => el === document.activeElement), true);
      await page.locator('#name').fill('Travel Test');
      await page.locator('#email').fill('invalid-email');
      await page.locator('#password').fill('long-enough-password');
      await page.locator('#confirmPassword').fill('different-password');
      await page.locator('button[type=submit]').click();
      assert.equal(await page.locator('#email').getAttribute('aria-invalid'), 'true');
      assert.equal(await page.locator('#confirmPassword').getAttribute('aria-invalid'), 'true');
      await page.locator('.auth-password-toggle').click();
      assert.equal(await page.locator('#password').getAttribute('type'), 'text');
      await page.locator('.auth-password-toggle').click();
      assert.equal(await page.locator('#password').getAttribute('type'), 'password');
      await page.goto(base + prefix + '/dashboard');
      await page.waitForURL('**/sign-in?next=*');
      assert.equal(new URL(page.url()).pathname, prefix + '/sign-in');
      checks.push(locale + ': registration validation, password visibility, protected dashboard');
    }
    await page.goto(base + '/zh/sign-up');
    await page.screenshot({ path: path.join(out, 'signup-desktop.png'), fullPage: true });
    const focus = page.locator('#email');
    await focus.focus();
    assert.equal(await focus.evaluate(el => getComputedStyle(el).outlineStyle), 'solid');

    await page.goto(base + '/zh/sign-in');
    await page.route('**/auth/v1/token?*', route => route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ code: 'invalid_credentials', error_code: 'invalid_credentials', msg: 'Invalid login credentials' }) }));
    await page.locator('#email').fill('ui-only@example.invalid');
    await page.locator('#password').fill('ui-only-invalid-password');
    await page.locator('button[type=submit]').click();
    await page.locator('.auth-error').waitFor();
    assert.match(await page.locator('.auth-error').innerText(), /无法登录/);
    assert.equal(await page.locator('#email').inputValue(), 'ui-only@example.invalid');
    checks.push('Mocked invalid credentials: inline error and preserved email');
    await page.unroute('**/auth/v1/token?*');

    await page.goto(base + '/zh/auth/callback?error=access_denied&next=https://example.invalid');
    await page.waitForURL('**/zh/sign-in?error=oauth');
    assert.match(await page.locator('.auth-error').innerText(), /Google/);
    checks.push('OAuth cancellation and external next URL stay on local sign-in');
    await page.goto(base + '/zh/auth/confirm?token_hash=invalid&type=email');
    assert.equal(await page.locator('form').count(), 0);
    await page.goto(base + '/zh/reset-password');
    await page.waitForURL('**/zh/forgot-password?error=expired');
    checks.push('Invalid confirmation link and unauthenticated reset handled');

    let signupRequest;
    await page.route('**/auth/v1/signup?*', async route => {
      signupRequest = { url: route.request().url(), body: route.request().postDataJSON() };
      await new Promise(resolve => setTimeout(resolve, 300));
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'ui-test-user', identities: [], email: 'ui-only@example.invalid' }) });
    });
    await page.goto(base + '/zh/sign-up');
    await page.locator('#name').fill('UI test');
    await page.locator('#email').fill('ui-only@example.invalid');
    await page.locator('#password').fill('ui-only-long-password');
    await page.locator('#confirmPassword').fill('ui-only-long-password');
    await page.locator('button[type=submit]').click();
    await page.locator('.auth-sent').waitFor();
    assert.equal(signupRequest.body.data.locale, 'zh');
    assert.equal(new URL(signupRequest.url).searchParams.get('redirect_to'), base + '/zh/auth/confirm');
    assert.equal(await page.locator('.auth-sent button').first().isDisabled(), true);
    await page.screenshot({ path: path.join(out, 'verify-pending-mocked.png'), fullPage: true });
    checks.push('Mocked signup: localized confirmation URL, pending inbox state, resend cooldown');
    await page.unroute('**/auth/v1/signup?*');

    await page.route('**/auth/v1/recover?*', route => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
    await page.goto(base + '/zh/forgot-password');
    await page.locator('#email').fill('ui-only@example.invalid');
    await page.locator('button[type=submit]').click();
    await page.locator('.auth-sent').waitFor();
    assert.match(await page.locator('.auth-intro').innerText(), /如果/);
    checks.push('Mocked password recovery: anti-enumeration confirmation');
    await page.unroute('**/auth/v1/recover?*');

    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(base + '/zh/sign-up');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.equal(await page.locator('.auth-story').isVisible(), false);
      await page.screenshot({ path: path.join(out, `signup-mobile-${width}.png`), fullPage: true });
    }
    checks.push('320px / 390px mobile: no horizontal overflow; nonessential art hidden');
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(base + '/sign-in');
    await page.screenshot({ path: path.join(out, 'signin-desktop.png'), fullPage: true });
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ checks, pageErrors: errors, screenshots: out, liveEmailOrGoogleSuccessTested: false }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
