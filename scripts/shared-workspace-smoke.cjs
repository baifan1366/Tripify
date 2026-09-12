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
    "@/lib/supabase/client": "shared-backend.js",
    "@/components/mvp/mvp-provider": "shared-provider.jsx",
    "@/i18n/navigation": "shared-navigation.jsx",
    "next/navigation": "shared-navigation.jsx",
  };
  const result = await esbuild.build({
    absWorkingDir: root,
    entryPoints: ["scripts/fixtures/shared-entry.jsx"],
    bundle: true,
    write: false,
    outdir: "test-results/shared",
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
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>:root{--background:#f6f8fc;--foreground:#07182c;--card:#fff;--primary:#1765d8;--primary-foreground:#fff;--accent:#eaf3ff;--border:#c8d6e5;--muted-foreground:#526780;--surface-hover:#eef4fb;--trip-font-sans:Arial,sans-serif;--app-z-nav:20;--app-z-popover:40}*{box-sizing:border-box}body{margin:0}button,input,select,textarea{font:inherit}button{cursor:pointer}button:disabled{cursor:default}button:focus-visible{outline:2px solid blue}.app-shell{display:block}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}${css}</style></head><body><div id="root"></div><script>window.testMessages=${JSON.stringify(messages)};window.testMapKey=location.search.includes("mapError")?"test-only-invalid-key":"";window.testMapId="test-map-id";</script><script src="/bundle.js"></script></body></html>`;
  const server = http.createServer((req, res) => {
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
  const out = path.join(root, "test-results/shared");
  fs.mkdirSync(out, { recursive: true });
  try {
    await page.goto(url + "/?view=chat");
    const composer = page.locator(".mvp-composer textarea");
    await composer.fill("Draft survives");
    await page
      .getByRole("button", { name: "Chat options", exact: true })
      .click();
    await page.getByRole("button", { name: "Minimize", exact: true }).click();
    await page
      .locator(".dock-minimized")
      .getByRole("button", { name: "Chat", exact: true })
      .click();
    assert.equal(await composer.inputValue(), "Draft survives");
    const splitter = page.getByRole("separator", {
      name: "Resize Chat",
      exact: true,
    });
    const initialWidth = Number(await splitter.getAttribute("aria-valuenow"));
    await splitter.focus();
    await page.keyboard.press("ArrowRight");
    assert.equal(
      Number(await splitter.getAttribute("aria-valuenow")),
      initialWidth + 20,
    );
    await page
      .getByRole("button", { name: "Chat options", exact: true })
      .click();
    await page.getByRole("button", { name: "Move left", exact: true }).click();
    await page.keyboard.press("Escape");
    assert.equal(await composer.inputValue(), "Draft survives");
    assert.doesNotMatch(
      await page.evaluate(() =>
        localStorage.getItem("tripify.workspace-layout.v1"),
      ),
      /Draft survives/,
    );
    await page.evaluate(() => {
      window.testDatabase.failSend = true;
    });
    await page.locator(".mvp-composer button").click();
    await page.getByText("Not sent. Retry uses the same message ID.").waitFor();
    await page.evaluate(() => {
      window.testDatabase.failSend = false;
    });
    await page
      .locator("#dock-chat")
      .getByRole("button", { name: "Retry", exact: true })
      .click();
    await page.waitForFunction(() => window.testDatabase.messages.length === 1);
    const calls = await page.evaluate(() =>
      window.testDatabase.calls.filter((c) => c.name === "trip_chat_send"),
    );
    assert.equal(
      calls[0].args.p_client_message_id,
      calls[1].args.p_client_message_id,
    );
    await page.evaluate(() =>
      window.deliverMessage("Incoming fixture message"),
    );
    await page.getByText("Incoming fixture message", { exact: true }).waitFor();
    await composer.fill("中文输入");
    await composer.dispatchEvent("compositionstart");
    await page.locator(".mvp-composer button").click();
    assert.equal(await composer.inputValue(), "中文输入");
    await composer.dispatchEvent("compositionend");
    for (const width of [1440, 1100, 390, 320])
      for (const locale of ["en", "zh", "ms"]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`${url}/?locale=${locale}&view=history`);
        await page.locator(".history-entry").waitFor();
        await page.locator(".history-entry summary").click();
        assert.ok(
          (await page.locator(".history-entry dl").innerText()).includes(
            "5,000",
          ) || locale === "ms",
        );
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
          `${width}/${locale} overflow`,
        );
      }
    await page.setViewportSize({ width: 1100, height: 900 });
    await page.goto(url + "/?view=people");
    await page.getByRole("button", { name: "Create invite code" }).click();
    assert.equal(
      (await page.getByLabel("Invite code", { exact: true }).inputValue())
        .length,
      64,
    );
    await page.getByRole("button", { name: "Remove", exact: true }).click();
    await page
      .getByText("Remove Alice from this trip?", { exact: true })
      .waitFor();
    await page.getByRole("button", { name: "Remove", exact: true }).click();
    await page.waitForFunction(() =>
      window.testDatabase.removed.includes("other"),
    );
    await page.goto(url + "/?view=plan");
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await page.locator('[name="time"]').fill("10:30");
    await page.evaluate(() => {
      window.testDatabase.conflict = true;
      window.testDatabase.version = 2;
    });
    await page
      .locator(".mvp-activity-form")
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    await page.getByText(/This trip has a newer version/).waitFor();
    assert.equal(await page.locator('[name="time"]').inputValue(), "10:30");
    assert.equal(
      await page
        .locator(".mvp-activity-form")
        .getByRole("button", { name: "Save changes", exact: true })
        .isDisabled(),
      true,
    );
    await page
      .getByRole("button", {
        name: "I reviewed version 2 · keep my edits",
        exact: true,
      })
      .click();
    await page.evaluate(() => {
      window.testDatabase.conflict = false;
    });
    await page
      .locator(".mvp-activity-form")
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    await page.waitForFunction(() => window.testDatabase.version === 3);
    await page.goto(url + "/?view=map");
    await page
      .getByText("Google Map unavailable. Your itinerary remains usable below.")
      .waitFor();
    await page.locator(".schematic-activity-list button").click();
    await page.screenshot({
      path: path.join(out, "shared-workspace.png"),
      fullPage: true,
    });
    let abortedMapLoads = 0;
    await page.route("**/maps.googleapis.com/**", (route) => {
      abortedMapLoads++;
      return route.abort();
    });
    await page.goto(url + "/?view=map&mapError=1");
    await page
      .getByText("Google Map unavailable. Your itinerary remains usable below.")
      .waitFor();
    assert.equal(
      await page.locator(".schematic-activity-list button").count(),
      1,
    );
    assert.ok(
      abortedMapLoads > 0,
      "Google loader actually attempted and failed",
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS isolated UI: invite/remove, chat retry identity + incoming event + IME + minimized draft, stale edit recovery, history details, map missing-key/coordinate fallback, 3 locales × 4 widths. Transport fixtures only; no live Supabase or Google.",
    );
  } catch (error) {
    await page.screenshot({
      path: path.join(out, "failure.png"),
      fullPage: true,
    });
    console.error("Browser errors:", errors);
    console.error((await page.locator("body").innerText()).slice(0, 1200));
    throw error;
  } finally {
    await browser.close();
    server.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
