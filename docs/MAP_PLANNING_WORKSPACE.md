# Map planning implementation

The existing Google Maps/Places wrapper, server route cache, TripWorkspace selection and routing state, creator-only versioned activity RPC and refresh/realtime pipeline are reused. MapPanel composes discovery, TripMarker, GoogleCanvas and AddMapActivity. Routes remain derived; budget remains derived from saved activity costs.

## Checks

- `npx tsc --noEmit` and `npm run build`: pass.
- Targeted ESLint for changed map, routing, Planner and workspace files: pass.
- `node --test scripts/map-planning.test.cjs`: five tests pass (fixed-time feasibility, stable ordering/signatures, opening periods, route API authorization, incremental server cache).
- `node scripts/map-planning-smoke.cjs`: pass with PLAYWRIGHT_MODULE pointing to available Playwright. Real React components, isolated Maps SDK and RPC fixtures. Covers automatic route requests, travel labels/conflicts, bidirectional selection, cycling, independent Transit, search, AI placement, failed-save retention, saved/reload, custom coordinate save and three narrow locales.
- Existing `scripts/shared-workspace-smoke.cjs`: pass across workspace behavior and locale/width matrix, with isolated transport.
- Existing shared unit and i18n tests: pass.
- Full-repository lint currently reports existing set-state-in-effect errors in shared-proposals.tsx and shared-people.tsx.
- Existing database test does not bootstrap the service_role role required by later migrations and fails before its assertions. This work does not alter migrations or permissions.

## Product boundaries

Saved activities currently have fixed times. Choosing a suggested placement explicitly confirms that fixed time; no existing times are moved. The schema has no flexible-window or AI-provenance fields, and no new fields were introduced. Ranked slots are bounded geographic candidates, using real cached route durations and recurring opening hours; they are not a claim of globally best scheduling or holiday availability.

Search is explicit rather than typeahead: typing and dragging cause no requests. Google Places information is fetched live, including attribution link and regular hours where available. Live external Google, Supabase and two-session realtime verification is still needed; test fixture reloads are not evidence of remote persistence.

Static premium audit: the full-project scanner was attempted with a 45-second bound and timed out in the same way recorded by the earlier project audit. No static-audit pass is claimed. Type, lint, unit and browser results above are independent checks.
