/* eslint-disable @typescript-eslint/no-require-imports -- Isolated browser integration test. */
const esbuild = require("esbuild"),
  fs = require("node:fs"),
  path = require("node:path"),
  http = require("node:http"),
  assert = require("node:assert/strict");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
(async () => {
  const root = path.resolve(__dirname, "..");
  const bundle = await esbuild.build({
    absWorkingDir: root,
    entryPoints: ["scripts/fixtures/map-entry.jsx"],
    bundle: true,
    write: false,
    outdir: "test-results/map",
    jsx: "automatic",
    define: {
      "process.env.NODE_ENV": '"development"',
      "process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY": '"fixture"',
      "process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID": '"fixture"',
    },
    plugins: [
      {
        name: "isolated-transports",
        setup(build) {
          build.onResolve(
            {
              filter:
                /^(@vis.gl\/react-google-maps|@\/lib\/supabase\/client|@\/components\/mvp\/mvp-provider)$/,
            },
            (args) => ({
              path: path.join(
                root,
                "scripts/fixtures",
                args.path === "@vis.gl/react-google-maps"
                  ? "map-sdk.jsx"
                  : "map-provider.jsx",
              ),
            }),
          );
        },
      },
    ],
  });
  const js = bundle.outputFiles.find((f) => f.path.endsWith(".js")).text,
    css = bundle.outputFiles.find((f) => f.path.endsWith(".css")).text;
  const catalogs = Object.fromEntries(
    ["en", "zh", "ms"].map((locale) => [
      locale,
      Object.fromEntries(
        ["shared", "mvp", "dock"].map((ns) => [
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
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>:root{--card:#fff;--foreground:#0b1f33;--background:#f6f8fc;--primary:#1765d8;--primary-foreground:#fff;--border:#c8d6e5;--muted-foreground:#526780;--accent:#eaf3ff;--radius:6px;--trip-font-sans:Arial,sans-serif}*{box-sizing:border-box}body{margin:0;font-family:Arial}button,input,select{font:inherit}button{cursor:pointer}button:focus-visible{outline:2px solid #1765d8}.fixture-workspace{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:16px;padding:16px}.fixture-planner{max-height:550px;overflow:auto}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}@media(max-width:600px){.fixture-workspace{display:block;padding:0}}${css}</style></head><body><div id="root"></div><script>window.testMessages=${JSON.stringify(catalogs)}</script><script src="/bundle.js"></script></body></html>`;
  const server = http.createServer((req, res) => {
    res.setHeader(
      "Content-Type",
      req.url === "/bundle.js" ? "text/javascript" : "text/html",
    );
    res.end(req.url === "/bundle.js" ? js : html);
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage({
    viewport: { width: 1200, height: 800 },
    reducedMotion: "reduce",
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const routeCalls = [];
  await page.route("**/api/maps/routes?**", async (route) => {
    const url = new URL(route.request().url());
    routeCalls.push(url.search);
    const db = await page.evaluate(() => window.mapDb);
    const items = db.activities
      .filter((a) => a.day === Number(url.searchParams.get("day")))
      .sort((a, b) => a.time.localeCompare(b.time));
    await route.fulfill({
      json: {
        version: db.version,
        segments: items.slice(0, -1).map((a, i) => ({
          from: a.id,
          to: items[i + 1].id,
          mode: url.searchParams.get("mode"),
          seconds: 1080,
          meters: 1200,
          polyline: "_p~iF~ps|U_ulLnnqC_mqNvxq`@",
        })),
      },
    });
  });
  await page.route("**/api/maps/placement", (route) =>
    route.fulfill({
      json: {
        candidates: [
          {
            day: 2,
            afterId: "",
            time: "10:00",
            detourMinutes: 0,
            conflictMinutes: 0,
            opening: "open",
            routesVerified: true,
          },
        ],
      },
    }),
  );
  await page.route("**/api/ai/chat", (route) =>
    route.fulfill({
      contentType: "text/event-stream",
      body: 'data: {"type":"done","text":"Day two has enough time for this visit.","tools":["get_itinerary"]}\n\n',
    }),
  );
  const url = `http://127.0.0.1:${server.address().port}`;
  try {
    await page.goto(url);
    await page.locator(".map-route-label").first().waitFor();
    assert.equal(routeCalls.length, 1);
    assert.equal(
      await page.getByRole("button", { name: "Calculate routes" }).count(),
      0,
    );
    assert.match(await page.locator(".journey-segment").innerText(), /18 min/);
    assert.match(
      await page.locator(".journey-segment").innerText(),
      /18 min schedule conflict/,
    );
    await page
      .locator(".mvp-activity-card")
      .filter({ hasText: "Lunch" })
      .click();
    assert.equal(
      await page
        .getByRole("button", { name: "Stop 2, Lunch, 10:30" })
        .getAttribute("aria-pressed"),
      "true",
    );
    await page.getByRole("button", { name: "Stop 1, Temple, 09:00" }).click();
    assert.equal(
      await page
        .locator(".mvp-activity-card")
        .filter({ hasText: "Temple" })
        .getAttribute("aria-pressed"),
      "true",
    );
    await page
      .getByRole("combobox", { name: "Transport", exact: true })
      .selectOption("BICYCLE");
    await page.waitForFunction(() =>
      document
        .querySelector(".journey-segment")
        ?.textContent.includes("Cycling"),
    );
    assert.equal(routeCalls.length, 2);
    await page.getByRole("button", { name: "Transit", exact: true }).click();
    await page.waitForFunction(() => window.transitVisible === true);
    assert.equal(routeCalls.length, 2);
    const search = page.getByRole("textbox", {
      name: "Search places in Kyoto…",
    });
    await search.fill("Nishiki");
    assert.equal(await page.evaluate(() => window.placeSearches || 0), 0);
    await search.press("Enter");
    await page.locator(".map-search-results button").click();
    await page
      .getByRole("button", { name: "Add to itinerary", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    await dialog.getByRole("button", { name: "Find best time" }).click();
    await dialog.getByRole("button", { name: "Use this time" }).click();
    await page.evaluate(() => {
      window.failSave = true;
    });
    await dialog
      .getByRole("button", { name: "Add to itinerary", exact: true })
      .click();
    await dialog.getByRole("alert").waitFor();
    assert.equal(
      await dialog.locator('[name="title"]').inputValue(),
      "Nishiki Market",
    );
    await page.evaluate(() => {
      window.failSave = false;
      window.mapDb.version++;
    });
    await dialog.getByRole("button", { name: "Add to itinerary", exact: true }).click();
    await dialog.getByRole("button", { name: "I reviewed version 2 · keep my edits" }).click();
    await dialog
      .getByRole("button", { name: "Add to itinerary", exact: true })
      .click();
    await dialog.waitFor({ state: "hidden" });
    await page
      .getByRole("button", { name: "Stop 1, Nishiki Market, 10:00" })
      .waitFor();
    assert.equal(await page.evaluate(() => window.mapDb.activities.length), 3);
    assert.equal(await page.evaluate(() => window.mapDb.activities[2].day), 2);
    await page.reload();
    await page
      .getByRole("combobox", { name: "Day", exact: true })
      .selectOption("2");
    await page
      .getByRole("button", { name: "Stop 1, Nishiki Market, 10:00" })
      .waitFor();
    await page.evaluate(() =>
      window.testMap.emit("contextmenu", {
        latLng: { toJSON: () => ({ lat: 35.01, lng: 135.77 }) },
      }),
    );
    await page
      .getByRole("button", { name: "Add to itinerary", exact: true })
      .click();
    await dialog.locator('[name="title"]').fill("Riverside photo spot");
    await dialog
      .getByRole("button", { name: "Add to itinerary", exact: true })
      .click();
    await dialog.waitFor({ state: "hidden" });
    assert.equal(
      await page.evaluate(() => window.mapDb.activities.at(-1).latitude),
      35.01,
    );
    await page.locator(".map-route-label").first().waitFor();
    await page.screenshot({
      path: path.join(root, "test-results/map-planning-desktop.png"),
    });
    for (const locale of ["en", "zh", "ms"]) {
      await page.goto(url + "/?locale=" + locale);
      await page.setViewportSize({ width: 360, height: 780 });
      await page.locator(".map-toolbar").waitFor();
      await page.locator(".map-route-label").first().waitFor();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
        `${locale} overflow`,
      );
      await page.screenshot({
        path: path.join(root, `test-results/map-planning-${locale}-narrow.png`),
      });
    }
    assert.deepEqual(errors, []);
    console.log(
      "PASS map planning browser: automatic routes, mode, independent transit, shared selection, search, placement AI, failed save retention, persisted add/reload, custom coordinates, three narrow locales. Isolated SDK/backend fixtures only.",
    );
  } finally {
    await browser.close();
    server.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
