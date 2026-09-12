# Shared MVP implementation

Updated 2026-09-12. This is an implementation/configuration record, not a claim of production readiness.

## Scope and boundaries

Authenticated workspace: shared trip reads/creation, creator-only activity and trip edits, member invitations/removal, group chat, Google Places/Map, server Routes/Time Zone, atomic version history. `/demo` and its proposal/voting behavior remain memory-only. No payment, booking, splitting, agent writes, remote migration, service-role client, organization model, or global state library was added.

The migration is LOCAL ONLY. Applying it is a separate, explicitly authorized deployment step. Existing remote tables were not overwritten or inspected in this implementation.

## New files

- `supabase/migrations/20260911123531_shared_trip_core.sql`: six tables, indexes, grants/RLS, private implementations/public RPCs, publication additions.
- `src/lib/trips/repository.ts`: authorized browser-client reads and RPC adapter; domain mapping, typed conflict classification.
- `src/lib/trips/history.ts`: readable snapshot differences.
- `src/lib/maps/google-map-provider.tsx`, `places.ts`, `types.ts`, `adapters.ts`: browser Maps/Places abstraction and canonical coordinates.
- `src/lib/maps/routes.ts`, `timezone.ts`, `server-cache.ts`: server-only Google clients, bounded cache/quota guard.
- `src/lib/maps/use-routes.ts`: explicit route requests with cancellation and version/day scoping.
- `src/app/api/maps/routes/route.ts`, `timezone/route.ts`: authenticated handlers deriving coordinates from authorized database rows.
- `src/components/trip/people/shared-people.tsx`: current members, one-use invite code, accept form, confirmed removal.
- `src/components/trip/chat/shared-chat.tsx`: persistent messages, optimistic pending/retry, Realtime cleanup and reconciliation.
- `src/components/trip/map/google-canvas.tsx`, `places-field.tsx`: real map and Google Place selection with fallback.
- `src/components/trip/history/history-panel.tsx`, `trip-settings.tsx`: History dock content, differences and versioned settings.
- `src/messages/shared/{en,zh,ms}.json`: new localized UI.
- `scripts/shared-trip-db.test.cjs`, `shared-units.test.cjs`, `shared-workspace-smoke.cjs`, `scripts/fixtures/shared-*`: SQL/unit/isolated UI checks; fixtures are never imported by the app.

## Existing integration files modified

`mvp-provider.tsx`, `mvp-view.tsx`, `mvp-shell.tsx`, `mvp.css`, dashboard layout, model, i18n request loader; trip header, workspace orchestrator/dock/CSS, Journey, map panel/schematic fallback, panel IDs and dock catalogs; package manifests, .gitignore, database.sql, DESIGN.md, UX-CONTRACT.md, existing smoke/model tests. Earlier auth/marketing/workspace changes already in the dirty worktree were retained.

Dependencies: `@vis.gl/react-google-maps@1.10.0` runtime; `@electric-sql/pglite@0.5.8` and `esbuild@0.28.2` development tests only. Existing React/Base UI/next-intl/Supabase stack retained.

## Data and RLS

Tables: trips, trip_members, trip_activities, chat_messages, trip_versions, trip_invites. See `database.sql` for all columns and invariants; it remains an entirely commented, non-executable index.

- All six tables enable RLS and revoke direct browser writes.
- Authenticated creator/member may select trip, members, activities, messages and history. Outsiders get no rows.
- Creator alone sees invite metadata; token_hash has no authenticated SELECT grant.
- Creator alone mutates trip/activities, invites, removes another member. Self-removal is forbidden.
- Members may send chat but not change itinerary. RPC forces sender=auth.uid() and message_type=user.
- Public RPC wrappers are SECURITY INVOKER. Private SECURITY DEFINER implementations are justified to prevent recursive membership policies and bypassing version transactions; explicit caller checks, empty search_path, field allowlists and execute grants apply. Keep `tripify_private` OUT of exposed schemas.
- Single-use invite: random code returned once, SHA-256 stored, 72-hour expiry, atomic consumption. Share privately; no raw code stored in localStorage/database.
- Version mutation takes expectedVersion, locks trip, validates permission/version, changes entity, increments version, inserts snapshot in one transaction. Failure rolls back everything. No-op creates no history. Chat/membership changes do not increment itinerary version.

## Supabase setup (manual)

1. Choose an authorized development Supabase project. Inspect existing schemas and migration history before applying; this migration deliberately does not overwrite same-name tables.
2. Back up any existing project. Review migration and permissions. Apply through the Supabase CLI only after approval; migration was generated with CLI 2.117.0.
3. Expose `public` for Data API; do not expose `tripify_private`. Verify grants independently of RLS.
4. Ensure `supabase_realtime` includes trips, trip_members, trip_activities, chat_messages (migration adds them when publication exists). No objects inside `realtime` schema are altered.
5. Run Supabase security/performance advisors in the test project, then two authenticated browser sessions for invites, live messages, removal and competing edits.
6. Existing Auth callback/Google OAuth setup remains in `docs/AUTH_SETUP.md`. This feature requires no service-role key.

