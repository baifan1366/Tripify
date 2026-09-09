# Tripify

> **AI Travel Teammate for Group Trips**

Tripify is an AI-powered travel planning application designed to help individuals and groups plan, discuss, decide, and adapt their trips together.

Instead of simply generating an itinerary, Tripify treats travel planning as a **group decision-making problem**.

### Core Loop

```text
Talk
  ↓
Research
  ↓
Recommend
  ↓
Propose
  ↓
Vote
  ↓
Apply
  ↓
Reality Changes
  ↓
Replan
```

---

# 1. Problem Statement

Planning a trip requires information from many different sources:

- Flights
- Hotels
- Attractions
- Restaurants
- Transportation
- Prices
- Reviews
- Weather
- Opening hours
- Group preferences
- Budget
- Itinerary

Existing applications often solve only part of this problem.

Group travel makes the problem harder because different people have different:

- Budgets
- Interests
- Food preferences
- Activity preferences
- Walking tolerance
- Schedules

Even after an itinerary has been created, real-world events can invalidate it:

- Flight delays
- Bad weather
- Attraction closures
- Traffic
- Unexpected costs
- Overcrowding

Tripify aims to solve this through an AI teammate that can research information, understand group preferences, propose changes, collect decisions, and dynamically replan the trip.

---

# 2. Product Philosophy

## Travel planning is a decision problem, not a search problem.

Traditional travel apps:

```text
Search → Select → Book
```

AI itinerary generators:

```text
Prompt → AI Plan
```

Tripify:

```text
Group Discussion
      ↓
AI Research
      ↓
AI Recommendation
      ↓
AI Proposal
      ↓
Group Decision
      ↓
Shared Itinerary
      ↓
Dynamic Replanning
```

The core principle is:

> **AI proposes. Humans decide.**

The AI should never silently modify the group's trip.

Instead:

```text
AI
 ↓
Proposal
 ↓
Group Vote
 ↓
Approved
 ↓
Trip Updated
```

---

# 3. MVP Scope

## Must Have

The MVP should contain these systems.

### 1. Trip Creation

Users can create:

- Trip name
- Destination
- Start date
- End date
- Currency
- Total budget

Example:

```text
Tokyo Trip

4 people
5 days
RM 5,000 total
20 Oct - 24 Oct
```

---

### 2. Group Members

Users can:

- Add members
- Join a trip
- View members
- Set individual preferences

Example:

```text
Alice
Budget: RM 1,200
Interests: Food, Shopping
Walking: Medium

Bob
Budget: RM 1,500
Interests: Anime, Gaming
Walking: High

Charlie
Budget: RM 1,000
Interests: Culture, Photography
Walking: Low

David
Budget: RM 1,300
Interests: Nature, Food
Walking: Medium
```

---

### 3. Group Preferences

Each member should be able to provide:

- Budget
- Interests
- Dislikes
- Food preferences
- Walking tolerance
- Preferred pace
- Activity preferences

Example:

```text
Alice

Likes:
✓ Shopping
✓ Cafes
✓ Photography

Dislikes:
✕ Long walking

Priority:
Experience > Cost
```

The AI uses these preferences when generating recommendations.

---

### 4. Group Chat

The chat is one of Tripify's most important interfaces.

Users should be able to say:

```text
Alice:
I want to visit Shibuya.

Bob:
I don't want too much shopping.

Charlie:
Can we have more cultural activities?

David:
I want to keep the trip under RM 5,000.
```

The AI can participate as a teammate.

Example:

```text
Alice:
Can you make Day 3 less tiring?

Tripify AI:
I found a lower-walking alternative.

Current:
09:00 TeamLab
14:00 Shibuya Sky
18:00 Shibuya Shopping

Proposed:
09:30 TeamLab
13:00 Cafe Break
15:00 Shibuya Sky
18:30 Dinner

Walking:
11.2 km → 6.1 km

Estimated cost:
RM 120 → RM 140

Group Fit:
82 → 91
```

---

# 5. AI Travel Agent

Do NOT implement multiple independent agents for the MVP.

Use one:

> **Tripify AI Travel Agent**

Internally it has different tools/modules.

```text
Tripify AI
│
├── Trip Context
├── Research
├── Recommendation
├── Planning
├── Replanning
├── Budget Analysis
└── External Reality
```

This keeps the architecture simple while still allowing sophisticated behaviour.

---

# 6. AI Tools

The AI agent should have tools such as:

```text
get_trip()
get_preferences()
get_itinerary()
get_recent_chat()

search_places()
search_restaurants()
search_hotels()

get_place_details()
get_reviews()

get_weather()
get_routes()

calculate_budget()
calculate_group_fit()

create_proposal()
```

Important:

The AI should NOT have direct:

```text
update_trip()
delete_activity()
modify_database()
```

tools.

Instead:

```text
AI
 ↓
create_proposal()
 ↓
Proposal
 ↓
User Vote
 ↓
Backend Validation
 ↓
Database Update
```

---

# 7. AI Research

Tripify should not simply ask an LLM:

> "What are the best places in Tokyo?"

Instead, the AI should research the destination.

For each candidate attraction:

```text
Candidate
   ↓
Search
   ↓
Reviews
   ↓
Social / Community Opinions
   ↓
Official Information
   ↓
Weather
   ↓
Transport
   ↓
Opening Hours
   ↓
Price
   ↓
Group Preferences
   ↓
Recommendation
```

