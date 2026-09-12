import { Annotation } from "@langchain/langgraph";
import type { BaseMessage } from "@langchain/core/messages";

/**
 * Tripify AI graph state.
 * AI workflow state only — Supabase remains the source of truth for
 * trips, proposals and votes. Never store whole tables here.
 */
export const TripifyState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (left, right) => left.concat(right),
    default: () => [],
  }),
  tripId: Annotation<string>({ reducer: (_, next) => next, default: () => "" }),
  userId: Annotation<string>({ reducer: (_, next) => next, default: () => "" }),
  locale: Annotation<string>({ reducer: (_, next) => next, default: () => "en" }),
  tripContext: Annotation<string>({
    reducer: (_, next) => next,
    default: () => "",
  }),
  errors: Annotation<string[]>({
    reducer: (left, right) => left.concat(right),
    default: () => [],
  }),
});

export type TripifyStateType = typeof TripifyState.State;
