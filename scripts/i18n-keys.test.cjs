/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node test runner. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function sourceFiles() {
  const files = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.tsx?$/.test(e.name)) files.push(p);
    }
  };
  walk(path.join(__dirname, "..", "src"));
  return files;
}

// Static template usages the literal scanner cannot see; keep in sync by hand.
const DYNAMIC_KEYS = {
  shared: [
    "proposal_open",
    "proposal_applied",
    "proposal_cancelled",
    "op_activity_add",
    "op_activity_update",
    "youApproved",
    "youRejected",
    "voteRule",
    "conflict",
    "noChanges",
    "inviteExpired",
    "inviteUsed",
    "forbidden",
    "failed",
  ],
  dock: [
    "proposal_open",
    "proposal_applied",
    "proposal_cancelled",
    "risk_low",
    "risk_medium",
    "risk_high",
  ],
  mvp: [],
};

test("every static t()/m()/w() key resolves in its namespace catalog", () => {
  const problems = [];
  for (const f of sourceFiles()) {
    const src = fs.readFileSync(f, "utf8");
    const nsMap = {};
    const reNs = /const\s+(\w+)\s*=\s*useTranslations\("([a-z]+)"\)/g;
    let m;
    while ((m = reNs.exec(src))) nsMap[m[1]] = m[2];
    const reCall = /(^|[^a-zA-Z_.$])([a-zA-Z_]\w*)\("([a-zA-Z0-9_]+)"\)/gm;
    while ((m = reCall.exec(src))) {
      const ns = nsMap[m[2]];
      if (!ns || !["mvp", "shared", "dock", "auth"].includes(ns)) continue;
      let catalog;
      try {
        const file =
          ns === "auth"
            ? path.join(__dirname, "..", "src/messages/auth/en.json")
            : path.join(__dirname, "..", `src/messages/${ns}/en.json`);
        catalog = JSON.parse(fs.readFileSync(file, "utf8"));
      } catch {
        continue;
      }
      if (!(m[3] in catalog)) problems.push(`${ns}.${m[3]} (${f})`);
    }
  }
  assert.deepEqual(problems, []);
});

test("dynamic template keys resolve in their namespace catalogs", () => {
  for (const [ns, keys] of Object.entries(DYNAMIC_KEYS)) {
    const catalog = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, "..", `src/messages/${ns}/en.json`),
        "utf8",
      ),
    );
    for (const key of keys) assert.ok(key in catalog, `${ns}.${key}`);
  }
});
