# UX Contract

## Product context

- Audience: groups planning travel and comparing preferences, schedule and budget trade-offs.
- Primary job: maintain a shared itinerary; review AI suggestions before a human-approved change.
- Locales: en, zh, ms. User-authored trip names, places and preferences retain their original language.
- Register: concise, calm product copy; no booking or autonomous-agent claims.
- Calendar: Gregorian, inclusive date-only trip range; activity times use the explicit IANA trip timezone, not the UI locale. Native date/time controls may follow the device locale.
- Accessibility target: WCAG 2.2 AA; this implementation has browser checks, not a full conformance certification. Japanese locale is not enabled; Tokyo sample content does not imply a Japan-market launch.

## Business-context sources

| Domain / scope | Authoritative source | Source type | Reviewed date |
|---|---|---|---|
| Permission model | Implementation plan §§12–17; member role/write matrix not yet specified | Product plan; unresolved before backend | 2026-09-11 |
| Data lifecycle | Current user request: build pages first, then minimal schema; `database.sql` | Task scope + staged design | 2026-09-11 |
| Deletion / retention | Not specified; no delete/account-removal UI shipped in this slice | Unresolved, blocks deletion implementation | 2026-09-11 |
| Billing / payment | Implementation plan budget-forecasting scope (§§32–36) | Product plan; no payment/splitting capability | 2026-09-11 |
| Legal / regulatory copy | No new legal claims or consent collection in this slice; legal review not supplied | Unresolved for public launch | 2026-09-11 |
| Market / content | `styleRule.md`, `DESIGN.md`, implementation plan §§24–36, 43–47 | Product/design brief | 2026-09-11 |

Implementation plan refers to `Tripify — MVP Development Plan & Todo List.md` at the repository root. UI consequences are recorded here; these sources remain authoritative for business rules.

## Visual contract

- `DESIGN.md` records visual direction; `styleRule.md` provides detailed target guidance.
- Existing runtime canonical tokens: `src/app/globals.css`, scoped `.trip-app-theme`; no generated token adapter.
- Shared product UI: `src/components/mvp/primitives.tsx` and `mvp.css`.
- Supported App theme: light. Reduced motion and forced-colors fallbacks are provided; dark mode is not promised.
- Token drift gate: inspect raw colors and changed runtime variables; keep marketing tokens unchanged unless specifically migrating a marketing surface.

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Select/Listbox | Native select in CreateTrip | Fixed ISO currency codes | Native; OS-owned popup geometry explicitly accepted | Browser selection + label |
| Date | Native date/time fields through Field | Date-only range + trip timezone | Native; OS-owned calendar/time labels and geometry accepted, no authored popup claim | Browser input + range validation |
| Form | Field / AppButton in primitives.tsx | Shared product controls; auth remains a separate canonical sibling | Create trip / add activity / preferences | Validation and focus E2E |
| Scrollbar | Global stylesheet | Runtime scrollbar tokens | Timeline/chat bounded on tall desktop; document elsewhere | Screenshot + computed style |
| Toast | MvpShell persistent status banner | MvpProvider.notice | Local success / explicit dismiss | Live region and browser |
| CRUD | MvpProvider + MvpView | Local trip state | Create/read/add/preferences only; no delete | Full local workflow E2E |

## Component behavior

- AppButton: semantic button; primary and outline variants; tokenized hover/press; visible focus; disabled visual/cursor. Immediate in-memory actions do not invent loading delays.
- Links: native route semantics; navigation destination uses `aria-current`. Icon-only navigation keeps an accessible localized name even when its visible label is hidden.
- Field: associated label, optional hint, inline error and `aria-invalid`; no browser validation bubbles. Native controls retain keyboard behavior.
- Textarea: no resize, bounded content length, visible labels. Blank messages cannot be added. No Enter-to-send shortcut that could interrupt IME composition.
- Search: local immediate filtering, named clear action, explicit Enter commits `q` to URL. Back/Forward restores committed query; unsubmitted typing is transient.
- Cards/pins: semantic buttons, pressed state, text + numbered route markers; no drag-only action.

## Dataset navigation

- Trip cards render the current small local dataset; no fake pagination/count from a remote system.
- No trips and no matching results have distinct recovery actions.
- Selected day and map activity are transient workspace state; `view` is URL-backed. In-memory drafts cannot be shared by URL.
- Loading is normal Next route navigation; there is no asynchronous data API in this phase. Real data loading/error/retry states must be added with the persistence integration.

## Flow ledger

| Operation | Trigger | Pending | Success destination | Success feedback | Failure recovery | Focus outcome | Source ref |
|---|---|---|---|---|---|---|---|
| Create trip | Validated create form | Synchronous local state | Trip list | Local-only banner | Inline errors, keep draft | First invalid field; route focus on success | User UI-first scope; plan §43 |
| Add activity | Inline form | Synchronous local state | Same day | Activity selected + banner | Preserve fields on validation error | First invalid field | Plan §§44–47 |
| Preferences | Field/radio changes; Save validates budget | In-memory updates | Same view | Local-only banner | Invalid budget shown, last valid stored value retained | Invalid budget focused | Plan §43 |
| Search | Typing / Enter / clear | No network/debounce | Same list | Results or no-results state | Clear query | Search clear retains input focus | UI navigation convention |
| Approve proposal | Demo approval button | Synchronous fixture transition | Same proposal | Approved, not applied | Stale fixture blocks action | Button/native focus | Plan §12; demo rule labeled |
| Apply proposal | Separate Apply action | Synchronous fixture replacement | Same proposal | Applied banner, derived budget updated | Stale activities require demo reset | Same view | Plan §§12–15 |
| Reset sample | Explicit reset action | None | Original example activities | Voting state restored | Never affects real trip data; other preferences preserved | Same action | Fixture-only convention |
| Back/cancel | Back link / Close activity form | None | Trip list / same timeline | Create draft retained within layout; closing activity form discards that unsaved form | Full refresh limitation visibly stated | Native route/button behavior | UI-first scope |

