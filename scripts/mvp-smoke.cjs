/* eslint-disable @typescript-eslint/no-require-imports -- Standalone browser regression. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

(async () => {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage({
    viewport: { width: 1100, height: 1000 },
    reducedMotion: "reduce",
  });
  const base = process.env.MVP_TEST_URL || "http://localhost:3000";
  const out = path.join(process.cwd(), "test-results", "mvp");
  fs.mkdirSync(out, { recursive: true });
  const errors = [],
    checks = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    for (const locale of ["/en", "/zh", "/ms"]) {
      await page.goto(base + locale);
      await page.locator("main, header").first().waitFor();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
        `overflow: landing ${locale}`,
      );
    }
    checks.push("Landing renders in three locales without page overflow");
    await page.goto(base + "/en/sign-in");
    await page.locator('input[type="password"]').first().waitFor();
    checks.push("Sign-in page renders its form");
    await page.goto(base + "/zh/dashboard/trips/new");
    await page.waitForURL("**/sign-in?next=*");
    checks.push("Unauthenticated dashboard redirects to sign-in with next");
    const demoResponse = await page.goto(base + "/en/demo/trips/tokyo");
    assert.equal(demoResponse.status(), 404);
    checks.push("Removed demo URL returns 404 instead of the workspace");
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(base + "/zh/sign-in");
      await page.locator('input[type="password"]').first().waitFor();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
        `overflow: sign-in ${width}`,
      );
    }
    checks.push("320px and 390px: sign-in usable without horizontal overflow");
    await page.setViewportSize({ width: 1100, height: 1000 });
    await page.goto(base + "/en/sign-in");
    await page.screenshot({ path: path.join(out, "sign-in.png") });
    assert.deepEqual(errors, []);
    console.log(
      JSON.stringify(
        { checks, pageErrors: errors, screenshots: out },
        null,
        2,
      ),
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
