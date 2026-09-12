---
version: alpha
name: "Tripify"
description: "A route-led brand and product system for collaborative, AI-assisted group travel decisions."
colors:
  ink: "#07182C"
  route: "#2E7CF6"
  sky: "#B8DEFF"
  cloud: "#F6F8FC"
  slate: "#68778A"
  success: "#197A57"
typography:
  display:
    fontFamily: "Arial, 'Noto Sans SC', sans-serif"
  body:
    fontFamily: "Arial, 'Noto Sans SC', sans-serif"
  mono:
    fontFamily: "'SFMono-Regular', Consolas, monospace"
rounded:
  DEFAULT: "0.625rem"
  card: "1.5rem"
  pill: "999px"
spacing:
  page-max: "78rem"
  section-gap: "7rem"
components:
  button: {}
  card: {}
  route: {}
---

# Tripify Design System

## Overview

### Creative North Star

Tripify should feel like a well-made travel field map with a calm operations layer: routes, decisions, evidence, and people are all legible at a glance. The public route is a brand surface; the signed-in workspace is compact and decision-focused.

### Product context and register

- **Audience and primary job:** Groups coordinating a shared trip, who need to compare trade-offs and agree on changes.
- **Locale(s) and language policy:** English, Simplified Chinese, and Malay UI. User-generated trip content remains in its original language.
- **Register:** Hybrid. The landing page earns attention through a scrolling route narrative; product surfaces favour dense, quiet clarity.
- **Memorable signature:** A scattered travel desk gathers four people's wishes, crosses a continuous horizontal route, and ends in an explicit visitor vote. A closing route reforms the Tripify `T`.
- **Restraint:** Maps, timelines, votes, budget, and evidence remain flat and highly legible. Motion never obscures a choice or number.
- **Anti-references:** Generic booking sites, stock-photo tourism, and chat-only AI experiences. Tripify does not sell tickets or pretend the AI has unilateral control.
- **Token ownership/runtime mapping:** Existing `src/app/globals.css` is canonical. This file mirrors its accepted direction; the landing additions use the semantic `--trip-*` variables defined there.

## Colors

`ink` is the anchored travel-night surface; `route` marks direction, primary action, and AI-generated insights; `sky` is atmosphere, not a second action color; `cloud` provides quiet page space. Green denotes an applied or approved decision only.

## Typography

The display voice is a tightly tracked, bold sans for short, decisive statements. Body copy is relaxed and readable. Planning numbers use the mono stack. `Noto Sans SC` is the first non-Latin fallback so Chinese content maintains a consistent, generous line box.

## Layout

Marketing sections centre on a 78rem maximum canvas, then collapse into a single narrative column below 760px. Large sticky demonstrations are desktop enhancements; mobile shows the same states as sequential cards. Content never relies on hover or scroll to expose essential meaning.

## Elevation & Depth

Use fine blue-grey borders and tonal contrast by default. The hero's floating application window may use a diffuse shadow; ordinary cards remain nearly flat.

## Shapes

Controls use the shared 0.625rem radius. Information cards use 1.5rem. Route markers and status chips are fully rounded. No random pill-shaped containers.

## Components

### MVP workspace adoption (2026-09-11)

The `/dashboard` now opens an authenticated, initially empty trip workspace; account details moved to `/dashboard/account`. `/demo` is a separate public fixture, never a bypass to user data. Both explicitly label this phase as an in-memory UI preview: refresh or switching locale can reset drafts, and no trip data is written to Supabase. `UX-CONTRACT.md` owns the cross-screen interaction contract; `database.sql` records a three-table design only, not an applied migration.

`src/components/mvp/` owns the shared shell, AppButton adapter over the existing shadcn/Base UI Button, associated fields, and trip views. It adopts the existing App theme with 16px product cards, 10px controls, 44px actions, and 16/20/24/32px layout spacing. Marketing's 24px cards remain intentional. The default desktop workspace follows the plan's itinerary/map/AI hierarchy; tablet reduces columns and mobile uses five bottom destinations with People available in the trip header. Detail forms use document scrolling, not the timeline's bounded panel scrolling.

