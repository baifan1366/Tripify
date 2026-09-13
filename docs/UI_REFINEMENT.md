# Workspace UI refinement — 2026-09-13

Implemented the latest 17-item request in the existing app. No deployment or database migration was performed.

| Request | Result |
| --- | --- |
| 1–2 | 16px reading inset for widget titles; resize handles only appear/interact in Edit layout. |
| 3, 13 | Explicit light/dark primary and outline hover colors; shared hover, focus and press transitions; animated popovers; reduced-motion support. |
| 4 | Journey actions sit in a right column, stacking within that column at narrow sizes. Compact density no longer removes the itinerary/actions. |
| 5–6 | Shared Codex-inspired composer for AI/chat, autogrow, IME-safe Enter, Shift+Enter, integrated send/stop. Real AI SSE tokens render GFM Markdown including tables and lists. |
| 7–8 | Removed global Shared trip badge from dashboard/create. Join is a proper button with a portaled form, validation and failure feedback. |
| 9–12 | Optional travel style saved to the creator’s per-trip interests; native timezone dropdown; removed form footer hints/link; wide-screen animated SVG guide. |
| 14 | Visible Google Places search label and shared input border/focus treatment. |
| 15 | Share opens a local video exporter, with progress, cancellation, playback preview and download. |
| 16 | Removed the Supabase realtime note from AccountMenu; moved persistent theme controls there. |
| 17 | People invitation code appears next to its trigger in a compact portal, outside the widget’s clipping boundary. |

## Video library decision

Use Mediabunny 1.56.2, imported only when exporting. Its CanvasSource can encode frames directly, fitting a data-driven trip film without another rendering service. AVC produces MP4; VP9/WebM is the supported-browser fallback. All days/activities are included, including empty days and multiple pages for a busy day. The current film is 960×540 at 24 fps, four seconds per scene, without audio. Duration is shown before export; longer trips produce longer videos. The fixed export palette is intentionally independent of the viewer’s App theme.

Remotion also supports browser rendering and remains useful for more elaborate React-based compositions. For this itinerary-card film, direct Canvas encoding keeps the integration smaller. Sources: [Mediabunny writing media](https://mediabunny.dev/guide/writing-media-files), [Canvas media sources](https://mediabunny.dev/guide/media-sources), [Remotion](https://www.remotion.dev/).

## Verification

- Production `npm run build`: passed.
- ESLint for all changed/new JS/TS files: passed.
- Existing map/shared/localization unit suite: 12 passed. Film pagination/lossless itinerary test is in `scripts/trip-video.test.cjs`.
- `scripts/shared-workspace-smoke.cjs`: passed, including real browser video encoding, cancel/restart, media playback and file download, streamed Markdown, title/resize gating, right-column Journey actions, invite/remove, chat retry/IME and three locales at four widths.
- `scripts/ui-polish-smoke.cjs`: passed for join validation, travel-style persistence, retry after preferences fail without duplicate creation, timezone dropdown, light/dark hover contrast and three locales at desktop/mobile widths.
- `scripts/map-planning-smoke.cjs`: passed; existing map search, route planning and activity placement remain covered.
- Browser fixtures replace Supabase/Google/AI transport only. Video encoding and UI components run for real in headless Edge. This is not live-service acceptance testing. Screenshots use app tokens/component CSS and a fixture reset.
- Full repository lint still reports two pre-existing `react-hooks/set-state-in-effect` errors and one cleanup warning in `shared-proposals.tsx`. The strict premium static audit timed out after 45 seconds; `test-results/ui-premium-audit.json` records that outcome without claiming a pass.

Screenshots and a sample fixture-trip video are in `test-results/polish/` and `test-results/shared/`.