---

## Research Sources

Potential sources:

- Google Maps / Places
- Official attraction websites
- Reddit
- Travel websites
- Booking.com
- Blogs
- YouTube
- TikTok where technically available

For the MVP, do not build a TikTok crawler.

Use:

```text
Web Search
+
Google Places
+
Official Sources
+
Reddit / indexed public discussions
```

as the main research layer.

---

# 8. Recommendation Engine

Do not rank attractions purely by rating.

Tripify should answer:

> **"Is this a good choice for OUR group?"**

Example:

```text
TeamLab Borderless

AI Recommendation: 91/100

Group Fit       94
Experience      92
Cost            78
Convenience     90
Reliability     91

Why:

✓ 4/4 members are interested
✓ Good weather for indoor activity
✓ Close to other Day 2 activities
✓ Low walking requirement
✓ Strong recent reviews

Potential issue:

⚠ High crowd risk after 14:00

Recommended time:

09:00 - 11:30
```

---

# 9. Value-for-Money

The AI should consider:

```text
Value
=
Experience
× Group Fit
× Quality
× Convenience
× Reliability
÷ Cost
```

This does not need to be mathematically perfect.

The important part is explaining the decision.

Example:

```text
Hotel A

RM 480/night

Hotel B

RM 620/night

AI Recommendation:

Hotel B is RM 140 more expensive, but it is
12 minutes closer to the main attractions and
fits all 4 members' preferences.

Estimated transportation savings:
RM 90

Estimated time saved:
~50 minutes/day

Recommendation:
Hotel B provides better value for this group.
```

---

# 10. Primary + Backup Plans

Every important activity should optionally have a backup.

Example:

```text
Primary Plan

Mount Fuji
09:00 - 16:00

Risk:
High weather dependency
```

Backup:

```text
If rain:

→ TeamLab Planets
→ Indoor activity
→ 25 min from hotel
```

Another example:

```text
If crowd is too high:

Shibuya Sky
↓
Tokyo Metropolitan Government Building
```

Backups should be based on a specific failure condition.

```text
WEATHER
CROWD
TRAFFIC
CLOSURE
PRICE
AVAILABILITY
TRANSPORT_DELAY
```

---

# 11. Dynamic Replanning

This is one of the most important MVP features.

Example:

```text
Flight Delay Detected

Original arrival:
10:00

New arrival:
14:00

Affected activities:
✓ Shibuya
✓ TeamLab
✓ Dinner reservation
```

Tripify automatically evaluates the affected itinerary.

```text
Tripify AI

I found 3 affected activities.

I recommend:

Remove:
14:30 TeamLab

Move:
Shibuya → Day 2

Add:
Asakusa → Day 1

Expected walking:
-2.4 km

Budget impact:
+RM 0
```

Then:

```text
[Approve Changes]

[Modify]

[Reject]
```

The AI does not automatically apply the changes.

---

# 12. Proposal System

This is the core state-management mechanism.

## Proposal Lifecycle

```text
DRAFT
 ↓
PENDING
 ↓
VOTING
 ↓
APPROVED
 ↓
APPLIED
```

Alternative:

```text
PENDING
 ↓
REJECTED
```

or:

```text
PENDING
 ↓
MODIFY
 ↓
NEW PROPOSAL
```

---

# 13. Proposal Example

## Proposal Card

```text
✦ AI Proposal

Make Day 3 Less Tiring

Why:
Day 3 currently requires approximately
11.2 km of walking.

Changes:

- Move TeamLab to 09:30
- Remove Shibuya Sky
- Add cafe break
- Move shopping to 18:00

Impact:

Walking
11.2 km → 6.1 km

Cost
RM 120 → RM 140

Group Fit
82 → 91

Votes

Alice     ✓ Approve
Bob       ✓ Approve
Charlie   ✕ Reject
David     ✓ Approve

3 / 4 approve

[Approve] [Modify] [Reject]
```

---

# 14. Proposal Diff

Use a Git/Linear-like before/after presentation.

```text
DAY 3

- 14:00 Shibuya Sky
- 16:00 Shibuya Shopping

+ 13:00 Cafe Break
+ 15:00 Shibuya Shopping
+ 18:30 Dinner
```

This makes AI changes understandable.

---

# 15. Group Decision Intelligence

Voting should not simply count:

```text
3 YES
1 NO
```

The AI should understand why.

Example:

```text
Charlie rejected the proposal because
Shibuya Sky was his highest-priority activity.
```

The AI can then propose:

```text
Compromise:

Keep Shibuya Sky but remove another
low-priority activity.

New walking:
7.2 km

Group Fit:
89

All 4 members' highest-priority activities
are preserved.
```

This is a strong differentiator.

---

# 16. Trip State

The database should represent the current state of the trip.

```text
Trip
│
├── Members
├── Preferences
├── Days
│   └── Activities
├── Budget
├── Chat
├── Proposals
├── Votes
└── External Reality
```

Do NOT store the entire itinerary as one giant JSON object.

Use relational tables so individual activities can be changed safely.

---

# 17. Database

## users

```text
id
name
email
avatar_url
created_at
```

---

## trips

