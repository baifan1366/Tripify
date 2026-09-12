# Map-first workspace — Stage A audit and implementation plan

Status: Stage A complete; the user's “continue” approved the two contract reconciliations below. Stage B shell implementation is complete and verified. Stages C–J remain unimplemented; the current map is still the existing schematic.

## Evidence inspected

Read AGENTS.md, CLAUDE.md (delegates to AGENTS.md), styleRule.md, DESIGN.md, UX-CONTRACT.md, README.md, the complete MVP development plan, package.json, components.json and globals.css. Inspected the current MVP shell/provider/pages/views/primitives, workspace and panels, model, CSS, message namespaces and next-intl routing. Existing auth changes belong to the preceding environment-redirect task and must be preserved.

The stack is Next 16.3.4, React 19.2.8, next-intl 4, Base UI/shadcn base-nova and GSAP 3.15.0. There is only one generated shared UI primitive, Button; reusable Menu/Popover/Dialog/Tooltip wrappers still need to be established using Base UI. README describes an older foundation and is not evidence that trip persistence or a proposal transaction currently exists.

## Approved contract decisions

1. UX-CONTRACT.md, Overlays and feedback, explicitly requires a permanent preview banner. The new brief removes dominant descriptions. Proposal: replace it with a compact, persistently visible **in-memory preview** badge on every prototype workspace (including authenticated production builds), opening details in a menu/dialog. Do not hide the fact that edits are lost on refresh behind a development-only flag.
2. DESIGN.md, MVP workspace adoption, limits App motion to hover/press. The new brief requests coordinated route/day/apply motion. Proposal: update this adopted-scope statement to permit data-driven GSAP transitions under styleRule.md §7, while retaining no ScrollTrigger pinning, no animation-driven business state, immediate readable state and reduced-motion support.

The requested 25/45/30-to-map-canvas change is not itself a styleRule conflict: §3.2 calls those proportions a target, not an immutable layout. The brand palette and typography do not need replacing.

## Component disposition

| Treatment | Existing responsibility | Planned outcome |
|---|---|---|
| Reuse | MvpProvider, MvpPage route/auth checks, create form validation | Preserve public demo vs authenticated empty workspace and local domain behavior |
| Reuse | AppButton, Field, EmptyState, BudgetPanel, PeoplePanel | Keep semantics and validation; move only when ownership becomes clearer |
| Extract | Timeline, day controls, activity form and cards | JourneyDock, DaySwitcher, DayTimeline, ActivityCard; selected item expands instead of equal boxed cards |
| Extract | Current RouteMap SVG and x/y | Explicit schematic fallback, separate from geographical coordinates |
| Extract | ChatPanel object types | DecisionDock with separate user, research, recommendation, proposal and vote objects |
| Extract | ProposalPanel validation/actions | Shared demo decision actions used by contextual compare, preserving stale checks |
| Replace | Wide workspace sidebar, six desktop tabs, boxed map panel | Compact rail, TripSwitcher, map canvas and contextual docks |
| Replace incrementally | Shell/workspace selectors inside mvp.css | Domain styles for shell, journey, map, decision and compare; common controls/tokens remain shared |

## State that must remain intact

- MvpProvider keeps trips, create draft, messages, proposal and notice; it does not become a Supabase persistence layer.
- Preserve voting → approved → applied and rejected, explicit Apply, stale-activity guard, reset scope and read-only non-demo proposal behavior.
- Preserve date/timezone and estimate calculations, existing add-activity validation, preferences and raw user text.
- Keep authentication, environment-based callback domains, next-intl as-needed routing and Supabase schema unchanged in this redesign.
- Add a separate per-trip WorkspaceUI context/reducer for day, selected/hovered activity, selected segment, lens, compare, risk, dock visibility, replay visibility and composer drafts. Mobile views currently unmount ChatPanel when entering Decisions/Budget; its local message draft can therefore be lost. Moving that draft into the workspace boundary fixes this without changing sent-message semantics.
- Existing proposal is a single global demo state, not a real multi-proposal store. Do not turn fictional counters or the brief's sample “requests change” vote into real member decisions.

## Safe implementation stages

1. **B / Shell:** reconcile approved contract changes; establish Base UI menus/tooltips; compact rail, TripSwitcher and account locale menu. Preserve existing URLs and query destinations.
2. **C / Workspace:** extract orchestrator and UI context; JourneyDock, schematic map stage and typed DecisionDock; retain Budget/People and all forms. Add draft/selection regression tests before replacing layout.
3. **D / Maps:** add the map dependency; optional latitude/longitude/placeId alongside x/y; normalized adapters; client-only Google map, vector map ID, custom markers, accessible selection and map/list synchronization. Missing key, provider errors or missing coordinates retain the itinerary and fallback.
4. **E / Routes:** normalize geometry separately from Activity. Never present a straight connector as a real travel route or fabricate duration/distance. Add camera fitting with dock padding; coordinate GSAP/Flip route/day changes with cancellation and reduced motion.
5. **F / Risk:** Route/Risk lenses are UI state, not navigation. Fixture risks stay labeled. Alerts focus related activities and decision context; they never mutate the itinerary.
6. **G / Compare:** compare inside workspace; derive old/proposed activities without changing current itinerary. Diff text and map legend distinguish removed/added/changed. Apply uses existing validation, then animates the confirmed local state. Preserve approved-but-not-applied on failure/stale input.
7. **H / Verification:** desktop/tablet/mobile, keyboard, long en/zh/ms copy, reduced motion, all proposal states, empty trips/days, no coordinates/key and provider failure. Check draft survival across all five mobile views.
8. **I / Replay:** only after H passes, add a matching Remotion/Player pair. Normalize an immutable replay payload and deterministic map rendering. Missing research/vote/history data remains absent or explicitly illustrative; replay must not claim an unapplied proposal was applied.
9. **J / Export:** evaluate and document the rendering/export path at this stage. Reuse the exact replay payload/composition; do not capture Google Maps DOM. No automatic upload, public share, new Supabase table or paid rendering service without a separately established requirement/configuration.

