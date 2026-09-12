/* eslint-disable @typescript-eslint/no-require-imports -- Isolated SQL integration runner. */
const { PGlite } = require("@electric-sql/pglite");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

// Real PostgreSQL in WASM, with a minimal Auth-role shim. No network, live Auth,
// Realtime or remote database. Multi-process lock contention needs native PG.
(async () => {
  const db = new PGlite();
  const checks = [];
  const owner = "11111111-1111-4111-8111-111111111111";
  const member = "22222222-2222-4222-8222-222222222222";
  const outsider = "33333333-3333-4333-8333-333333333333";
  const messageId = "44444444-4444-4444-8444-444444444444";
  const user = async (id) => {
    await db.exec("reset role; set role authenticated");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
      id || "",
    ]);
  };
  const query = async (sql, values = []) => (await db.query(sql, values)).rows;
  const fails = async (fn, pattern) => {
    await assert.rejects(fn, pattern);
  };
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth to authenticated,anon;
      grant execute on function auth.uid() to authenticated,anon;`);
    await db.query("insert into auth.users values ($1),($2),($3)", [
      owner,
      member,
      outsider,
    ]);
    const migrations = fs
      .readdirSync(path.join(__dirname, "../supabase/migrations"))
      .filter((f) => f.endsWith(".sql"))
      .sort();
    for (const migration of migrations)
      await db.exec(
        fs.readFileSync(
          path.join(__dirname, "../supabase/migrations", migration),
          "utf8",
        ),
      );
    checks.push("Migration executes on PostgreSQL; six tables have RLS");
    const rls = await query(
      "select count(*)::int n from pg_class where relnamespace='public'::regnamespace and relkind='r' and relrowsecurity",
    );
    assert.equal(rls[0].n, 6);
    await user(owner);
    const payload = {
      name: "Test trip",
      destination: "Tokyo",
      start_date: "2026-10-20",
      end_date: "2026-10-24",
      timezone: "Asia/Tokyo",
      currency: "MYR",
      budget_total: 5000,
    };
    const created = (
      await query("select public.trip_create($1,'Owner') result", [payload])
    )[0].result;
    const id = created.trip.id;
    assert.equal(created.newVersion, 1);
    assert.equal((await query("select * from public.trip_members")).length, 1);
    assert.equal((await query("select * from public.trip_versions")).length, 1);
    await fails(
      () =>
        query("select public.trip_create($1,'Owner')", [
          { ...payload, timezone: "Invalid/Zone" },
        ]),
      /INVALID_TIMEZONE/,
    );
    assert.equal((await query("select * from public.trips")).length, 1);
    checks.push(
      "Atomic create: owner membership/version 1; invalid timezone rolls back",
    );
    await fails(
      () => query("update public.trips set version=100 where id=$1", [id]),
      /permission denied/,
    );
    await fails(
      () =>
        query(
          "insert into public.trip_members(trip_id,user_id,display_name) values($1,$2,'Spoof')",
          [id, outsider],
        ),
      /permission denied/,
    );
    await fails(
      () =>
        query("select public.trip_mutate($1,1,'trip.update',null,$2)", [
          id,
          { created_by: outsider },
        ]),
      /INVALID_FIELDS/,
    );
    checks.push(
      "Direct writes and owner reassignment cannot bypass RPC validation",
    );
    const invite = (
      await query("select public.trip_invite_create($1) result", [id])
    )[0].result;
    assert.match(invite.token, /^[a-f0-9]{64}$/);
    await fails(
      () => query("select token_hash from public.trip_invites"),
      /permission denied/,
    );
    await user(outsider);
    for (const table of [
      "trips",
      "trip_members",
      "trip_activities",
      "chat_messages",
      "trip_versions",
    ])
      assert.equal((await query(`select * from public.${table}`)).length, 0);
    assert.equal((await query("select id from public.trip_invites")).length, 0);
    await fails(
      () => query("select public.trip_invite_create($1)", [id]),
      /TRIP_FORBIDDEN/,
    );
    await fails(
      () =>
        query("select public.trip_chat_send($1,'intrusion',$2)", [
          id,
          messageId,
        ]),
      /TRIP_FORBIDDEN/,
    );
    await fails(
      () =>
        query("select public.trip_mutate($1,1,'trip.update',null,$2)", [
          id,
          { name: "intrusion" },
        ]),
      /TRIP_FORBIDDEN/,
    );
    checks.push("Outsider cannot read any trip data, invite, send or mutate");
    await user(member);
    assert.equal(
      (
        await query("select public.trip_invite_accept($1,'Member') id", [
          invite.token,
        ])
      )[0].id,
      id,
    );
    assert.equal((await query("select * from public.trips")).length, 1);
    assert.equal((await query("select * from public.trip_members")).length, 2);
    await fails(
      () =>
        query("select public.trip_mutate($1,1,'trip.update',null,$2)", [
          id,
          { name: "member edit" },
        ]),
      /TRIP_FORBIDDEN/,
    );
    const message = (
      await query("select public.trip_chat_send($1,'Hello',$2) result", [
        id,
        messageId,
      ])
    )[0].result;
    const retry = (
      await query("select public.trip_chat_send($1,'Hello',$2) result", [
        id,
        messageId,
      ])
    )[0].result;
    assert.equal(message.id, retry.id);
    assert.equal(message.user_id, member);
    assert.equal(message.message_type, "user");
    assert.equal((await query("select * from public.chat_messages")).length, 1);
    await fails(
      () =>
        query("select public.trip_chat_send($1,'Changed payload',$2)", [
          id,
          messageId,
        ]),
      /MESSAGE_ID_REUSED/,
    );
    checks.push(
      "Accepted member can read/send; message retries are idempotent and cannot impersonate AI",
    );
    await user(outsider);
    await fails(
      () =>
        query("select public.trip_invite_accept($1,'Other')", [invite.token]),
      /INVITE_USED/,
    );
    await user(owner);
    const expired = (
      await query("select public.trip_invite_create($1) result", [id])
    )[0].result;
    await db.exec("reset role");
    await db.query(
      "update public.trip_invites set created_at=now()-interval '2 days',expires_at=now()-interval '1 day' where id=$1",
      [expired.id],
    );
    await user(outsider);
    await fails(
      () =>
        query("select public.trip_invite_accept($1,'Other')", [expired.token]),
      /INVITE_EXPIRED/,
    );
    checks.push("Single-use and expired invitations are rejected");
    await user(owner);
    const activity = {
      day_number: 3,
      start_time: "09:00",
      title: "Museum",
      location_name: "Tokyo",
      duration_minutes: 90,
      estimated_cost: 20,
    };
    const added = (
      await query(
        "select public.trip_mutate($1,1,'activity.add',null,$2) result",
        [id, activity],
      )
    )[0].result;
    assert.equal(added.newVersion, 2);
    assert.equal(added.versionEntry.version, 2);
    assert.equal(added.versionEntry.snapshot.activities.length, 1);
    assert.equal(added.versionEntry.snapshot.chat_messages, undefined);
    await fails(
      () =>
        query("select public.trip_mutate($1,1,'activity.add',null,$2)", [
          id,
          activity,
        ]),
      /VERSION_CONFLICT/,
    );
    await fails(
      () =>
        query("select public.trip_mutate($1,2,'activity.add',null,$2)", [
          id,
          { ...activity, day_number: 6 },
        ]),
      /ACTIVITY_OUTSIDE_TRIP/,
    );
    await fails(
      () =>
        query("select public.trip_mutate($1,2,'trip.update',null,$2)", [
          id,
          { end_date: "2026-10-21" },
        ]),
      /ACTIVITY_OUTSIDE_TRIP/,
    );
    assert.equal(
      (await query("select version from public.trips where id=$1", [id]))[0]
        .version,
      2,
    );
    assert.equal((await query("select * from public.trip_versions")).length, 2);
    checks.push(
      "Version increments once; stale edits and invalid day/date edits fail without partial state",
    );
    // Force history failure to prove the preceding entity update is rolled back.
    await db.exec(`reset role;
      create function tripify_private.fail_history_test() returns trigger language plpgsql as $$ begin raise exception 'TEST_HISTORY_FAILURE'; end $$;
      create trigger fail_history before insert on public.trip_versions for each row execute function tripify_private.fail_history_test();`);
    await user(owner);
    await fails(
      () =>
        query("select public.trip_mutate($1,2,'activity.update',$2,$3)", [
          id,
          added.updatedEntity.id,
          { start_time: "10:00" },
        ]),
      /TEST_HISTORY_FAILURE/,
    );
    assert.equal(
      (await query("select start_time from public.trip_activities"))[0]
        .start_time,
      "09:00:00",
    );
    assert.equal(
      (await query("select version from public.trips"))[0].version,
      2,
    );
    await db.exec(
      "reset role; drop trigger fail_history on public.trip_versions; drop function tripify_private.fail_history_test()",
    );
    await user(owner);
    checks.push("History failure rolls back entity and version atomically");
    await fails(
      () =>
        query("select public.trip_mutate($1,2,'trip.update',null,$2)", [
          id,
          { name: payload.name },
        ]),
      /NO_CHANGES/,
    );
    await fails(
      () =>
        query("select public.trip_mutate($1,2,'activity.update',$2,$3)", [
          id,
          added.updatedEntity.id,
          { start_time: "09:00" },
        ]),
      /NO_CHANGES/,
    );
    const competing = await Promise.allSettled([
      query("select public.trip_mutate($1,2,'activity.update',$2,$3)", [
        id,
        added.updatedEntity.id,
        { start_time: "10:00" },
      ]),
      query("select public.trip_mutate($1,2,'activity.update',$2,$3)", [
        id,
        added.updatedEntity.id,
        { start_time: "11:00" },
      ]),
    ]);
    assert.equal(competing.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(competing.filter((r) => r.status === "rejected").length, 1);
    assert.equal(
      (await query("select version from public.trips"))[0].version,
      3,
    );
    checks.push(
      "No-op creates no version; two queued same-version writes accept exactly one (single-connection WASM, not native lock contention)",
    );
    await fails(
      () => query("select public.trip_member_remove($1,$2)", [id, owner]),
      /CREATOR_CANNOT_LEAVE/,
    );
    await query("select public.trip_member_remove($1,$2)", [id, member]);
    await user(member);
    for (const table of [
      "trips",
      "trip_members",
      "trip_activities",
      "chat_messages",
      "trip_versions",
    ])
      assert.equal((await query(`select * from public.${table}`)).length, 0);
    await fails(
      () =>
        query("select public.trip_chat_send($1,'Hello',$2)", [id, messageId]),
      /TRIP_FORBIDDEN/,
    );
    checks.push(
      "Creator cannot remove themselves; removed member immediately loses reads and sends",
    );
    await db.exec("reset role; set role anon");
    await fails(() => query("select * from public.trips"), /permission denied/);
    await fails(
      () => query("select public.trip_create($1,'Anon')", [payload]),
      /permission denied/,
    );
    checks.push("Anonymous role has neither table nor RPC access");
    console.log(
      JSON.stringify(
        {
          checks,
          result: "PASS",
          limitations:
            "No live Supabase Auth/Realtime or native multi-connection concurrency exercised.",
        },
        null,
        2,
      ),
    );
  } finally {
    await db.close();
  }
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