```text
id
name
destination
start_date
end_date
currency
budget_total
status
version
created_by
created_at
updated_at
```

`version` is important for proposal conflict detection.

---

## trip_members

```text
id
trip_id
user_id
role
joined_at
```

---

## trip_preferences

```text
id
trip_id
user_id

budget_limit
pace
walking_tolerance

food_preferences
interests
dislikes

experience_weight
cost_weight
convenience_weight

notes
```

---

## trip_days

```text
id
trip_id
day_number
date

title
notes

created_at
updated_at
```

---

## trip_activities

```text
id
trip_day_id

title
description
type

start_time
end_time

location_name
latitude
longitude

estimated_cost
booking_url

status
position

metadata

created_at
updated_at
```

---

## chat_messages

```text
id
trip_id
user_id

role
content
message_type
metadata

created_at
```

---

## proposals

```text
id
trip_id

created_by

type
title
description
reason

status

parent_proposal_id
base_trip_version

created_at
expires_at
```

---

## proposal_changes

```text
id
proposal_id

entity_type
entity_id

operation
field

old_value
new_value

created_at
```

---

## proposal_votes

```text
id
proposal_id
user_id

vote
reason

created_at
```

Constraint:

```text
UNIQUE(proposal_id, user_id)
```

---

## trip_events

Used for the AI Observer.

```text
id
trip_id

event_type
source
actor_user_id

entity_type
entity_id

payload

processed
created_at
```

Examples:

```text
USER_MESSAGE
VOTE_CREATED
PROPOSAL_CREATED
PROPOSAL_APPROVED

FLIGHT_DELAYED
WEATHER_CHANGED
ACTIVITY_CLOSED
BUDGET_EXCEEDED
BOOKING_CHANGED
```

---

## trip_snapshots

```text
id
trip_id
version
snapshot
created_at
```

Snapshots are only needed when the meaningful trip state changes.

They provide:

- History
- Undo
- Debugging
- Proposal comparison

Do not create a snapshot for every chat message.

---

# 18. Optional Research Tables

These can be added after the core MVP works.

## research_sources

```text
id
trip_id

entity_type
entity_id

source_type
url
title

published_at
credibility_score

content_hash
collected_at

metadata
```

---

## research_evidence

```text
id
source_id

claim
sentiment
topic
confidence

evidence
```

These allow Tripify to explain:

> Why did the AI recommend this?

---

# 19. External Reality

Tripify should model real-world conditions.

For an activity:

```text
Activity
+
Date
+
Time
+
Weather
+
Holiday
+
Weekend
+
Events
+
Crowd
+
Traffic
+
Opening Hours
+
Transport
+
Price
```

The LLM should synthesize these facts.

It should not invent them.

---

# 20. trip_facts

Optional but useful for the AI Observer.

```text
id
trip_id

entity_type
entity_id

fact_type
value

confidence

valid_from
valid_until

source_id
collected_at
```

Examples:

```text
crowd_risk = HIGH
weather_risk = LOW
transport_risk = MEDIUM
best_arrival_time = 08:00
holiday_factor = HIGH
```

---

# 21. AI Observer

Tripify should eventually observe changes without requiring the user to ask.

Example:

```text
Weather API
     ↓
Weather Changed
     ↓
trip_events
     ↓
Observer
     ↓
Check affected activities
     ↓
AI Research
     ↓
Create Proposal
     ↓
Notify Group
```

However, the MVP should NOT run the AI for every event.

Use a simple rule-based trigger first.

Example:

```text
if event == FLIGHT_DELAYED:
    trigger_ai()

if event == WEATHER_CHANGED:
    trigger_ai()

if event == USER_MESSAGE:
    only_trigger_if_planning_intent()
```

Ignore irrelevant messages.

---

# 22. QStash / Background Jobs

For asynchronous AI processing:

```text
Supabase
   ↓
Event
   ↓
QStash
   ↓
Vercel Function
   ↓
Tripify AI
   ↓
Proposal
```

Useful for:

- Research
- Replanning
- Weather checks
- Background observation

For the earliest MVP, synchronous API calls are acceptable.

Add QStash when the basic loop works.

---

# 23. Version Control for Trip State

Every meaningful modification increments:

```text
trip.version
```

Example:

```text
Trip Version 10
       ↓
AI creates Proposal #15
base_trip_version = 10
       ↓
Another change occurs
       ↓
Trip Version 11
       ↓
User approves Proposal #15
       ↓
VERSION MISMATCH
```

The backend should NOT blindly apply the old proposal.

Instead:

```text
Rebase
or
Regenerate Proposal
```

This prevents stale AI decisions from corrupting the itinerary.

---

# 24. UI / UX

Tripify should be designed as a:

> **Decision Workspace**

not a generic travel dashboard.

Recommended desktop layout:

```text
┌──────────────────────────────────────────────────────────┐
│ Tripify     Tokyo Trip      Oct 20–24     RM4,120/5,000 │
├──────────────┬────────────────────────┬──────────────────┤
│              │                        │                  │
│  ITINERARY   │         MAP            │   TRIPMATE AI    │
│              │                        │                  │
│ Day 1        │                        │ Chat             │
│ Day 2        │     Route              │                  │
│ Day 3        │     Activities         │ Proposal         │
│ Day 4        │                        │ Recommendation   │
│ Day 5        │                        │                  │
│              │                        │                  │
├──────────────┴────────────────────────┴──────────────────┤
│ Smart Alert / Pending Decision / Trip Health              │
└──────────────────────────────────────────────────────────┘
```

