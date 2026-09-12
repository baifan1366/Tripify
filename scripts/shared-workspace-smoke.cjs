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
  const out = path.join(root, "test-results/shared");
  fs.mkdirSync(out, { recursive: true });
  try {
    await page.goto(url + "/?view=chat");
    // Scope to the chat widget: the AI widget has its own composer.
    const composer = page.locator("#dock-chat .mvp-composer textarea");
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
    const chatWidget = page.locator("#dock-chat");
    const initialW = Number(await chatWidget.getAttribute("data-w"));
    await page
      .getByRole("button", { name: "Chat options", exact: true })
      .click();
    await page.getByRole("button", { name: "Make wider", exact: true }).click();
    assert.equal(Number(await chatWidget.getAttribute("data-w")), initialW + 1);
    await page
      .getByRole("button", { name: "Chat options", exact: true })
      .click();
    await page.getByRole("button", { name: "Move left", exact: true }).click();
    await page.keyboard.press("Escape");
    assert.equal(await composer.inputValue(), "Draft survives");
    // Layout presets only rearrange widgets; reset restores the default.
    await page.getByRole("button", { name: "Layouts", exact: true }).click();
    await page.getByRole("button", { name: "Planning", exact: true }).click();
    assert.equal(await page.locator("#dock-plan").getAttribute("data-w"), "5");
    assert.equal(await composer.inputValue(), "Draft survives");
    await page
      .getByRole("button", { name: "Reset layout", exact: true })
      .click();
    assert.equal(await page.locator("#dock-plan").getAttribute("data-w"), "6");
    // Reset hides Chat by design; restore it from the tray for the steps below.
    await page
      .locator(".dock-minimized")
      .getByRole("button", { name: "Chat", exact: true })
      .click();
    // Header Share exports a film; invitations are only in People.
    await page.getByRole("button", { name: "Share", exact: true }).click();
    await page
      .getByRole("button", { name: "Create video", exact: true })
      .waitFor();
    assert.equal(
      await page
        .locator(".trip-film-panel")
        .getByRole("button", { name: "Create invite code" })
        .count(),
      0,
    );
    await page.keyboard.press("Escape");
    // True encoded output must load and play in the browser, not just create a blob.
    await page.getByRole("button", { name: "Share", exact: true }).click();
    await page
      .getByRole("button", { name: "Create video", exact: true })
      .click();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await page
      .getByRole("button", { name: "Create video", exact: true })
      .waitFor();
    assert.equal(await page.locator(".trip-film-panel video").count(), 0);
    await page
      .getByRole("button", { name: "Create video", exact: true })
      .click();
    await page.locator(".trip-film-panel video").waitFor({ timeout: 120000 });
    await page.waitForFunction(
      () => document.querySelector(".trip-film-panel video")?.readyState >= 1,
    );
    assert.ok(
      await page
        .locator(".trip-film-panel video")
        .evaluate((v) => v.duration >= 27 && v.videoWidth === 960),
    );
    const downloadPromise = page.waitForEvent("download");
    await page
      .getByRole("link", { name: "Download video", exact: true })
      .click();
    const download = await downloadPromise;
    await download.saveAs(
      path.join(
        out,
        "trip-preview." + download.suggestedFilename().split(".").pop(),
      ),
    );
    await page.locator(".trip-film-panel video").evaluate(async (v) => {
      v.currentTime = 1;
      await v.play();
      v.pause();
    });
    await page.waitForFunction(
      () => document.querySelector(".trip-film-panel video")?.readyState >= 2,
    );
    await page.screenshot({ path: path.join(out, "video-export.png") });
    await page.keyboard.press("Escape");
    // Resize handles are fully absent outside layout editing; title has a real inset.
    await page.locator("#dock-plan .ws-widget-heading").hover();
    assert.equal(
      await page.locator(".react-resizable-handle:visible").count(),
      0,
    );
    assert.equal(
      await page
        .locator("#dock-plan .ws-widget-heading")
        .evaluate((el) => getComputedStyle(el).paddingLeft),
      "16px",
    );
    const activity = await page
      .locator("#dock-plan .mvp-activity-card")
      .first()
      .boundingBox();
    const actions = await page
      .locator("#dock-plan .journey-edit-actions")
      .boundingBox();
    assert.ok(
      actions.x >= activity.x + activity.width - 1 &&
        Math.abs(actions.y - activity.y) < 2,
    );
    await page
      .locator("#dock-plan .journey-edit-actions button")
      .first()
      .hover();
    const colors = await page
      .locator("#dock-plan .journey-edit-actions button")
      .first()
      .evaluate((el) => ({
        color: getComputedStyle(el).color,
        bg: getComputedStyle(el).backgroundColor,
      }));
    assert.notEqual(colors.color, colors.bg);
    assert.notEqual(colors.color, "rgb(255, 255, 255)");
    // Edit mode gates pointer-drag affordances; the ⋯ menu always works.
    await page
      .getByRole("button", { name: "Edit layout", exact: true })
      .click();
    assert.equal(
      await page.locator(".ws-canvas").getAttribute("data-editing"),
      "true",
    );
    await page.getByRole("button", { name: "Done", exact: true }).click();
    assert.equal(
      await page.locator(".ws-canvas").getAttribute("data-editing"),
      "false",
    );
    // Undo restores a hidden widget.
    await page
      .getByRole("button", { name: "People options", exact: true })
      .click();
    await page.getByRole("button", { name: "Minimize", exact: true }).click();
    await page
      .locator(".dock-minimized")
      .getByRole("button", { name: "People", exact: true })
      .waitFor();
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    assert.equal(
      await page
        .locator(".dock-minimized")
        .getByRole("button", { name: "People", exact: true })
        .count(),
      0,
    );
    // AI starter chips render before the first turn (5-day fixture trip).
    assert.equal(
      await page.locator("#dock-ai .ai-suggest-row button").count(),
      2,
    );
    const aiInput = page.locator("#dock-ai .trip-message-composer textarea");
    await aiInput.fill("Help plan my day");
    await aiInput.press("Enter");
    await page
      .locator('#dock-ai [aria-busy="true"] .ai-markdown strong')
      .waitFor();
    await page.locator("#dock-ai .ai-markdown table").waitFor();
    assert.equal(
      await page.locator("#dock-ai .ai-markdown table td").first().innerText(),
      "Museum",
    );
    // Appearance now lives in Account; fixture uses the actual app palette.
    await page.getByRole("button", { name: "Account", exact: true }).click();
    await page.getByRole("button", { name: "Dark mode", exact: true }).click();
    assert.equal(
      await page.evaluate(() =>
        document.documentElement.classList.contains("dark"),
      ),
      true,
    );
    assert.equal(
      await page.evaluate(() => localStorage.getItem("tripify-theme")),
      "dark",
    );
    await page.getByRole("button", { name: "Light mode", exact: true }).click();
    assert.equal(
      await page.evaluate(() =>
        document.documentElement.classList.contains("dark"),
      ),
      false,
    );
    await page.keyboard.press("Escape");
    assert.equal(
      await page
        .getByRole("button", { name: "Print / PDF", exact: true })
        .count(),
      1,
    );
    // Print stylesheet linearizes the grid and strips chrome.
    await page.emulateMedia({ media: "print" });
    assert.equal(
      await page.evaluate(
        () => getComputedStyle(document.querySelector(".ws-toolbar")).display,
      ),
      "none",
    );
    assert.equal(
      await page.evaluate(
        () =>
          getComputedStyle(document.querySelector(".react-grid-item")).position,
      ),
      "static",
    );
    await page.emulateMedia({ media: "screen" });
    // No realtime peers in the fixture: presence degrades to nothing.
    assert.equal(await page.locator(".ws-presence").count(), 0);
    // Layout persistence is debounced and stores geometry only.
    await page.waitForFunction(() =>
      (localStorage.getItem("tripify-workspace-grid-v1") || "").includes(
        '"chat"',
      ),
    );
    assert.doesNotMatch(
      await page.evaluate(
        () => localStorage.getItem("tripify-workspace-grid-v1") || "",
      ),
      /Draft survives/,
    );
    await page.evaluate(() => {
      window.testDatabase.failSend = true;
    });
    await page.locator("#dock-chat .mvp-composer button").click();
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
    await page.locator("#dock-chat .mvp-composer button").click();
    assert.equal(await composer.inputValue(), "中文输入");
    await composer.dispatchEvent("compositionend");
    for (const width of [1440, 1100, 390, 320])
      for (const locale of ["en", "zh", "ms"]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`${url}/?locale=${locale}&view=history`);
        // History shows a compact summary first; expand to full timeline.
        await page.locator(".history-summary button").click();
        await page.locator(".history-entry").waitFor();
        await page.locator(".history-entry summary").first().click();
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
    await page.keyboard.press("Escape");
    // People detail (Remove) lives in medium+ density: widen the widget.
    await page
      .getByRole("button", { name: "People options", exact: true })
      .click();
    await page.getByRole("button", { name: "Make wider", exact: true }).click();
    await page
      .getByRole("button", { name: "People options", exact: true })
      .click();
    await page.getByRole("button", { name: "Make wider", exact: true }).click();
    // People rail: select Alice before removing.
    await page.getByRole("button", { name: /Alice/ }).click();
    await page
      .locator("#dock-people")
      .getByRole("button", { name: "Remove", exact: true })
      .click();
    await page
      .getByText("Remove Alice from this trip?", { exact: true })
      .waitFor();
    await page
      .locator("#dock-people")
      .getByRole("button", { name: "Remove", exact: true })
      .click();
    await page.waitForFunction(() =>
      window.testDatabase.removed.includes("other"),
    );
    await page.goto(url + "/?view=plan");
    // Focus the Journey widget to exercise the full activity edit form.
    await page
      .getByRole("button", { name: "Expand Journey", exact: true })
      .click();
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
    await page.keyboard.press("Escape"); // close Journey focus overlay
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
      "PASS isolated UI: free-form grid (hide/restore, keyboard move/resize, preset switching, reset, focus mode, adaptive density), invite/remove, chat retry identity + incoming event + IME + minimized draft, stale edit recovery, history details, map missing-key/coordinate fallback, 3 locales × 4 widths. Transport fixtures only; no live Supabase or Google.",
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
