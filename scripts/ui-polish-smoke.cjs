/* eslint-disable @typescript-eslint/no-require-imports -- Isolated browser UI fixture runner. */
const esbuild = require("esbuild");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
(async () => {
  const root = path.join(__dirname, "..");
  const aliases = {
    "@/lib/auth/actions": "polish-auth.js",
    "@/lib/supabase/client": "shared-backend.js",
    "@/components/mvp/mvp-provider": "shared-provider.jsx",
    "@/i18n/navigation": "shared-navigation.jsx",
    "next/navigation": "shared-navigation.jsx",
  };
  const result = await esbuild.build({
    absWorkingDir: root,
    entryPoints: ["scripts/fixtures/polish-entry.jsx"],
    bundle: true,
    write: false,
    outdir: "test-results/polish",
    jsx: "automatic",
    define: {
      "process.env.NODE_ENV": '"development"',
      "process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY": "window.testMapKey",
      "process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID": "window.testMapId",
    },
    plugins: [
      {
        name: "test-transports",
        setup(build) {
          build.onResolve(
            { filter: /^(@\/|next\/navigation$)|mvp-provider$/ },
            (args) =>
              args.path.endsWith("mvp-provider")
                ? { path: path.join(__dirname, "fixtures/shared-provider.jsx") }
                : aliases[args.path]
                  ? {
                      path: path.join(
                        __dirname,
                        "fixtures",
                        aliases[args.path],
                      ),
                    }
                  : undefined,
          );
        },
      },
    ],
  });
  const js = result.outputFiles.find((f) => f.path.endsWith(".js")).text;
  const css = result.outputFiles.find((f) => f.path.endsWith(".css")).text;
  const messages = Object.fromEntries(
    ["en", "zh", "ms"].map((locale) => [
      locale,
      Object.fromEntries(
        ["mvp", "dock", "shared"].map((ns) => [
          ns,
          JSON.parse(
            fs.readFileSync(
              path.join(root, "src/messages", ns, `${locale}.json`),
              "utf8",
            ),
          ),
        ]),
      ),
    ]),
  );
  const theme = fs
    .readFileSync(path.join(root, "src/app/globals.css"), "utf8")
    .match(/(?:\.dark )?\.trip-app-theme \{[^}]+\}/g)
    .join("\n");
  const reset =
    "button,input,select,textarea{font:inherit;color:inherit}button{border:0;background:transparent}a{color:inherit;text-decoration:inherit}h1,h2,h3,p{margin:0}";
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>:root{--background:#f6f8fc;--foreground:#07182c;--card:#fff;--primary:#1765d8;--primary-foreground:#fff;--accent:#eaf3ff;--border:#c8d6e5;--muted-foreground:#526780;--surface-hover:#eef4fb;--trip-font-sans:Arial,sans-serif;--app-z-nav:20;--app-z-popover:40}*{box-sizing:border-box}body{margin:0}button,input,select,textarea{font:inherit}button{cursor:pointer}button:disabled{cursor:default}button:focus-visible{outline:2px solid blue}.app-shell{display:block}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}${reset}${theme}${css}</style></head><body><div id="root"></div><script>window.testMessages=${JSON.stringify(messages)};window.testMapKey=location.search.includes("mapError")?"test-only-invalid-key":"";window.testMapId="test-map-id";</script><script src="/bundle.js"></script></body></html>`;
  const server = http.createServer((req, res) => {
    if (req.url === "/api/ai/chat") {
      res.writeHead(200, { "Content-Type": "text/event-stream" });
      res.write(
        "data: " +
          JSON.stringify({
            type: "token",
            text: "**Streamed recommendation**\n\n",
          }) +
          "\n\n",
      );
      setTimeout(() => {
        res.write(
          "data: " +
            JSON.stringify({
              type: "token",
              text: "| Stop | Time |\n| --- | --- |\n| Museum | 09:00 |",
            }) +
            "\n\n",
        );
        res.end(
          "data: " +
            JSON.stringify({
              type: "done",
              text: "**Streamed recommendation**\n\n| Stop | Time |\n| --- | --- |\n| Museum | 09:00 |",
            }) +
            "\n\n",
        );
      }, 1500);
      return;
    }
    res.setHeader(
      "Content-Type",
      req.url === "/bundle.js" ? "text/javascript" : "text/html",
    );
    res.end(req.url === "/bundle.js" ? js : html);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const url = `http://127.0.0.1:${server.address().port}`;
  const out = path.join(root, "test-results/polish");
  fs.mkdirSync(out, { recursive: true });
  async function auditButtons() {
    for (const button of await page
      .locator("button:visible:not(:disabled)")
      .all()) {
      await button.hover();
      const state = await button.evaluate((el) => {
        const rgb = (s) =>
          s
            .match(/^rgba?\(([^)]+)\)/)?.[1]
            .split(",")
            .map(Number);
        const fg = rgb(getComputedStyle(el).color);
        let parent = el,
          bg;
        while (parent) {
          const c = rgb(getComputedStyle(parent).backgroundColor);
          if (c && (c.length < 4 || c[3] === 1)) {
            bg = c;
            break;
          }
          parent = parent.parentElement;
        }
        const lum = (c) =>
          c
            .slice(0, 3)
            .map((v) => v / 255)
            .map((v) =>
              v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4,
            )
            .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
        const a = fg && lum(fg),
          b = bg && lum(bg);
        return {
          label: el.textContent.trim() || el.getAttribute("aria-label"),
          contrast:
            fg && bg ? (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) : null,
        };
      });
      if (state.contrast !== null)
        assert.ok(state.contrast >= 4.5, JSON.stringify(state));
    }
  }
  try {
    await page.goto(url + "/dashboard");
    await page
      .getByRole("button", { name: "Join a trip", exact: true })
      .waitFor();
    await auditButtons();
    assert.equal(await page.locator(".app-shell-chrome").count(), 0);
    await page
      .getByRole("button", { name: "Join a trip", exact: true })
      .click();
    await page.getByLabel("Invite code", { exact: true }).fill("bad");
    await page
      .getByRole("button", { name: "Accept invitation", exact: true })
      .click();
    await page
      .getByText("Enter a valid 64-character invitation code.")
      .waitFor();
    assert.equal(
      await page.evaluate(() => window.testDatabase.calls.length),
      0,
    );
    await page.getByLabel("Invite code", { exact: true }).fill("a".repeat(64));
    await page
      .getByRole("button", { name: "Accept invitation", exact: true })
      .click();
    await page.waitForFunction(() =>
      window.testDatabase.calls.some((c) => c.name === "trip_invite_accept"),
    );
    await page.locator(".app-popover").waitFor({ state: "hidden" });
    await page.goto(url + "/dashboard/trips/new");
    assert.equal(await page.locator(".app-shell-chrome").count(), 0);
    assert.equal(
      await page.locator('[name="timezone"]').evaluate((el) => el.tagName),
      "SELECT",
    );
    await page.locator(".trip-workspace-preview").waitFor({ state: "visible" });
    assert.equal(
      await page.locator(".mvp-create-form").getByRole("link").count(),
      0,
    );
    assert.doesNotMatch(
      await page.locator("main").innerText(),
      /1–60 days|Supabase|Asia\/Tokyo · Asia/,
    );
    await page.locator('[name="name"]').fill("Autumn in Tokyo");
    await page.locator('[name="destination"]').fill("Tokyo");
    await page.locator('[name="start"]').fill("2026-10-20");
    await page.locator('[name="end"]').fill("2026-10-24");
    await page.locator('[name="budget"]').fill("5000");
    await page.locator('[name="timezone"]').selectOption("Asia/Tokyo");
    await page
      .locator('[name="travelStyle"]')
      .fill("Slow sightseeing and local food");
    await auditButtons();
    await page.getByRole("button", { name: "Account", exact: true }).click();
    await page.getByRole("button", { name: "Dark mode", exact: true }).click();
    await page.keyboard.press("Escape");
    await auditButtons();
    await page.screenshot({
      path: path.join(out, "create-dark.png"),
      fullPage: true,
    });
    await page.getByRole("button", { name: "Account", exact: true }).click();
    await page.getByRole("button", { name: "Light mode", exact: true }).click();
    await page.keyboard.press("Escape");
    await page.screenshot({
      path: path.join(out, "create-desktop.png"),
      fullPage: true,
    });
    await page.evaluate(() => (window.testDatabase.failPreferences = true));
    await page.locator('.mvp-create-form button[type="submit"]').click();
    await page
      .getByText(
        "Your trip is created. Retry to finish saving preferences and open it.",
      )
      .waitFor();
    assert.equal(
      await page.evaluate(
        () =>
          window.testDatabase.calls.filter((c) => c.name === "trip_create")
            .length,
      ),
      1,
    );
    await page.evaluate(() => (window.testDatabase.failPreferences = false));
    await page.getByRole("button", { name: "Retry", exact: true }).click();
    await page.waitForURL(/dashboard\/trips\/[0-9]/);
    const calls = await page.evaluate(() => window.testDatabase.calls);
    assert.equal(
      calls.filter((c) => c.name === "trip_create").length,
      1,
      "preference retry must not create a duplicate trip",
    );
    assert.equal(
      calls.filter((c) => c.name === "trip_member_preferences").at(-1).args
        .p_data.interests,
      "Slow sightseeing and local food",
    );
    for (const locale of ["en", "zh", "ms"])
      for (const width of [1440, 390, 320]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(url + "/dashboard/trips/new?locale=" + locale);
        await page.locator('[name="timezone"]').waitFor();
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
          locale + "/" + width + " overflow",
        );
        if (width < 1100)
          assert.equal(
            await page.locator(".trip-workspace-preview").isVisible(),
            false,
          );
        if (locale === "zh" && width === 390)
          await page.screenshot({
            path: path.join(out, "create-mobile-zh.png"),
            fullPage: true,
          });
      }
    assert.deepEqual(errors, []);
    console.log(
      "PASS creation/join UI: explicit popover, validation, travel-style persistence, no duplicate trip on preference failure, timezone dropdown, wide SVG preview, 3 locales x 3 widths. Backend fixture only.",
    );
  } catch (error) {
    await page.screenshot({
      path: path.join(out, "failure.png"),
      fullPage: true,
    });
    console.error(errors);
    console.error((await page.locator("body").innerText()).slice(0, 2000));
    throw error;
  } finally {
    await browser.close();
    server.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
