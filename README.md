# Tripify

An AI travel teammate for group trips. The MVP principle is **AI proposes; humans decide**.

## Start locally

1. Copy `.env.example` to `.env.local` and fill in the Supabase and OpenRouter values.
2. Run `npm run dev`.
3. Open `http://localhost:3000`. English is the default; `/zh` and `/ms` are also available.

## Included foundation

- Next.js App Router, TypeScript, Tailwind CSS v4, shadcn/ui and Lucide.
- `next-intl` routing and semantic messages for English, Chinese, and Malay.
- Supabase browser/server clients plus session-refresh proxy. Add protected-route policy in `src/proxy.ts` during Phase 1 auth.
- LangChain model factory pointing to OpenRouter. `OPENROUTER_MODEL` selects the model without coupling the app to a provider.
- A validated proposal schema: the future AI agent can request changes, but application code must validate and apply them transactionally.

## Deliberately next

The first product milestone is authentication, trip CRUD, members, preferences, itinerary, map and chat. Build the proposal application transaction before granting the AI any write path.