Each stage runs lint, tsc --noEmit and build, plus its relevant browser/state tests. Delete obsolete styles/components only after their migrated consumers pass. Avoid a broad globals.css or homepage rewrite.

## Dependencies and configuration

- Stage A installs nothing. No Framer Motion, global-state library or second primitive framework.
- Registry inspection: @vis.gl/react-google-maps **1.10.0** declares React/React DOM 19 support; fits this React 19.2.8 repository at the peer-dependency level. Install a pinned version at Stage D and verify its actual client integration.
- Registry inspection: remotion and @remotion/player **4.0.523** have matching versions and React/React DOM >=16.8 peer requirements. Recheck and add together only at Stage I. Peer compatibility is not a completed runtime test.
- Planned browser configuration: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY and NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID. No key is hardcoded; document referrer/API restrictions and production/development origins. AdvancedMarker requires a configured map ID. Any future server Routes API key must remain server-only.
- Route service availability and map credentials are not assumed; keyless fallback is an explicit supported state.

Sources: [vis.gl AdvancedMarker](https://visgl.github.io/react-google-maps/docs/api-reference/components/advanced-marker), [Remotion Player](https://www.remotion.dev/docs/player/), npm registry peer-dependency inspection. No live map request or video rendering was performed in Stage A.

## Baseline and boundaries

- The immediately preceding auth change passed lint, TypeScript, build and the en/zh/ms auth browser regression. Production HTTP checks verified canonical 307 redirects without following them or sending credentials.
- These results are baseline evidence, not evidence that the proposed map workspace exists.
- Stage A added only this plan. Stage B now changes the shell and its design/UX adoption records; schema, domain state and existing auth edits remain untouched.
- Next recommended implementation stage: C (workspace UI boundary, Journey Dock and Decision Dock), then D; not Replay first.

## Stage B delivery and evidence

Created `src/components/app-shell/{app-rail,account-menu,preview-badge,trip-header,trip-switcher}.tsx`, `app-shell.css`, shared `src/components/ui/{app-popover,app-tooltip}.tsx`, `app-overlays.css`, and `scripts/app-shell-smoke.cjs`.

Modified MvpShell to compose the compact rail and preview disclosure, TripWorkspace to consume TripHeader, en/zh/ms MVP messages, globals.css (four scoped motion/layer tokens), DESIGN.md and UX-CONTRACT.md. Shell layout styles are separate; remaining legacy mvp.css selectors will be retired with the workspace extraction, not mixed into an unrelated full stylesheet rewrite.

Intentionally unchanged: MvpProvider, model/domain helpers, workspace panel actions and validations, all auth/server/permission code, next-intl routing, homepage, database.sql, package.json and lockfile. Prior auth-origin changes in the working tree belong to the preceding task. No dependencies added and no Supabase operations performed.

Verification:

- `npm run lint`, `npx tsc --noEmit`, `npm run build`: pass.
- `node scripts/mvp-model.test.cjs`: 3 tests pass, including unchanged three-table non-executable SQL design.
- `scripts/mvp-smoke.cjs`: existing three-locale create/activity/budget/chat/preferences, stale/reset and approve-versus-apply checks pass; 320/390px five-view checks pass; no browser errors or Supabase mutations.
- `scripts/app-shell-smoke.cjs`: en/zh/ms × 320/390/768/1440px pass. Open disclosure bounds, active trip, keyboard Enter/Escape, trigger focus restoration, preserved locale query, preview details and reduced-motion checks pass.
- Browser screenshots: `test-results/app-shell/desktop.png`, `switcher.png`, `mobile-account.png`. Reviewed the layout and corrected an unintended title wrap.
- DESIGN lint: 0 errors, 7 existing documentation warnings (orphaned palette tokens / missing primary frontmatter alias). Runtime tokens remain canonical; no generator was introduced.
- Premium strict static auditor: bounded run exits after 45 seconds in its source parser; no successful static-audit claim. Targeted changed-source anti-pattern checks found no native dialogs, non-semantic click targets, transition-all, or hardcoded colors. Browser and repository gates above are independent evidence.

Remaining limitations: in-memory lifetime/reset behavior remains; no real Google map, contextual compare, new GSAP route transition or Replay/export has been added in Stage B. This is the first safe migration slice, not completion of the map-first workspace.