Recommended proportions:

```text
Itinerary: 25%
Map:       45%
AI:        30%
```

---

# 25. Main UI Components

Use shadcn/ui as the base component system.

Recommended primitives:

```text
Card
Badge
Button
Tabs
Dialog
Sheet
Drawer
Popover
Command
Avatar
Progress
ScrollArea
Separator
Tooltip
DropdownMenu
Alert
```

Custom components:

```text
TripHeader
DayTimeline
ActivityCard
RouteSegment

AIMessage
ProposalCard
ProposalDiff
VotePanel
DecisionCard

ResearchEvidence
RecommendationCard

RiskBadge
TripHealth
BudgetSummary
SmartAlert
MemberPreference
```

---

# 26. Activity Card

Example:

```text
┌──────────────────────────────────┐
│ 09:00                             │
│ TeamLab Borderless               │
│ Azabudai Hills                   │
│                                  │
│ RM 120                            │
│ 25 min from previous activity    │
│                                  │
│ AI Score 91                      │
│ Crowd: HIGH                      │
│                                  │
│ Best time: 09:00–11:30           │
└──────────────────────────────────┘
```

---

# 27. Map

The map should not just show pins.

It should answer:

> Is this itinerary physically reasonable?

Show:

```text
Activity A
   ↓ 15 min
Activity B
   ↓ 28 min
Activity C
```

Also show:

- Distance
- Travel time
- Transportation mode
- Route
- Estimated cost

---

# 28. AI Chat

Do not make it look like a normal ChatGPT clone.

It should feel like a travel teammate.

Example:

```text
┌─────────────────────────────┐
│ ✦ Tripify AI               │
│                             │
│ I found 3 options for       │
│ Day 3.                      │
│                             │
│ Your group has different    │
│ preferences, so I ranked    │
│ them by group fit.          │
│                             │
│ [View Recommendation]       │
│                             │
└─────────────────────────────┘
```

AI messages should contain interactive objects.

```text
AI Message
    ↓
Recommendation Card
    ↓
Proposal Card
    ↓
Vote
```

---

# 29. Proposal Card

This is one of the most important UI components.

```text
✦ AI Proposal

Make Day 3 Less Tiring

Why:
Current itinerary requires 11.2 km walking.

Changes:
- Move TeamLab to 09:30
- Add cafe break
- Move shopping to 18:00

Impact:
Walking     11.2 → 6.1 km
Cost        RM120 → RM140
Group Fit   82 → 91

Votes:
3 / 4 approve

[Approve]
[Modify]
[Reject]
```

---

# 30. Research / Recommendation UI

Example:

```text
TeamLab Borderless

AI Recommendation
91 / 100

Group Fit       94
Experience      92
Cost            78
Convenience     90
Reliability     91

Why we recommend it:

✓ 4/4 members interested
✓ Indoor
✓ Good for rainy weather
✓ Easy transportation

Potential issues:

⚠ Crowded after 14:00

Best time:
09:00 – 11:30

Backup:
Tokyo National Museum
```

Sources should not dominate the main UI.

Use:

```text
Why?
```

or:

```text
Evidence
```

to open a drawer/popover.

---

# 31. Trip Health

Top-level trip status:

```text
Trip Health

Budget       ████████░░ 82%
Schedule     █████████░ 91%
Group Fit    ████████░░ 86%
Weather      █████████░ 90%

Overall
88 / 100
```

This should be a compact summary, not a huge dashboard.

---

# 32. Budget

The MVP should focus on:

> Forecasting

not expense accounting.

Example:

```text
Trip Budget

RM 4,120 / RM 5,000

Remaining:
RM 880

Forecast:
RM 4,760

Potential overrun:
RM 0

[Ask AI to reduce RM420]
```

The AI can then create a proposal.

---

# 33. Smart Alerts

Example:

```text
⚠ AI Alert

Heavy rain expected tomorrow.

2 activities may be affected.

Prepared alternative:

Mount Fuji
↓
TeamLab Borderless

[Review Changes]
```

Other alerts:

```text
Flight delayed
Activity closed
Weather changed
Budget risk
Traffic increased
Reservation conflict
Crowd risk
```

---

# 34. Mobile Layout

Do not simply compress the desktop UI.

Use a dedicated mobile layout.

Bottom navigation:

```text
Plan
Map
Chat
Decisions
Budget
```

Example:

```text
┌──────────────────────┐
│ Tokyo Trip            │
│ RM4,120 / RM5,000     │
├──────────────────────┤
│ Day 3                 │
│                      │
│ 09:30 TeamLab         │
│ 12:30 Lunch           │
│ 14:00 Cafe            │
│ 16:00 Shopping        │
│                      │
├──────────────────────┤
│ Plan  Map  Chat  ...  │
└──────────────────────┘
```

---

# 35. Recommended Visual Style

Reference:

```text
Linear
+
Notion
+
Modern Travel
```

Design characteristics:

- Clean
- Minimal
- High information density
- Strong typography
- Subtle borders
- Minimal shadows
- Clear hierarchy
- Small number of colors