## Navigation and responsive behavior

- `/dashboard` and nested pages require a server-verified Auth user. `/demo` is public and seeded with fictional fixtures only.
- Every supported route has a localized title with Tripify suffix and noindex. Invalid path shapes use Next not-found; a refreshed missing draft uses an app-owned explanation/back link.
- Desktop: sidebar + itinerary/map/AI columns. Tablet: plan/map or chat. Mobile: Plan, Map, Chat, Decisions, Budget bottom links; People through member avatars in trip header.
- Detail forms scroll naturally. Only the tall desktop timeline/chat panels scroll internally. Page bottoms reserve space for fixed mobile navigation and safe area.
- Long authored content wraps; selected activity details are not tooltip-only. UI does not use modals or custom composite popups in this slice.

## Overlays and feedback

- Local-success banner persists until dismissed or replaced; it is not proof of a cloud write.
- Permanent preview banner explains in-memory lifetime and simulated AI/maps.
- No `alert`, `confirm`, `prompt`, destructive mutation, invitation send or clipboard export.
- Refresh, leaving the provider layout, and locale switches may clear drafts. This intentionally limited prototype has no durable recovery; persistent saving and guarded unsaved navigation are release requirements for the backend phase.
- z-index 20 is reserved for mobile view navigation; no competing product overlay is introduced.

## Async and resilience

- Only Supabase Auth is live; its established error/pending/session contract is in `docs/AUTH_SETUP.md`.
- Trip creation, activities, preferences, messages and proposals are React state only, not optimistic remote writes. They cannot fail from network loss or synchronize between users/tabs.
- No fake AI answer is generated after sending a message. Integration notices explain what is not connected.
- The sample proposal checks its original activity snapshot before application. Production requires server-side authorization, versioned transactions and the final voting policy; the fixture is not that engine.
- Create persists its draft across client navigation in the same provider. No secrets or travel data are copied into localStorage.

## Validation

- Required names/place/time, inclusive valid date range, valid IANA timezone, nonnegative finite two-decimal amounts and duration 1–1440 minutes.
- Preview limits trips to 1–60 days to bound UI; this is not a confirmed lifetime product limit.
- Inline errors associate with their fields; submit focuses the first invalid input. Forms retain input after validation failure.
- Server validation, numeric storage bounds, duplicate request protection, authorization and concurrent-update recovery are required before replacing memory with database writes.

## Permission and clipboard

- No real role controls are shown: auth protects the workspace shell, not a yet-unimplemented database API.
- Demo vote buttons describe a simulation, not user authority. No service-role key is sent to the browser.
- RLS/grants/column permissions must be independently reviewed before exposing tables. See `database.sql` launch checklist.

## Migration status

- Slice 1: marketing keeps its existing scenes. Slice 2: shared auth adopted App theme. Slice 3: local MVP workspace adopts that same theme.
- No new UI dependency installed. Existing shadcn/Base UI Button is wrapped rather than replaced; future Select/Dialog components must adopt these tokens and the interaction contract.
- Rollback boundary: new dashboard/demo routes and `components/mvp`; no remote schema to roll back. Preserve prior marketing/auth work.

## Verification

- Commands: `npm run lint`, `npx tsc --noEmit`, `npm run build`, `node scripts/auth-paths.test.cjs`.
- Browser runner: `scripts/mvp-smoke.cjs` with Playwright module environment; headless Windows Edge, 1440×1000 and 390/320×844, en/zh/ms, reduced-motion.
- Covered: local creation validation, empty draft, activity/map selection, approval-before-apply, derived budget, local message, refresh recovery, protected nested route, mobile view switching, no page errors or browser Supabase mutations.
- Screenshots: `test-results/mvp/` (ignored). Real Android/iOS keyboards, screen readers, native-language review, full zoom/contrast audit and live multi-user backend behavior remain unverified.
- Auth regression remains `scripts/auth-smoke.cjs`; provider failures are mocked and tests do not create real accounts or send emails.
- Static skill audit is supplemental source analysis; it is not a substitute for browser behavior or a claim of accessibility certification.
- Full-repository skill audit did not complete: its `iter_html_tags` / `is_regex_literal_start` scanner exceeded a bounded 45-second retry after two longer stalled runs. No static-audit pass is claimed; lint/typecheck/build and browser evidence are independent.

### Reconciled design differences

| Prior direction | Product evidence | Resolution |
|---|---|---|
| 24px information cards | `styleRule.md` distinguishes App from marketing | Product cards use 16px; marketing stays 24px, documented in DESIGN.md |
| Route blue brand action | Existing auth App palette prioritizes small white-text contrast | MVP reuses scoped App action tokens, no marketing recolor |
| Homepage scroll storytelling | Document §24 calls for a working decision interface | Product uses quiet hover/press and a responsive workspace, no pinned scrolling |