## Google Cloud and environment

Existing variables used (no new secret name required):

| Variable | Scope | Configuration |
|---|---|---|
| NEXT_PUBLIC_SUPABASE_URL | Browser + SSR | Project URL |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Browser + SSR | Publishable key, RLS enforced |
| NEXT_PUBLIC_GOOGLE_MAPS_API_KEY | Browser | HTTP-referrer restricted; Maps JavaScript API + Places API (New) only |
| NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID | Browser | JavaScript vector Map ID |
| GOOGLE_MAPS_SERVER_API_KEY | Server only | Routes API + Time Zone API; restrict by API and supported server identity/network policy |

Enable billing and the four Google APIs. Add localhost and the production `tripify-agent.vercel.app` referrers to the browser key. Never make the server key NEXT_PUBLIC. Set Google quotas/budget alerts; the in-memory rate guard is not a distributed quota system. Public env values are compiled at build time and require rebuilding after configuration changes.

APIs: Maps JavaScript (vis.gl map/advanced markers), Places New autocomplete/details, Routes `directions/v2:computeRoutes`, Time Zone JSON; Supabase Auth getUser, PostgREST SELECT/RPC, Realtime Postgres changes.

Routes are requested explicitly (walking/driving/transit), limited to 60 activities/day/request, processed four segments at a time with 8-second upstream timeouts. Successful route results cache five minutes per instance, timezone one day, cache max 256 entries. These are present-time estimates, not trip-date schedules; missing segments stay "not calculated". No route table or straight-line fake travel metrics.

## Tests and current evidence

- `npm run lint`, `npx tsc --noEmit`: executed repeatedly after stages; latest final result recorded below when complete.
- `npm run build`: production build executed successfully after History/activity editing integration; final re-run required after final polish.
- `node scripts/shared-trip-db.test.cjs`: PASS, 11 assertion groups on PostgreSQL WASM/PGlite with Auth-role shim. RLS isolation, invite acceptance/reuse/expiry, removal, chat duplicate identity, no-op, stale version, injected-history-failure rollback. Two queued writes accept exactly one; this does NOT exercise native multi-connection lock contention.
- `node scripts/shared-units.test.cjs`: PASS, 5 tests for layout isolation/clamps, coordinates/polyline decoder, readable history, Routes auth guard, locale key parity.
- `node scripts/mvp-model.test.cjs`: PASS, 3 tests including demo purity and non-executable database index.
- `node scripts/auth-origin.test.cjs`: PASS, 3 origin cases. `auth-paths.test.cjs`: PASS, 3 destination-allowlist tests.
- `scripts/mvp-smoke.cjs`: PASS, actual local Next.js/Edge browser: en/zh/ms, demo create/activity/chat/proposal rules, marker selection, 390/320 responsive and nested auth redirect.
- `scripts/app-shell-smoke.cjs`: PASS after fixing 320px member/budget overflow: three locales × four widths, disclosure/focus, locale URLs, reduced motion.
- `scripts/shared-workspace-smoke.cjs`: isolated real React components with fake transport. Status is still under verification; do not treat it as a live Supabase or Google integration test.

Browser command: set PLAYWRIGHT_MODULE to the available Playwright package, then run the script. The fixtures bundle in memory and serve only on loopback; they do not add production routes or bypass Auth. Screenshots live in ignored test-results.

## Remaining verification / limitations

- No remote migration, Supabase advisors, real two-user Realtime/Auth/PostgREST test, native PostgreSQL simultaneous connections or live Google billing/key/Places/Routes smoke test executed. These require configured/authorized external environments; fixture tests do not prove them.
- Shared preference editing, trip deletion/account deletion, invite revocation, durable offline drafts, restore/revert and AI proposal persistence are intentionally not implemented.
- Unsent drafts survive panel manipulation, not browser refresh or leaving the trip. Layout state is device-local; selected panel is URL-backed.
- Removed users lose server access immediately; visible data reconciles on focus/within 15 seconds. Already-seen content cannot be remotely erased from a device.
- Cache/rate limit are per server instance; configure Cloud quotas for production. API failures never remove activities. Upstream response quality and accessibility inside Google's own widget require live checks.
- Membership preference visibility and deletion/retention policy should be reviewed before public launch. Current trip range is 1–60 days, monetary bound numeric(12,2), activity duration 1–1440 minutes.
- Full frontend skill static audit previously timed out in its parser; no audit pass or WCAG certification claimed.

## Official references used

- [Supabase Postgres changes](https://supabase.com/docs/guides/realtime/postgres-changes)
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [vis.gl APIProvider](https://visgl.github.io/react-google-maps/docs/api-reference/components/api-provider)
- [Places New autocomplete](https://developers.google.com/maps/documentation/javascript/place-autocomplete-new)
- [Routes API](https://developers.google.com/maps/documentation/routes/compute_route_directions)
- [Time Zone API](https://developers.google.com/maps/documentation/timezone/requests-timezone)