Suggested color direction:

```text
Black
White
Deep Blue
Light Blue
Neutral Gray
```

AI visual language:

```text
✦ AI Insight
✦ AI Proposal
⚠ AI Alert
✓ AI Verified
```

---

# 36. Internationalization

Tripify will use:

> **next-intl**

Do this from the beginning rather than adding translation later.

Recommended initial languages:

```text
English
Chinese
Malay
```

Suggested structure:

```text
messages/
├── en.json
├── zh.json
└── ms.json
```

Next.js structure:

```text
app/
└── [locale]/
    ├── page.tsx
    ├── dashboard/
    └── trip/
        └── [id]/
```

Example:

```text
/en
/zh
/ms
```

Use next-intl for:

- UI text
- Navigation
- Buttons
- Error messages
- Validation
- Empty states
- Notifications
- AI UI labels

Do NOT translate raw database content automatically.

For example:

```text
trip.name
activity.title
chat.message
```

should remain user-generated content unless translation is explicitly requested.

---

# 37. next-intl Implementation

Recommended setup:

```text
src/
├── app/
│   └── [locale]/
│       ├── layout.tsx
│       ├── page.tsx
│       └── trip/
│
├── i18n/
│   ├── routing.ts
│   ├── request.ts
│   └── navigation.ts
│
├── messages/
│   ├── en.json
│   ├── zh.json
│   └── ms.json
│
└── components/
```

Use typed translation keys where possible.

Example:

```text
trip.create
trip.members
trip.budget
trip.itinerary
trip.aiProposal
trip.approve
trip.modify
trip.reject
```

Avoid:

```text
t("some random text")
```

Prefer semantic keys.

---

# 38. Logo

Logo is currently undecided.

Do NOT spend significant MVP development time on the logo.

Temporary solution:

```text
✦ Tripify
```

or a simple text logo.

Potential future concepts:

### Direction 1 — T + Route

A stylized T that also looks like a travel route.

### Direction 2 — Pin + T

A location pin combined with the letter T.

### Direction 3 — T + Airplane Route

Minimal route line forming a T.

### Direction 4 — Connected Nodes

Several points connected into a route, representing group travel.

The logo should communicate:

```text
Travel
+
Connection
+
Planning
```

rather than simply using a generic airplane icon.

---

# 39. Tech Stack

## Frontend

```text
Next.js
React
TypeScript
Tailwind CSS
shadcn/ui
Lucide
next-intl
```

---

## Backend

```text
Next.js API Routes / Server Actions
Supabase
PostgreSQL
Supabase Auth
Supabase Realtime
```

---

## AI

```text
OpenRouter
LangChain
Structured Output
Tool Calling
```

Potential models can be switched through OpenRouter.

Do not tightly couple the application to one model.

---

## Maps

```text
Google Maps Platform

Places API
Routes API
```

Used for:

- Place search
- Place details
- Coordinates
- Photos
- Routes
- Travel time
- Distance
- Transportation
```

---

## Weather

Possible MVP option:

```text
Open-Meteo
```

Used for:

- Temperature
- Rain
- Weather conditions
- Forecast
```

---

## Background Jobs

Optional:

```text
Upstash QStash
```

Used for:

- AI research
- AI observer
- Weather checks
- Replanning jobs
```

---

## Deployment

```text
Vercel
+
Supabase
```

Electron can be added later as a desktop wrapper.

For the Hackathon MVP:

> Build the web application first.

Only package with Electron after the web version works.

---

# 40. Architecture

```text
┌─────────────────────────────────────────────┐
│                  Tripify UI                 │
│                                             │
│ Chat | Itinerary | Map | Decisions | Budget│
└──────────────────────┬──────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────┐
│              Next.js Backend                │
│                                             │
│ Auth                                        │
│ Trip API                                    │
│ Proposal API                                │
│ Vote API                                    │
│ AI API                                      │
└───────────────┬─────────────────────────────┘
                │
       ┌────────┴─────────┐
       ↓                  ↓
┌─────────────┐    ┌────────────────────────┐
│  Supabase   │    │ Tripify AI Agent       │
│             │    │                        │
│ PostgreSQL  │    │ Research               │
│ Realtime    │    │ Recommendation         │
│ Auth        │    │ Planning               │
└─────────────┘    │ Replanning             │
                   └───────────┬────────────┘
                               │
                               ↓
                   ┌────────────────────────┐
                   │ External Tools         │
                   │                        │
                   │ Google Places          │
                   │ Google Routes          │
                   │ Weather                │
                   │ Web Search             │
                   │ Reviews / Sources      │
                   └────────────────────────┘
```

---

# 41. MVP Implementation Steps

The development order matters.

Do NOT start by building the AI agent.

Build the state system first.

---

## Phase 0 — Project Foundation

### Tasks

- [ ] Create Next.js project
- [ ] Configure TypeScript
- [ ] Configure Tailwind
- [ ] Configure shadcn/ui
- [ ] Install Lucide
- [ ] Configure next-intl
- [ ] Create English / Chinese / Malay messages
- [ ] Configure Supabase
- [ ] Configure environment variables
- [ ] Configure ESLint
- [ ] Configure Git
- [ ] Create basic project structure

Target:

```text
Next.js
+
next-intl
+
shadcn
+
Supabase
```

working correctly.

---

# 42. Phase 1 — Authentication

### Tasks

- [ ] Supabase Auth
- [ ] Login
- [ ] Register
- [ ] Logout
- [ ] User profile
- [ ] Protected routes
- [ ] Middleware / locale routing

Target:

```text
User
 ↓
