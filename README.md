<div align="center">

<img src="docs/diagrams/tripify-title.gif" width="640" alt="The Tripify decision loop — discuss, research, recommend, propose, vote, replan — every pass writes back to one shared versioned trip state">

**by Studify** — Tan Sim Po · She Jia Xuan · Chong Wei Xuan

<p>
  <a href="#"><img src="https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=nextdotjs" alt="Next.js"></a>
  <a href="#"><img src="https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript"></a>
  <a href="#"><img src="https://img.shields.io/badge/Supabase-Postgres+Auth+Realtime-3FCF8E?style=flat-square&logo=supabase&logoColor=white" alt="Supabase"></a>
  <a href="#"><img src="https://img.shields.io/badge/AI-OpenRouter+LangGraph-8B5CF6?style=flat-square&logo=openai&logoColor=white" alt="OpenRouter + LangGraph"></a>
  <a href="#"><img src="https://img.shields.io/badge/Maps-Google_Places+Routes-4285F4?style=flat-square&logo=googlemaps&logoColor=white" alt="Google Maps"></a>
  <a href="#"><img src="https://img.shields.io/badge/i18n-EN%20·%20中文%20·%20BM-6E6479?style=flat-square" alt="i18n"></a>
</p>

<p>
  <a href="#-video--slides">🎬 Video</a>&nbsp;&nbsp;·&nbsp;&nbsp;
  <a href="#-prototype">🎨 Prototype</a>&nbsp;&nbsp;·&nbsp;&nbsp;
  <a href="#table-of-contents">📚 Contents</a>
</p>

</div>

---

## Table of Contents