Interaction motion is limited to short hover/press transitions. No homepage ScrollTrigger pinning enters the workspace. The map is explicitly schematic; sample alerts, forecasts and proposals are fixtures. Approve and Apply are separate transitions, stale sample activities block application, and a new trip has no invented activities, votes or forecast. All three UI locales share these behaviors. Global scrollbar colors now use named runtime tokens with a forced-colors fallback. The development badge is disabled because it overlapped mobile navigation; runtime errors still surface.

### Authentication adoption (2026-09-10)

`styleRule.md` is the detailed target contract. The authentication pages now adopt its light App palette through `.trip-app-theme` in `src/app/globals.css`: action blue `#1765D8`, hover `#1256BE`, active `#10499D`, secondary text `#526780`, input boundary `#8295AD`, 10px controls and 48px touch-friendly form actions. Marketing route blue is unchanged; the brighter brand blue is not used behind small white action text. The shared font alias now points to a concrete `--trip-font-sans` stack. Other legacy shadcn tokens remain outside this scoped migration, and global dark-mode support is not claimed.

`src/components/auth/` owns the shared form, field states, shell and server-action feedback for sign-in, sign-up, recovery and email confirmation. The split composition pairs a quiet form with a navy route diagram; mobile hides the nonessential illustration. CSS entrance motion is non-blocking and reduced-motion-safe. No scrolling pin is used inside authentication. See `docs/AUTH_SETUP.md` for the provider/callback contract; identity is verified server-side, email links require an explicit POST confirmation, and the initial Dashboard is an honest account entry point rather than simulated trip data.

### Foundational visual states

Controls retain visible focus outlines, clear pressed states, and no layout shift while busy. Scroll storytelling respects `prefers-reduced-motion`; its content remains fully visible without animation.

### Buttons and actions

Route blue is reserved for creating a trip and approving a proposal. Sign in is a quiet secondary action. A locked creation CTA explains by label that registration is required.

### Iconography

Use Lucide's rounded 1.75px outline icons. Product concepts always pair an icon with text rather than relying on a symbolic aircraft or pin alone.

### Motion

Motion follows a route: draw, connect, compare, confirm. Scroll-triggered scenes use easing and pinned sections only for supporting interpretation; reduced-motion displays each state without pinning.

The expanded homepage uses MotionPath and DrawSVG to trace shared preferences, and Flip to compare an original itinerary with a proposed compromise. The dark proposal section marks a deliberate shift from understanding the group to making a decision. Budget forecasts and research evidence return to quiet, readable surfaces. All sample numbers are illustrative, and previewing a proposal is explicitly distinct from approving a real trip change. English, Chinese, and Malay carry the same interactions and reduced-motion fallback.

The narrative homepage is implemented in `journey-landing.tsx` and `journey.css`; its blue and ink variables reference canonical `--trip-route` and `--trip-ink`. Desktop has two bounded pinned scenes (gathering and horizontal atlas); narrow/short screens use natural scrolling and native horizontal overflow, and reduced-motion displays all chapters sequentially. The vote is local simulation only: reject preserves the original order, modify prepares an alternative, approve applies it, reset restores the initial demo. Photographs carry source/license attribution and are optimized through Next Image. This intentionally evolves the former image-free direction: factual Tokyo photography supplies travel atmosphere, never proof of a depicted recommendation.

## Do's and Don'ts

- **Do:** Show concrete group preferences, proposal impacts, votes, and backup plans.
- **Do:** Make “AI proposes. Humans decide.” visible in every major story.
- **Don't:** Treat AI as a silent itinerary editor.
- **Don't:** Substitute travel imagery for evidence or present a city photograph as the actual recommended attraction.