Login
 ↓
Dashboard
```

---

# 43. Phase 2 — Trip Creation

### Tasks

- [ ] Create Trip UI
- [ ] Trip database table
- [ ] Trip members
- [ ] Invite/join mechanism
- [ ] Trip dashboard
- [ ] Trip header
- [ ] Budget display
- [ ] Date display

Target:

```text
Create Trip
 ↓
Tokyo
 ↓
5 days
 ↓
4 people
 ↓
RM 5,000
```

---

# 44. Phase 3 — Group Preferences

### Tasks

- [ ] Preference form
- [ ] Budget
- [ ] Interests
- [ ] Dislikes
- [ ] Food preferences
- [ ] Walking tolerance
- [ ] Pace
- [ ] Priority weights
- [ ] Member preference UI

Target:

```text
4 members
 ↓
4 different preferences
 ↓
Stored in Supabase
```

---

# 45. Phase 4 — Itinerary

### Tasks

- [ ] trip_days
- [ ] trip_activities
- [ ] Day timeline
- [ ] Activity card
- [ ] Add activity
- [ ] Edit activity
- [ ] Delete activity
- [ ] Reorder activity
- [ ] Estimated cost
- [ ] Travel time

Target:

```text
Day 1
 ├── Airport
 ├── Hotel
 ├── Asakusa
 └── Dinner

Day 2
 ├── TeamLab
 ├── Lunch
 └── Shibuya
```

At this stage, the application should already be usable WITHOUT AI.

---

# 46. Phase 5 — Map

### Tasks

- [ ] Google Maps integration
- [ ] Activity markers
- [ ] Route rendering
- [ ] Distance calculation
- [ ] Travel time
- [ ] Transportation mode
- [ ] Connect itinerary activities

Target:

```text
Itinerary
     ↕
Map
```

The map must reflect the current itinerary.

---

# 47. Phase 6 — Chat

### Tasks

- [ ] chat_messages
- [ ] Chat UI
- [ ] Realtime messages
- [ ] User messages
- [ ] AI messages
- [ ] Message metadata
- [ ] Mention Tripify AI

Example:

```text
@Tripify make Day 3 less tiring
```

Target:

```text
Group Chat
+
Trip Context
```

---

# 48. Phase 7 — AI Context

Before implementing complex research, make the AI understand the trip.

Create a context builder:

```text
Trip Context
│
├── Trip details
├── Members
├── Preferences
├── Current itinerary
├── Budget
├── Recent chat
└── Pending proposals
```

Example:

```typescript
const context = {
  trip,
  members,
  preferences,
  itinerary,
  budget,
  recentMessages,
  pendingProposals
}
```

Do not send the entire database to the model.

Only send relevant information.

---

# 49. Phase 8 — AI Tool Calling

Implement tools one by one.

Recommended order:

```text
1. get_trip
2. get_preferences
3. get_itinerary
4. get_recent_chat
5. search_places
6. get_place_details
7. get_routes
8. get_weather
9. calculate_budget
10. calculate_group_fit
11. create_proposal
```

Test each tool independently.

---

# 50. Phase 9 — Structured AI Output

Do not let the AI return arbitrary Markdown for important operations.

Use structured output.

Example conceptual schema:

```typescript
{
  type: "proposal",
  title: string,
  reason: string,
  changes: [
    {
      entityType: string,
      entityId: string,
      operation: string,
      field: string,
      newValue: unknown
    }
  ],
  impact: {
    budget: number,
    walkingDistance: number,
    groupFit: number
  }
}
```

This allows the backend to validate AI output.

---

# 51. Phase 10 — Proposal System

### Tasks

- [ ] proposals table
- [ ] proposal_changes table
- [ ] proposal_votes table
- [ ] ProposalCard
- [ ] ProposalDiff
- [ ] Approve
- [ ] Modify
- [ ] Reject
- [ ] Vote reasons
- [ ] Proposal history

Target:

```text
AI
 ↓
Proposal
 ↓
Vote
 ↓
Approve
 ↓
Apply
```

This is the first major Tripify differentiator.

---

# 52. Phase 11 — Proposal Application Engine

Implement backend transaction:

```text
Approve Proposal
       ↓
Check proposal status
       ↓
Check base_trip_version
       ↓
Validate changes
       ↓
Apply changes
       ↓
Create trip events
       ↓
Increment trip.version
       ↓
Mark proposal APPLIED
```

All important changes should happen inside a database transaction.

---

# 53. Phase 12 — AI Research

Only after the proposal system works.

Implement:

```text
search_places
search_web
get_reviews
get_weather
get_routes
```

Then build:

```text
Research
 ↓
Evidence
 ↓
Recommendation
```

The AI should produce:

```text
Recommendation
+
Reason
+
Risk
+
Evidence
+
Backup
```

---

# 54. Phase 13 — Recommendation Cards

### Tasks

- [ ] AI Score
- [ ] Group Fit
- [ ] Cost
- [ ] Quality
- [ ] Convenience
- [ ] Reliability
- [ ] Risk
- [ ] Best Time
- [ ] Why Recommended
- [ ] Backup Plan

Target:

```text
Search result
      ↓