1. [Overview](#-1-project-overview)
2. [Ideation & Process](#-2-ideation--process)
3. [Design & Prototype](#-3-design--prototype)
4. [Differentiation & Impact](#-4-differentiation--impact)
5. [Technical Architecture](#-5-technical-architecture--feasibility)
6. [Team](#-team)

---

## 🧭 1. Project Overview

### The Problem

Planning group trips is inherently a **group decision-making problem**, not just a search problem. Groups often coordinate across chat, maps, notes, booking platforms, and spreadsheets while trying to reconcile different budgets, interests, walking tolerances, schedules, and priorities.

The result is usually not a lack of travel information. The harder problem is turning scattered information and conflicting preferences into **one plan the group understands, agrees on, and can safely change later**.

### Target Group Alignment

Tripify is designed specifically for **people planning a shared leisure trip together**.

| Target User | Core Need | How Tripify Addresses It |
|:------------|:----------|:-------------------------|
| **Primary — Group Trip Organisers** | Coordinate research, preferences, schedules, and decisions without manually reconciling every message | Shared trip state, AI-assisted research, structured proposals, versioned changes, and a single decision workspace |
| **Secondary — Co-travellers / Group Members** | Make sure their budget, interests, dislikes, walking tolerance, and priorities are represented fairly | Individual preference profiles, group-fit analysis, visible trade-offs, and explicit voting |

**High-value situations** include trips where preferences conflict, the itinerary changes repeatedly, or external conditions make an agreed plan invalid.

The core user need is therefore not simply *“help me find places to visit”*, but:

> **“Help us reach a good decision together — and change only what needs to change when the plan breaks.”**

### Competitive Landscape

Modern products already solve meaningful parts of collaborative trip planning. **Mindtrip** publicly documents AI-generated/customisable itineraries, interactive maps, real-time collaboration, group chat, comments/likes, and AI suggestions for a group. **Wanderlog** documents collaborative trip editing, an AI Assistant, map-based itineraries, route optimisation, budgeting, reservations, and live flight status.

Tripify therefore does **not** position basic collaboration or AI itinerary generation as its novelty. Its differentiation is the **decision layer** placed on top of a shared itinerary.

<img src="docs/diagrams/competitor-radar.png" width="620" alt="Radar chart comparing Tripify, Google Travel, ChatGPT and TripIt across five capabilities">

| Capability | Mindtrip | Wanderlog | ChatGPT | **Tripify** |
|:-----------|:---------|:----------|:--------|:------------|
| AI planning / recommendations | ✅ Documented | ✅ Documented | ✅ | ✅ |
| Shared group planning | ✅ Real-time collaboration + group chat | ✅ Real-time collaboration | Limited — no native shared trip state | ✅ |
| Interactive itinerary + map | ✅ | ✅ | Limited | ✅ |
| Preference-aware group suggestions | ✅ Group-oriented suggestions documented | AI-assisted planning; collaboration documented | Prompt-dependent | ✅ Group-fit + trade-off analysis |
| Structured proposal with before/after diff | *Not documented as a core workflow* | *Not documented as a core workflow* | ❌ | ✅ |
| Explicit group voting with reasons | *Not documented as a core workflow* | *Not documented as a core workflow* | ❌ | ✅ |
| Versioned AI changes / stale-change protection | *Not documented as a core workflow* | *Not documented as a core workflow* | ❌ | ✅ |
| Planner output reviewed by a critic step | *Not publicly documented* | *Not publicly documented* | ❌ | ✅ Current agent design |
| Partial regeneration that preserves accepted trip state | *Not publicly documented* | *Not publicly documented* | Prompt-dependent | 🧪 Current prototype direction |
| Activity-level conditional fallbacks | *Not publicly documented* | *Not publicly documented* | Prompt-dependent | 🧪 Current prototype direction |

<sub>Comparison reflects publicly documented product capabilities reviewed on 13 Sep 2026. “Not documented” means we did not find the capability described as a core product workflow; it is intentionally not presented as proof that the product can never perform that action. Sources: [Mindtrip](https://mindtrip.ai/) · [Wanderlog](https://wanderlog.com/plan-a-trip) · [Wanderlog AI Assistant](https://wanderlog.com/trip-plan-assistant)</sub>

### Our Solution

> **Tripify is an AI travel teammate and decision workspace** that helps groups research, compare, decide, manipulate, and adapt a shared trip together. The AI can research real places, construct a plan, critique its own output, explain trade-offs, and propose targeted changes — while the group keeps control over what is actually applied.

The product follows one central principle:

> **AI proposes. Humans decide.**

### Core Capabilities & Current Status

Status is separated deliberately so that prototype behaviour is not presented as a production integration.

| Status | Meaning |
|:------|:--------|
| **✅ Implemented** | Present in the current build / core demo path |
| **🧪 Prototype** | Current interactive or agentic prototype; still being refined or not production-complete |
| **🗓 Post-MVP** | Deliberately outside the judged MVP or dependent on a production external integration |

| Capability | What it does | Status |
|:-----------|:-------------|:------:|
| **Trip Creation & Shared Trip State** | Destination, dates, budget, currency, members, itinerary state | ✅ Implemented |
| **Map-first Planning Workspace** | Activities, locations, routes, travel times, and itinerary manipulation share one workspace | ✅ Implemented |
| **Flexible Pinboard Dashboard** | Map, itinerary, budget, AI planner, alerts, and trip information behave as independent resizable panels | 🧪 Prototype |
| **Group Preferences & Group Fit** | Represents member interests, dislikes, pace, walking tolerance, priorities, and budget in planning decisions | 🧪 Prototype |
| **LangGraph Planning Workflow** | Orchestrates stateful research, recommendation, planning, checking, and proposal generation | 🧪 Prototype |
| **Researcher / Planner / Critic** | Separates evidence gathering, plan construction, and validation responsibilities | 🧪 Prototype |
| **Recommendation Engine** | Scores candidate activities for **our group** using group fit, experience, cost, convenience, reliability, risk, timing, and evidence | 🧪 Prototype |
| **Value-for-Money Reasoning** | Explains why an option may provide better overall value after considering experience, group fit, quality, convenience, reliability, time, transport impact, and cost | 🧪 Prototype |
| **Proposal / Diff / Voting** | Converts AI suggestions into explicit changes the group can inspect, discuss, and decide on | 🧪 Prototype |
| **Partial Regeneration** | Regenerates only affected activities or sections instead of replacing the entire itinerary | 🧪 Prototype |
| **Primary + Conditional Backup Plans** | Important activities can keep fallbacks tied to specific failure conditions such as weather, crowd, closure, price, availability, traffic, or transport delay | 🧪 Prototype |
| **Budget Forecast & AI Cost Optimisation** | Tracks current / expected cost, remaining budget and forecast; an over-budget state can become a targeted cost-reduction proposal | 🧪 Prototype |
| **External Reality** | Brings weather into the trip state and uses a simulated flight delay for the hackathon replanning scenario | 🧪 Prototype |
| **Rule-based AI Observer** | Watches relevant `trip_events`, filters noise, checks affected activities, and triggers research / proposal generation only when action is useful | 🧪 Prototype |
| **Smart Alerts** | Surfaces weather, delay, closure, budget, traffic, reservation, or crowd risks together with affected activities and prepared alternatives | 🧪 Prototype |
| **Production External Monitoring** | Live flight / closure / reservation feeds and broad autonomous background monitoring | 🗓 Post-MVP |

> **Dynamic replanning scope:** the MVP is designed to support real weather context plus simulated disruption events, followed by affected-activity detection, research, recommendation, and a targeted proposal. The **rule-based Observer is part of the intended MVP loop**; production-grade live flight / closure monitoring remains Post-MVP.

### Recommendation, Value & Adaptation Loop

Tripify's AI pipeline is not meant to stop at “search places” or “generate itinerary.” The Todo List defines a decision pipeline where research is converted into group-aware recommendations, recommendations become proposals, and external changes can reactivate that loop only when necessary.

```text
Researcher
   ↓
Evidence
   ↓
Recommendation Engine
   ↓
Group Fit + Value-for-Money + Risk + Best Time
   ↓
Planner
   ↓
Critic
   ↓
Primary Plan + Conditional Backups
   ↓
Structured Proposal
   ↓
Group Decision
   ↓
Versioned Shared Trip State
   ↓
Budget Forecast + External Reality
   ↓
Rule-based AI Observer
   ↓
Smart Alert / Targeted Replanning
```

#### Recommendation Engine — “Is this good for OUR group?”

Tripify should not rank an attraction only because it has a high public rating. A recommendation combines the current trip context with dimensions such as **Group Fit, Experience, Cost, Quality, Convenience, Reliability, Risk, Best Time, and supporting evidence**. The result can then be added directly into a proposal instead of remaining disposable chat text.

```text
TeamLab Borderless — AI Recommendation 91/100

Group Fit       94
Experience      92
Cost            78
Convenience     90
Reliability     91

Why: fits all members, indoor, low walking, close to Day 2 route
Risk: high crowd after 14:00
Best time: 09:00–11:30
Backup: alternative indoor activity
```

#### Value-for-Money — not simply “pick the cheapest”

Value is treated as a **reasoning model**, not a rigid financial equation. A more expensive option can still be better for the group if it materially improves experience, fit, convenience, reliability, travel time, or downstream transport cost.

```text
Value considers
Experience
× Group Fit
× Quality
× Convenience
× Reliability
relative to Cost
```

The important output is the explanation: for example, an option that costs more upfront may still save transport cost and travel time while satisfying more members' priorities.

#### Primary + Conditional Backup Plans

Important activities can optionally carry a backup that is activated by an explicit failure condition rather than being generated from scratch after the plan has already failed.

```text
Primary: Mount Fuji
Risk: weather-dependent

IF heavy rain
→ TeamLab Planets
→ indoor alternative
→ preserve the rest of the day where possible
```

Supported trigger categories in the MVP design include `WEATHER`, `CROWD`, `TRAFFIC`, `CLOSURE`, `PRICE`, `AVAILABILITY`, and `TRANSPORT_DELAY`.

#### Budget Forecast & AI Cost Optimisation

The MVP focuses on **forecasting**, not expense settlement. Budget is therefore part of planning state and can trigger an AI action.

```text
Current Cost   RM 3,800
Expected Cost  RM 4,760
Budget         RM 5,000
Remaining      RM   240

[Ask AI to reduce cost]
        ↓
Targeted cost-saving proposal
```

#### Rule-based AI Observer + Smart Alerts

The Observer is intentionally filtered. It should not call the AI for every event. Instead, relevant events are checked against simple rules and the affected itinerary state before research or replanning begins.

```text
Weather API / trip_event
        ↓
Rule Filter
        ↓
AI Observer
        ↓
Affected activity?
        ↓ yes
Research + Recommendation
        ↓
Prepared alternative / Proposal
        ↓
Smart Alert → Group reviews decision
```

Example: if tomorrow's weather changes and an affected activity is outdoor, Tripify can surface a **Smart Alert** showing the risk, affected activities, and a prepared backup. Irrelevant events are ignored.

<div align="center">

<img src="docs/diagrams/organiser-journey.png" width="780" alt="The organiser's journey — sentiment dips when a delay hits, and recovers when the group replans together">

<sub><i>The organiser's journey: even the disruption stage recovers, because replanning is built into the decision loop.</i></sub>

</div>

<p align="right"><a href="#table-of-contents">↩ Back to top</a></p>

---

## 💡 2. Ideation & Process

### 2.1 Ideas We Considered

| Idea | Why It Was Dropped / Kept |
|:-----|:--------------------------|
| **AI Group Travel Teammate** ✅ *Chosen* | Addresses the root problem: group travel planning is a decision problem, not a search problem. Combines research, recommendation, and group voting. Strong differentiation from existing tools. |
| **AI Trip Expense Splitter** ⏸ *Deferred* | Useful but not the core differentiator. Added as a future feature (expense settlement) but not in MVP scope. |
| **Social Travel Feed** ❌ *Dropped* | Felt like a generic social media app, not a planning tool. Didn't address the coordination problem. |
| **AI Photo Journal** ❌ *Dropped* | Interesting but post-trip; didn't solve the planning problem. |
| **Solo AI Itinerary Generator** ❌ *Dropped* | Already well-served by Google Travel, ChatGPT, and Notion AI. No group decision-making layer. |

### 2.2 Iteration & Idea Evolution

Tripify did not begin as the collaborative, agent-driven planning workspace it is today. The concept evolved repeatedly as we identified limitations in each earlier version and refined both the AI architecture and the user experience.

| Iteration | What We Built / Considered | Limitation We Found | How the Idea Evolved |
|:--|:--|:--|:--|
| **V1 — AI Itinerary Generator** | The initial idea was a conventional AI travel planner: users provide a destination, dates, budget, and preferences, and the AI generates a complete itinerary. | The result was too similar to existing AI travel planners and general-purpose tools such as ChatGPT. It generated an answer, but did not help a group continuously make decisions together. | We shifted the focus from **generating an itinerary** to **collaboratively building and maintaining one**. |
| **V2 — Collaborative Planner** | We introduced shared trips, group preferences, discussion, voting, and a common itinerary so that multiple travellers could plan together. | Collaboration solved part of the problem, but the AI was still mostly reactive. It responded to prompts instead of actively researching, planning, checking constraints, and helping the group resolve decisions. | Tripify evolved from an AI feature inside a planner into an **AI teammate with access to planning tools and shared trip context**. |
| **V3 — LangGraph Agent** | We redesigned the AI workflow using **LangGraph**, allowing the system to maintain state and move through multiple reasoning and tool-use steps instead of relying on a single model response. | A single general-purpose agent still had to research destinations, construct the itinerary, validate the result, and explain decisions at the same time. This made responsibilities unclear and made the workflow harder to control. | We separated the planning process into specialised responsibilities. |
| **V4 — Researcher / Planner / Critic Workflow** | The AI workflow was divided into **researcher**, **planner**, and **critic** roles. The researcher gathers relevant information, the planner converts that information into a usable trip plan, and the critic checks the result for issues such as feasibility, conflicts, weak reasoning, or poor fit. | Better AI reasoning alone did not solve the interaction problem. The resulting itinerary was still primarily presented as information that users had to read rather than something they could directly explore and manipulate. | We moved the product toward a **visual, map-first planning experience** where the AI output becomes interactive trip state. |
| **V5 — Map-First Interactive Planner** | The map became a central part of the planning workspace. Activities, locations, routes, and itinerary changes could be understood spatially instead of only through text or timeline cards. | A fixed map + itinerary + side-panel layout still felt like a traditional dashboard. Different users care about different information at different stages of planning, and a rigid layout created unused space and limited exploration. | We redesigned the workspace around a more flexible spatial interface. |
| **V6 — Flexible Pinboard Dashboard** | The workspace evolved into a **pinboard-style dashboard** made of independent, resizable sections such as the map, itinerary, budget, AI planner, and trip information. Panels can occupy different sizes and expose different levels of information depending on the available space. | The interface became more flexible, but AI-generated plans were still too coarse-grained. Regenerating an entire itinerary because of one bad activity could destroy decisions the group had already agreed on. Users also needed greater visibility and control over why an AI suggestion was being made. | We shifted from whole-plan generation toward **fine-grained AI-assisted manipulation**. |
| **V7 — Partial Regeneration, Reasoning & Fallbacks** | The current direction allows the AI to operate on individual parts of the trip instead of replacing the whole plan. Users can modify activities, request alternatives, regenerate only affected sections, inspect the reasoning behind recommendations, and keep fallback options for activities that may fail because of weather, availability, timing, or other constraints. | — | Tripify has evolved from a tool that **generates trips for users** into a workspace where **users and AI continuously research, manipulate, evaluate, and adapt a shared trip together**. |

#### Evolution of the Core Idea

```text
AI Itinerary Generator
        ↓
Collaborative Planner
        ↓
LangGraph Agent
        ↓
Researcher → Planner → Critic
        ↓
Map-First Interactive Planner
        ↓
Flexible Pinboard Dashboard
        ↓
Partial Regeneration
+ Visible Reasoning
+ Fallback Plans
+ Direct Activity Manipulation
```

The most important change throughout these iterations was a shift in the role of AI.

**Early Tripify:**  
`User prompt → AI generates itinerary → User reads result`

**Current Tripify:**  
`Group discusses → AI researches → planner proposes → critic evaluates → users manipulate or vote → selected changes update the shared trip → affected sections can be regenerated when conditions change`

Instead of treating the itinerary as a one-time AI output, Tripify now treats it as a **living, shared state that both travellers and AI can continuously improve**.

### 2.3 Ideation Boards

**Problem Tree — Root Causes of Group Travel Stress**

<div align="center">

<img src="docs/diagrams/problem-tree.png" width="660" alt="Problem tree — group travel stress branches into four root causes">

</div>

<details>
<summary><i>Original ASCII version</i></summary>

```
Group Travel Stress
├── Information Scattered
│   ├── Flights in one app
│   ├── Hotels in another
│   ├── Activities on Google Maps
│   └── Prices on booking sites
├── Conflicting Preferences
│   ├── Budgets differ
│   ├── Interests differ
│   ├── Walking tolerance differs
│   └── Pace preferences differ
├── No Shared Decision Process
│   ├── WhatsApp threads get lost
│   ├── No voting mechanism
│   ├── No proposal/rationale
│   └── One person ends up deciding everything
└── Reality Changes
    ├── Flight delays
    ├── Weather changes
    ├── Activity closures
    └── Plans become stale instantly
```

</details>

> *This diagram helped us identify that the core problem isn't "I don't know what to do in Tokyo" — it's "we can't decide together, and our plans break when reality changes."*

---

**User Flow — Core Loop**

<div align="center">

<img src="docs/diagrams/decision-loop.png" width="620" alt="The Tripify decision loop — six stations writing back to a shared trip state">

</div>

<details>
<summary><i>Original ASCII version</i></summary>

```
User Creates Trip
      ↓
Adds Members
      ↓
Members Set Preferences
      ↓
Opens Trip Workspace
      ↓
AI Researches Destinations
      ↓
AI Creates Recommendations
      ↓
AI Creates Proposal
      ↓
Group Votes
      ↓
Approved → Itinerary Updates
      ↓
External Event (Flight Delay / Weather)
      ↓
AI Detects Problem
      ↓
AI Researches Alternatives
      ↓
AI Creates Backup Proposal
      ↓
Group Votes Again
      ↓
Trip Continues
```

</details>

> *This flow maps directly to our MVP scope and defines the complete loop we aim to demo.*

### 2.4 Mentor Consultation

| Date | Mentor | Feedback Received | What Was Changed |
|:-----|:-------|:------------------|:-----------------|
| 13/9/2026 | Janelle Tan | *"Don't try to build booking integration for the hackathon."* | Removed hotel/flight booking from MVP scope. Focused on research and proposal system instead. |


<p align="right"><a href="#table-of-contents">↩ Back to top</a></p>

---

## 🎨 3. Design & Prototype

<span id="-prototype"></span>

**UI Prototype:** tripify-agent.vercel.app

### Key Screens

<div align="center">

#### 1. Landing — Your AI Travel Teammate

![Landing](docs/pitch/screens/landing-1.png)

*Tripify introduces itself as an AI travel teammate rather than another one-shot itinerary generator. The landing page establishes the core promise: research, decide, and adapt together.*

---

#### 2. Try a Proposal — Vote & Decide

![Try a Proposal](docs/pitch/screens/try-a-proposal.png)

*AI suggestions are converted into structured proposals instead of silently changing the itinerary. A proposal exposes the rationale, affected activities, before/after changes, impact metrics, and the group decision. This keeps AI assistance inspectable and reversible.*

---

#### 3. Trade-offs Analysis — Transparent Decision Intelligence

![Trade-offs](docs/pitch/screens/trade-offs.png)

*Tripify makes disagreement visible instead of hiding it behind a single recommendation score. Cost, walking, group fit, experience quality, and other constraints can be compared before a decision is applied.*

---

#### 4. Sign Up — Simple Onboarding

![Sign Up](docs/pitch/screens/sign-up.png)

*Authentication provides the identity layer required for shared trips, invitations, per-member preferences, and voting.*

---

#### 5. Home — Your Trip Dashboard

![Home](docs/pitch/screens/home.png)

*The home screen keeps active trips, pending invitations, budgets, dates, members, and unresolved decisions visible without forcing users into the planning workspace immediately.*

---

#### 6. Create a Trip — Set the Shared Constraints

![Create a Trip](docs/pitch/screens/create-a-trip.png)

*Destination, dates, budget, currency, and members become shared constraints for later AI decisions. They are not just form fields: they define the state that the planner and critic must respect.*

---

#### 7. Plan Your Trip — Flexible Pinboard Decision Workspace

![Plan Trip — Flexible Pinboard Workspace](docs/pitch/screens/plan-trip.png)

*The current workspace is **map-first and pinboard-based**, not a fixed three-column dashboard. The map, itinerary, budget, AI planner, and trip information are independent windows that can be resized and rearranged. Different panel sizes expose different levels of detail, allowing the workspace to adapt to the task instead of forcing every user into one rigid layout.*

*The map is an active planning surface: users can inspect spatial feasibility, add or manipulate activities, understand route/time impact, and then ask the AI to operate on the same shared state. A local problem does not require replacing the entire trip — the planner can target an affected day or activity, preserve accepted decisions, explain its reasoning, and surface fallbacks.*

</div>

<p align="right"><a href="#table-of-contents">↩ Back to top</a></p>

---

## 🚀 4. Differentiation & Impact

Tripify's differentiation is not that it has AI, a map, or group collaboration — existing products already provide combinations of those capabilities. The more specific idea is to treat **AI-generated trip changes like inspectable decisions** rather than disposable chat output.

### Decision-layer Differentiation

| Capability | What Tripify Adds |
|:-----------|:------------------|
| **Structured Proposals** | AI suggestions become explicit change sets instead of direct silent edits |
| **Before / After Diff** | Members can see exactly which activities, times, costs, or routes will change |
| **Voting with Reasons** | A rejection can contain a reason that becomes input to the next compromise |
| **Versioned Trip State** | A proposal is tied to the trip version it was created from, reducing stale-change risk |
| **Researcher / Planner / Critic** | Research, construction, and validation have separate responsibilities within the LangGraph workflow |
| **Recommendation Engine** | Evidence is transformed into group-specific recommendations using fit, value, reliability, risk, timing, and itinerary context |
| **Value-for-Money Reasoning** | Tripify can explain why the best group choice is not always the cheapest or highest-rated option |
| **Partial Regeneration** | A bad activity or disrupted day can be regenerated without destroying accepted parts of the trip |
| **Conditional Primary + Backup Plans** | Alternatives are attached to specific failure conditions such as rain, crowd, closure, price, timing, or availability |
| **Rule-based Observer + Smart Alerts** | Relevant trip events can trigger affected-activity checks and prepared alternatives without running AI for every event |
| **AI + Direct Manipulation** | Users can edit the trip directly from the workspace while AI operates on the same shared state |

<div align="center">

**Dynamic replanning in action:**

<img src="docs/diagrams/replanning-flow.png" width="540" alt="Dynamic replanning flow — event, detection, alternatives, backup proposal, vote, versioned apply or compromise loop">

<sub><i>When reality breaks part of the plan, Tripify aims to change the affected state — not throw away the whole itinerary.</i></sub>

</div>

### Impact — Before vs After Tripify

| Before Tripify | With Tripify |
|:---------------|:-------------|
| Ideas and research are scattered across chat, maps, notes, and booking sites | Research and decisions live around one shared trip state |
| One organiser manually reconciles everyone's preferences | Group-fit and trade-off analysis makes competing priorities explicit |
| Highly rated or cheap options are chosen without group context | Recommendation Engine + Value-for-Money reasoning compares fit, experience, cost, convenience, reliability, risk, and timing |
| AI returns a complete itinerary as disposable text | AI output becomes structured activities, recommendations, proposals, evidence, and editable state |
| A bad result often means regenerating the whole itinerary | Partial regeneration targets the affected day or activity |
| Important activities have no prepared failure path | Primary activities can carry conditional backups tied to weather, crowd, closure, price, availability, or delay |
| Budget drift is noticed late | Forecasting exposes current / expected cost and can create a targeted cost-reduction proposal |
| Members agree informally in a chat thread | Members can inspect a diff, vote, and explain objections |
| A later AI prompt can overwrite earlier accepted decisions | Versioned proposals preserve and validate existing trip state before applying changes |
| Weather or another event changes in the background | A rule-filtered Observer can identify affected activities and surface a Smart Alert with prepared alternatives |

### Reach & Scalability

Tripify is destination-independent because its reusable layer is the **decision system** — shared state, preferences, research, proposals, voting, validation, versioning, and replanning — rather than a fixed Tokyo/Paris/etc. itinerary template.

**Initial reach** focuses on friend and family groups planning multi-day leisure trips, where a single organiser often carries most of the coordination burden.

**Built-in group acquisition:** Tripify is naturally multi-user. One organiser creates a trip and invites the rest of the travelling group into the same workspace. Each successfully created trip can therefore introduce several additional users without requiring every traveller to discover the product independently.

**Wider applicability** extends to other travel contexts with the same shared-decision problem: university trips, graduation trips, family holidays, club trips, and team retreats. The workflow remains largely unchanged even when group size, destination, or travel style changes.

**Product scalability** comes from modular agent tools. New place sources, route providers, booking links, weather/event feeds, or recommendation tools can be added around the LangGraph workflow without redesigning the proposal-and-decision model.

The scalable asset is therefore not “more generated itinerary text”; it is a reusable **decision layer for collaborative travel planning**.

<p align="right"><a href="#table-of-contents">↩ Back to top</a></p>

---

## 🛠 5. Technical Architecture & Feasibility

### Tech Stack

| Layer | Technology | Why |
|:------|:-----------|:----|
| **Frontend** | Next.js, React, TypeScript, Tailwind CSS, shadcn/ui, Lucide | Fast iteration with typed, reusable UI components for the map-first workspace |
| **Workspace UI** | Resizable / responsive panel layout | Enables the flexible pinboard model instead of a fixed dashboard |
| **Backend** | Next.js API Routes + Server Actions | Keeps application and server logic close while avoiding a separate backend deployment for the prototype |
| **Database** | Supabase PostgreSQL | Relational shared trip state, proposals, votes, activities, versions, auth, and realtime collaboration |
| **Auth / Realtime** | Supabase Auth + Realtime | Member identity, invitations, shared state updates, and collaborative interactions |
| **AI Models** | OpenRouter | Model flexibility and the ability to choose different cost/capability trade-offs without tying the app to one provider |
| **Agent Orchestration** | LangGraph + LangChain tooling | Stateful workflow orchestration, specialised nodes, tool calling, and controlled retries / critique |
| **Maps** | Google Maps Platform — Places + Routes | Place discovery, coordinates, routes, travel time, and spatial feasibility |
| **Weather** | Open-Meteo | Forecast context for weather-sensitive recommendations, conditional backups, Observer checks, and Smart Alerts |
| **Background Jobs** | Upstash QStash | Later asynchronous research, weather checks, replanning, and background observation; synchronous calls remain acceptable for the earliest MVP |
| **i18n** | next-intl | Locale-aware routing and UI translation for EN / ZH / MS |
| **Hosting** | Vercel + Supabase Cloud | Minimal deployment overhead for the hackathon prototype |

### System Architecture
<div align="center">

<img src="docs/diagrams/architecture.png" width="680" alt="Tripify system architecture — shared trip state, LangGraph research/recommendation/planning/critique, proposal boundary, observer and smart-alert loop">

</div>

<details>
<summary><i>Current architecture — ASCII view</i></summary>

```text
+------------------------------------------------------------------+
|                       Tripify Workspace                           |
| Map | Itinerary | Budget | AI | Alerts | Decisions | Preferences |
+-------------------------------+----------------------------------+
                                |
                                v
+------------------------------------------------------------------+
|                    Shared Trip State (Supabase)                   |
| Members | Activities | Budget | Proposals | Votes | trip_events  |
| Version | Primary/Backup links | Realtime collaboration           |
+-------------------------------+----------------------------------+
                                |
                                v
+------------------------------------------------------------------+
|                     LangGraph Orchestration                      |
|                                                                  |
|  +-------------+      +----------------------+      +-----------+ |
|  | Researcher  | ---> | Recommendation Eng.  | ---> | Planner   | |
|  +------+------+      +----------+-----------+      +-----+-----+ |
|         |                        |                        |       |
|         |              Group Fit / Experience            |       |
|         |              Cost / Quality / Convenience      |       |
|         |              Reliability / Risk / Best Time    |       |
|         |              Value-for-Money                   |       |
|         |                        |                        |       |
|         +------------------------+------------------------+       |
|                                  v                                |
|                              +--------+                           |
|                              | Critic |                           |
|                              +---+----+                           |
+----------------------------------|-------------------------------+
                                   |
                                   v
                       Structured Proposal / Diff
                                   |
                                   v
                         Human Vote / Decision
                                   |
                                   v
                       Backend Version Validation
                                   |
                                   v
                        Approved Operations Only
                                   |
                                   v
                         Versioned Shared State
                                   |
                 +-----------------+------------------+
                 |                                    |
                 v                                    v
       Budget Forecast / Risk               Primary + Backup Plans
                 |                                    |
                 +-----------------+------------------+
                                   |
                                   v
                    External Reality / trip_events
                    Weather | Simulated Flight Delay
                                   |
                                   v
                           Rule-based AI Observer
                                   |
                           Relevant event only?
                              /          \
                            no            yes
                            |              |
                          ignore           v
                                   Affected Activities
                                           |
                                           v
                                Smart Alert / Research
                                           |
                                           v
                                  Targeted Replanning
                                           |
                                           +----> Proposal loop

External tools behind Researcher:
Google Places | Google Routes | Open-Meteo | Web Search | Reviews / Official Sources

Optional later background execution:
Supabase event -> QStash -> Vercel Function -> Observer / Research / Proposal
```

</details>

**External research tools** sit behind the Researcher node: Google Places, Google Routes, Open-Meteo, web search, and review / official-source evidence. The Researcher gathers facts; the **Recommendation Engine** turns those facts into group-aware scores and trade-offs; the Planner creates structured itinerary operations; and the Critic validates feasibility before a proposal reaches the group.

### Recommendation & Value Layer

```text
Research Evidence
      ↓
Recommendation Engine
      ↓
Group Fit + Experience + Cost + Quality
+ Convenience + Reliability + Risk + Best Time
      ↓
Value-for-Money explanation
      ↓
Planner candidate / Proposal input
```

This layer keeps “what is true about this place?” separate from “is this a good choice for this group?”. It also provides a natural home for Recommendation Cards, evidence, risk, best-time guidance, and conditional backups.

### Observer & Smart Alert Loop

```text
Weather / trip_event
      ↓
Rule Filter
      ↓
AI Observer
      ↓
Find affected activities
      ↓
Research + Recommendation
      ↓
Prepared backup / targeted proposal
      ↓
Smart Alert
      ↓
Group reviews and decides
```

The MVP Observer is intentionally **rule-based first**. For example, a `WEATHER_CHANGED` event only needs to trigger AI work when a relevant activity is weather-sensitive or outdoor. Production-grade live flight / closure feeds are a separate Post-MVP integration.

### Proposal Write Boundary

The AI is allowed to **research and propose**, but it should not silently perform arbitrary itinerary mutations.

```text
Research / Plan / Critique
          ↓
Structured proposal
          ↓
Before / after diff + reasoning
          ↓
Human decision
          ↓
Validate base trip version
          ↓
Apply only approved operations
          ↓
Increment shared trip version
```

This boundary keeps the current trip state authoritative and creates a natural place to reject or rebase stale AI output.

### Partial Regeneration

A local problem should create a local planning task.

```text
Affected day / activity
        ↓
Load only relevant trip context
        ↓
Research alternatives
        ↓
Recommendation Engine scores fit / value / risk / timing
        ↓
Planner produces targeted operations
        ↓
Critic checks time / route / budget / group fit / evidence
        ↓
Reuse conditional backup when suitable
        ↓
Proposal preserves unaffected accepted state
```

This is the architectural reason Tripify can move away from “regenerate my whole itinerary” toward fine-grained manipulation.

### Build Plan & Scope

<div align="center">

<img src="docs/diagrams/build-gantt.png" width="720" alt="Tripify MVP build plan — core product, recommendation, value, proposal, replanning, observer and smart-alert phases">

</div>

| Phase | Scope | Priority |
|:------|:------|:--------:|
| **1. Foundation** | Next.js, TypeScript, Tailwind, shadcn/ui, next-intl, Supabase setup | Core |
| **2. Auth & Trip Core** | Auth, trip CRUD, members, invitations, preferences, shared trip state | Core |
| **3. Itinerary State** | Days, activities, activity CRUD, ordering, budget fields, trip version, event-ready state | Core |
| **4. Map-first Workspace** | Google Maps, markers, routes, travel time, activity interaction | Core |
| **5. Flexible Pinboard UI** | Independent resizable panels, responsive information density, layout persistence | Core prototype |
| **6. LangGraph Foundation** | Typed/shared agent state, routing, tool interface, structured outputs | Core prototype |
| **7. Researcher** | Places, routes, weather, web / official-source evidence collection | Core prototype |
| **8. Recommendation Engine** | AI score, Group Fit, Cost, Quality, Convenience, Reliability, Risk, Best Time, Why Recommended, Backup | MVP build |
| **9. Value-for-Money Reasoning** | Explain overall group value rather than ranking only by price or rating | MVP build |
| **10. Planner** | Produce structured itinerary operations rather than free-form itinerary text | Core prototype |
| **11. Critic** | Check timing, travel feasibility, budget, group fit, missing evidence, risk, and conflicts | Core prototype |
| **12. Proposal + Decision Layer** | Proposal diff, rationale, voting, modify/reject path, base trip version | Core prototype |
| **13. Primary + Backup Plans** | Attach conditional fallbacks to important activities using weather / crowd / traffic / closure / price / availability / delay conditions | MVP build |
| **14. Budget Forecast & Optimisation** | Current cost, expected cost, remaining budget, forecast, and “Ask AI to reduce cost” proposal flow | MVP build |
| **15. External Reality** | Real weather context + simulated flight-delay event for the hackathon | MVP build |
| **16. Dynamic / Partial Replanning** | `trip_events` → affected activities → constraints → research → recommendation → targeted proposal | MVP build |
| **17. Rule-based AI Observer** | Event → rule filter → should-react decision → research / proposal only for relevant changes | MVP build |
| **18. Smart Alerts + Realtime** | Weather / delay / closure / budget / traffic / reservation / crowd alerts; realtime proposal, vote, trip and alert updates | MVP build |
| **19. Polish & Judging Flow** | Loading/error states, AI progress, responsive behaviour, demo data, end-to-end scenario | Final |
| **Post-MVP** | Production live-flight / closure / reservation feeds, broader background observation, deeper booking integrations, offline mode | Planned |

### Scope Status

**Implemented / current build**

- ✅ Shared trip foundation, itinerary state, and map-oriented planning flow
- ✅ Core web application / authentication / trip creation flow

**Current prototype**

- 🧪 Flexible pinboard workspace
- 🧪 LangGraph orchestration with Researcher / Planner / Critic responsibilities
- 🧪 Proposal / diff / voting decision workflow
- 🧪 Partial regeneration and direct activity manipulation

**Committed MVP build — explicitly present in the Todo List**

- 🚧 Recommendation Engine with AI Score, Group Fit, Cost, Quality, Convenience, Reliability, Risk, Best Time, Why Recommended, and Backup
- 🚧 Value-for-Money reasoning
- 🚧 Primary + conditional backup plans
- 🚧 Budget forecast and AI cost-optimisation proposal flow
- 🚧 External Reality layer with real weather context and simulated flight delay
- 🚧 `trip_events`-based dynamic replanning
- 🚧 Rule-based AI Observer that filters irrelevant events before triggering AI work
- 🚧 Smart Alerts for weather, delay, closure, budget, traffic, reservation, and crowd risks
- 🚧 Supabase Realtime updates for proposals, votes, trip updates, and AI alerts

**Post-MVP / production integrations**

- 🗓 Production live-flight monitoring and automatic closure / reservation feeds
- 🗓 Broad autonomous background observation beyond the rule-filtered MVP cases
- 🗓 Expense settlement
- 🗓 TikTok/social-media crawling
- 🗓 Offline mode

> Status labels are intentionally conservative: prototype behaviour is not presented as a production-grade external integration.

### Resource, Cost & Time Awareness

Tripify is being built by a **3-person student team**, so the MVP is scoped around one defensible end-to-end decision loop rather than a full booking platform.

| Resource / Constraint | Prototype Decision |
|:----------------------|:-------------------|
| **Supabase Free** | Suitable for judging-scale usage. Current Free quotas include 500 MB database size, 50,000 MAU, 5 GB egress, 2 million Realtime messages, and 200 peak Realtime connections. Production growth would require monitoring or upgrading. |
| **Google Maps Platform** | Pay-as-you-go with SKU-specific monthly free caps. Current Essentials examples include 10,000 free monthly billable events for Dynamic Maps and Compute Routes Essentials; usage should be cached / limited during demos and monitored before production. |
| **OpenRouter / LLM calls** | Research and critique can create multiple model/tool calls, so the graph should bound retries, reuse gathered evidence, and avoid rerunning unaffected itinerary sections. Partial regeneration is also a cost-control strategy. |
| **External travel data** | Live availability, closure, and flight feeds are not assumed to be free or universally accessible. The MVP uses available data and simulated disruption where necessary instead of pretending every provider is integrated. |
| **Team / time** | Core judging path takes priority: shared trip → research → recommendation/value reasoning → proposal → decision → targeted apply/replan. Recommendation Cards, budget forecasting, conditional backups, the rule-based Observer, and Smart Alerts are part of the MVP path; production-grade external monitoring is deferred. |

Official limit references: [Supabase billing](https://supabase.com/docs/guides/platform/billing-on-supabase) · [Supabase Realtime pricing](https://supabase.com/docs/guides/realtime/pricing) · [Google Maps Platform pricing](https://developers.google.com/maps/billing-and-pricing/pricing)

<p align="right"><a href="#table-of-contents">↩ Back to top</a></p>

---

## 🎬 Video & Slides

| | Link |
|:---|:-----|
| **Video Presentation** | https://youtu.be/nOgfiaMGdHY |
| **Presentation Slides** | https://canva.link/9c0ub4lcf1vss2y |

<details>
<summary><b>📺 Slide preview — all 13 slides</b></summary>
<br/>

<div align="center">

| | |
|:---:|:---:|
| ![Slide 1 — Title](docs/pitch/slides/slide-01.png) | ![Slide 2 — The Problem](docs/pitch/slides/slide-02.png) |
| ![Slide 3 — The Solution](docs/pitch/slides/slide-03.png) | ![Slide 4 — The Twist](docs/pitch/slides/slide-04.png) |
| ![Slide 5 — The Gap](docs/pitch/slides/slide-05.png) | ![Slide 6 — Demo divider](docs/pitch/slides/slide-06.png) |
| ![Slide 7 — Dashboard](docs/pitch/slides/slide-07.png) | ![Slide 8 — Recommendation](docs/pitch/slides/slide-08.png) |
| ![Slide 9 — Proposal & vote](docs/pitch/slides/slide-09.png) | ![Slide 10 — Replanning](docs/pitch/slides/slide-10.png) |
| ![Slide 11 — Tech stack](docs/pitch/slides/slide-11.png) | ![Slide 12 — Build plan](docs/pitch/slides/slide-12.png) |
| ![Slide 13 — Impact & close](docs/pitch/slides/slide-13.png) | |

*4:30 video pitch structure: solution & difference → prototype demo → tech stack & build plan → impact & close.*

</div>

</details>

---

## 🧑‍🤝‍🧑 Team

<div align="center">

**Studify — 3-person team**

</div>

| Member | Primary Responsibility |
|:-------|:-----------------------|
| **Tan Sim Po** | AI/agent architecture |
| **She Jia Xuan** | frontend/UX|
| **Chong Wei Xuan** | backend/data/integrations |

<div align="center">
<sub><i>Built with ❤️ for group travellers who just want to decide together.</i></sub>
</div>

<p align="right"><a href="#table-of-contents">↩ Back to top</a></p>
