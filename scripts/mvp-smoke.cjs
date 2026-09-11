/* eslint-disable @typescript-eslint/no-require-imports -- Standalone test runner. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

(async () => {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  const base = process.env.MVP_TEST_URL || "http://localhost:3000";
  const out = path.join(process.cwd(), "test-results", "mvp");
  fs.mkdirSync(out, { recursive: true });
  const errors = [],
    mutations = [],
    checks = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (/supabase\.co/.test(request.url()) && request.method() !== "GET")
      mutations.push(request.url());
  });
  const view = async (key) => {
    await page.locator(`.mvp-view-nav a[href$="view=${key}"]`).click();
  };
  try {
    for (const locale of ["/en", "/zh", "/ms"]) {
      await page.goto(base + locale + "/demo/trips/tokyo");
      await page.locator(".mvp-activity-card").first().waitFor();
      assert.equal(await page.locator(".mvp-activity-card").count(), 4);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      );
    }
    await page.goto(base + "/zh/demo/trips/tokyo");
    await page.locator(".mvp-map-pin").nth(1).click();
    assert.match(
      await page.locator(".mvp-activity-card[aria-pressed=true]").innerText(),
      /Shibuya Sky/,
    );
    await page.screenshot({
      path: path.join(out, "workspace-zh-desktop.png"),
      fullPage: true,
    });
    checks.push("Three locales; map pin and timeline selection synchronized");
    await page.goto(base + "/en/demo/trips/tokyo");
    await view("decisions");
    await page
      .getByRole("button", { name: "Approve in demo", exact: true })
      .click();
    await view("plan");
    assert.match(await page.locator(".mvp-timeline").innerText(), /shopping/);
    await view("decisions");
    await page
      .getByRole("button", { name: "Apply to demo itinerary", exact: true })
      .click();
    await view("plan");
    assert.match(
      await page.locator(".mvp-timeline").innerText(),
      /café break/i,
    );
    assert.doesNotMatch(
      await page.locator(".mvp-timeline").innerText(),
      /shopping/,
    );
    await view("budget");
    assert.match(
      await page.locator(".mvp-budget-overview").innerText(),
      /4,140/,
    );
    checks.push(
      "Approval alone leaves itinerary intact; explicit apply changes activities and derived budget",
    );
    await page.goto(base + "/en/demo/trips/new");
    await page.locator("button[type=submit]").click();
    assert.equal(
      await page.locator("[name=name]").getAttribute("aria-invalid"),
      "true",
    );
    for (const [name, value] of Object.entries({
      name: "UI smoke trip",
      destination: "Penang",
      start: "2026-10-20",
      end: "2026-10-22",
      budget: "600",
    }))
      await page.locator(`[name=${name}]`).fill(value);
    await page.locator("button[type=submit]").click();
    await page
      .getByRole("link", { name: "UI smoke trip", exact: true })
      .click();
    await page.locator(".mvp-trip-title h1").waitFor();
    assert.equal(await page.locator(".mvp-activity-card").count(), 0);
    const draftUrl = page.url();
    await page
      .getByRole("button", { name: "Add activity", exact: true })
      .click();
    for (const [name, value] of Object.entries({
      title: "Museum visit",
      place: "George Town",
      time: "10:00",
      cost: "25",
      duration: "90",
    }))
      await page.locator(`[name=${name}]`).fill(value);
    await page
      .getByRole("button", { name: "Save in this tab", exact: true })
      .click();
    assert.match(
      await page.locator(".mvp-activity-card").innerText(),
      /Museum visit/,
    );
    await view("budget");
    assert.match(await page.locator(".mvp-budget-overview").innerText(), /25/);
    await view("chat");
    await page.locator(".mvp-composer textarea").fill("Local test message");
    await page.locator(".mvp-composer button").click();
    assert.match(
      await page.locator(".mvp-chat-own").innerText(),
      /Local test message/,
    );
    await page.goto(draftUrl);
    await page.locator(".mvp-empty").waitFor();
    checks.push(
      "Create validation; empty draft; add activity; budget; local chat; refresh explains cleared in-memory draft",
    );
    await page.goto(base + "/en/demo");
    await page.getByRole("textbox", { name: "Search trips" }).fill("not-a-match");
    await page.getByRole("button", { name: "Clear search", exact: true }).last().click();
    assert.equal(await page.locator(".mvp-trip-card").count(), 1);
    await page.getByRole("link", { name: "Tokyo, together", exact: true }).click();
    await view("people");
    await page.getByLabel("Interests", { exact: true }).fill("Architecture and cafés");
    await page.locator('[name="memberBudget"]').fill("-1");
    await page.getByRole("button", { name: "Save in this tab", exact: true }).click();
    assert.equal(await page.locator('[name="memberBudget"]').getAttribute("aria-invalid"), "true");
    await page.locator('[name="memberBudget"]').fill("800");
    await page.getByRole("button", { name: "Save in this tab", exact: true }).click();
    await view("plan");
    await page.getByRole("button", { name: "Add activity", exact: true }).click();
    for (const [name, value] of Object.entries({ title: "Another activity", place: "Tokyo", time: "20:00" })) await page.locator(`[name=${name}]`).fill(value);
    await page.getByRole("button", { name: "Save in this tab", exact: true }).click();
    await view("decisions");
    assert.equal(await page.getByRole("button", { name: "Approve in demo", exact: true }).isDisabled(), true);
    await page.getByRole("button", { name: "Reset proposal demo", exact: true }).click();
    await view("people");
    assert.equal(await page.getByLabel("Interests", { exact: true }).inputValue(), "Architecture and cafés");
    assert.equal(await page.locator('[name="memberBudget"]').inputValue(), "800");
    checks.push("No-results clear; preference validation; stale proposal blocked; reset preserves preferences");
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(base + "/zh/demo/trips/tokyo");
      for (const key of ["plan", "map", "chat", "decisions", "budget"]) {
        await view(key);
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
          `overflow: ${width}/${key}`,
        );
      }
      await view("plan");
      await page.screenshot({
        path: path.join(out, `workspace-mobile-${width}.png`),
        fullPage: true,
      });
    }
    checks.push(
      "320px and 390px: all five mobile views usable without horizontal page overflow",
    );
    await page.goto(base + "/zh/dashboard/trips/new");
    await page.waitForURL("**/sign-in?next=*");
    assert.deepEqual(errors, []);
    assert.deepEqual(mutations, []);
    console.log(
      JSON.stringify(
        {
          checks,
          pageErrors: errors,
          supabaseMutations: mutations,
          screenshots: out,
        },
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