AI Recommendation
      ↓
Add to Proposal
```

---

# 55. Phase 14 — Budget Forecast

Implement:

```text
Current Cost
+
Expected Cost
+
Remaining Budget
+
Forecast
```

Example:

```text
Current:
RM 3,800

Expected:
RM 4,760

Budget:
RM 5,000

Remaining:
RM 240
```

Then allow:

```text
Ask AI to reduce cost
```

which creates a proposal.

---

# 56. Phase 15 — External Reality

Implement at least:

### Weather

```text
Weather API
```

### Flight Delay

For the Hackathon, a simulation is acceptable.

Example:

```text
[Simulate 4h Flight Delay]
```

This is actually useful for demonstrating dynamic replanning without requiring a real flight provider.

---

# 57. Phase 16 — Dynamic Replanning

Create:

```text
trip_events
```

Then implement:

```text
Flight Delay
      ↓
Find affected activities
      ↓
Check constraints
      ↓
Research alternatives
      ↓
Generate Proposal
      ↓
Group Vote
      ↓
Apply
```

This should be the final major MVP feature.

---

# 58. Phase 17 — AI Observer

After dynamic replanning works manually, make it automatic.

```text
Event
 ↓
Rule Filter
 ↓
AI Observer
 ↓
Should we react?
 ↓
Research
 ↓
Proposal
```

Example:

```text
Weather changed

Rule:
Affected activity = outdoor

→ Trigger AI
```

Do not trigger AI for irrelevant events.

---

# 59. Phase 18 — Realtime

Use Supabase Realtime for:

- Chat
- New proposal
- Vote changes
- Trip updates
- AI alerts

Example:

```text
Alice votes APPROVE
       ↓
Supabase Realtime
       ↓
Bob's screen updates
```

---

# 60. Phase 19 — Polish

Only after all core functionality works.

### UI

- [ ] Loading states
- [ ] Empty states
- [ ] Error states
- [ ] Skeletons
- [ ] Toast notifications
- [ ] Responsive layout
- [ ] Mobile layout
- [ ] Accessibility
- [ ] Dark mode if needed

### AI

- [ ] AI loading state
- [ ] Tool execution state
- [ ] Research progress
- [ ] AI confidence
- [ ] Error handling
- [ ] Fallback response

---

# 61. Phase 20 — Demo Preparation

The demo should tell one complete story.

Do NOT demo:

```text
"Here is an AI that generates a Tokyo itinerary."
```

That is too generic.

Instead:

```text
4 Friends
     ↓
Different Preferences
     ↓
AI Research
     ↓
AI Proposal
     ↓
Group Voting
     ↓
Compromise
     ↓
Approved Itinerary
     ↓
Flight Delay
     ↓
AI Detects Problem
     ↓
Researches Alternatives
     ↓
Backup Proposal
     ↓
Group Approves
```

---

# 62. Recommended Demo Scenario

## Trip

```text
Destination:
Tokyo

Duration:
5 Days

Group:
4 people

Budget:
RM 5,000
```

---

## Different Preferences

```text
Alice:
Shopping + Cafes

Bob:
Anime + Gaming

Charlie:
Culture + Photography

David:
Food + Relaxation
```

This immediately creates a real group decision problem.

---

## AI Research

Tripify researches:

```text
TeamLab
Shibuya
Asakusa
Akihabara
Tokyo Skytree
Tokyo National Museum
Restaurants
Hotels
```

Then ranks them according to the group.

---

## Proposal

Tripify proposes:

```text
Day 3

09:00 TeamLab
13:00 Lunch
15:00 Shibuya Sky
18:30 Dinner
```

---

## Vote

```text
Alice    APPROVE
Bob      APPROVE
Charlie  MODIFY
David    APPROVE
```

AI detects Charlie's concern.

---

## Compromise

AI proposes:

```text
Keep Shibuya Sky

Remove low-priority shopping activity

Add cafe break

Walking:
11.2 km → 7.2 km

Group Fit:
82 → 89
```

---

## Reality Change

Simulate:

```text
Flight delayed by 4 hours
```

Tripify detects:

```text
Day 1 affected
2 activities affected
1 reservation conflict
```

AI researches alternatives.

---

## Backup Proposal

```text
Remove:
Outdoor activity

Add:
Indoor activity

Move:
Shibuya → Day 2
```

Group votes.

```text
4 / 4 APPROVE
```

The itinerary updates.

This demonstrates the complete product thesis.

---

# 63. MVP Definition of Done

Tripify MVP is complete when this scenario works end-to-end:

```text
User creates trip
        ↓
Adds members
        ↓
Members set preferences
        ↓
AI understands preferences
        ↓
AI researches destinations
        ↓
AI creates itinerary
        ↓
AI explains recommendations
        ↓
Group discusses in chat
        ↓
AI creates proposal
        ↓
Members vote
        ↓
Approved proposal modifies itinerary
        ↓
External event occurs
        ↓
AI detects affected activities
        ↓
AI researches alternatives
        ↓
AI creates backup proposal
        ↓
Group approves
        ↓
Itinerary updates
```

If this works reliably, the MVP is strong enough for the Hackathon.

---

# 64. Features to Defer

Do NOT build these before the core loop works.

## Defer

- [ ] Direct hotel booking
- [ ] Flight booking
- [ ] Expense settlement
- [ ] Full expense splitting
- [ ] TikTok crawler
- [ ] Custom social-media crawler
- [ ] Full Booking.com integration
- [ ] Affiliate system
- [ ] B2B dashboard
- [ ] Travel agency mode
- [ ] Offline mode
- [ ] Full flight tracking infrastructure
- [ ] Complex fairness algorithm
- [ ] Multiple independent AI agents
- [ ] AI credit system
- [ ] Custom vector database
- [ ] Advanced analytics
- [ ] Complex notification infrastructure

These can become future features.

---

# 65. Priority Matrix

## P0 — Must Work

```text
Authentication
Trip creation
Group members
Preferences
Itinerary
Map
Chat
AI context
AI research
AI recommendation
Proposal
Voting
Proposal application
Budget
Flight delay simulation
Dynamic replanning
```

---

## P1 — Strongly Recommended

```text
Weather
Backup plans
Trip Health
Realtime
Research evidence
Proposal history
AI Observer
next-intl
Mobile UI
```

---

## P2 — Future

```text
Booking integration
Affiliate links
Expense splitting
TikTok
Advanced social research
Flight API
Hotel API
Offline
B2B
Travel agency tools
```

---

# 66. Suggested Project Structure

```text
src/
│
├── app/
│   └── [locale]/
│       ├── page.tsx
│       ├── dashboard/
│       └── trip/
│           └── [id]/
│
├── components/
│   ├── trip/
│   │   ├── TripHeader.tsx
│   │   ├── DayTimeline.tsx
│   │   ├── ActivityCard.tsx
│   │   ├── RouteSegment.tsx
│   │   ├── TripHealth.tsx
│   │   └── BudgetSummary.tsx
│   │
│   ├── ai/
│   │   ├── AIMessage.tsx
│   │   ├── ProposalCard.tsx
│   │   ├── ProposalDiff.tsx
│   │   ├── RecommendationCard.tsx
│   │   ├── ResearchEvidence.tsx
│   │   └── SmartAlert.tsx
│   │
│   ├── group/
│   │   ├── MemberPreference.tsx
│   │   ├── VotePanel.tsx
│   │   └── DecisionCard.tsx
│   │
│   └── ui/
│
├── lib/
│   ├── supabase/
│   ├── ai/
│   │   ├── agent.ts
│   │   ├── context.ts
│   │   ├── tools/
│   │   └── schemas/
│   │
│   ├── maps/
│   ├── weather/
│   ├── research/
│   ├── proposals/
│   └── budget/
│
├── i18n/
│   ├── routing.ts
│   ├── request.ts
│   └── navigation.ts
│
├── messages/
│   ├── en.json
│   ├── zh.json
│   └── ms.json
│
└── types/
```

---

# 67. Development Order Summary

The shortest practical implementation path is:

```text
1. Project Setup
       ↓
2. next-intl
       ↓
3. Supabase Auth
       ↓
4. Trip CRUD
       ↓
5. Members
       ↓
6. Preferences
       ↓
7. Itinerary
       ↓
8. Map
       ↓
9. Chat
       ↓
10. AI Context
       ↓
11. AI Tools
       ↓
12. AI Research
       ↓
13. AI Recommendation
       ↓
14. Proposal
       ↓
15. Voting
       ↓
16. Apply Proposal
       ↓
17. Budget
       ↓
18. Weather
       ↓
19. Flight Delay Simulation
       ↓
20. Dynamic Replanning
       ↓
21. AI Observer
       ↓
22. Realtime
       ↓
23. UI Polish
       ↓
24. Demo
```

---

# 68. First Coding Milestone

The first milestone should NOT be AI.

Build this:

```text
Login
 ↓
Dashboard
 ↓
Create Trip
 ↓
Invite Members
 ↓
Set Preferences
 ↓
Open Trip Workspace
 ↓
See Itinerary + Map + Chat
```

Once this works, Tripify has a stable product foundation.

Then add:

```text
AI
 ↓
Research
 ↓
Proposal
 ↓
Vote
 ↓
Replan
```

---

# 69. Final Product Definition

Tripify is not:

> "An AI that generates travel itineraries."

Tripify is:

> **An AI teammate that helps groups research, discuss, decide, and adapt their trip together.**

The product's strongest differentiator is:

```text
AI Recommendation
        +
Group Decision
        +
Dynamic Replanning
```

The key interaction is:

```text
User:
"Can we make Day 3 less tiring?"

Tripify:
Researches
     ↓
Understands preferences
     ↓
Calculates impact
     ↓
Creates proposal
     ↓
Group votes
     ↓
Applies approved changes
```

And when reality changes:

```text
Flight Delay
     ↓
Tripify notices
     ↓
Checks affected plans
     ↓
Researches alternatives
     ↓
Creates backup proposal
     ↓
Group decides
     ↓
Trip continues
```

That is the core MVP.

---

# 70. One-Sentence Pitch

> **Tripify is an AI travel teammate that helps groups research, decide, and dynamically replan their trips together.**

---

# 71. Core Principle

```text
Don't build a bigger travel app.

Build a better group decision system for travel.
```