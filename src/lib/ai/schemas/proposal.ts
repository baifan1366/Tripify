import { z } from "zod";

/** The only shape an AI planning response may use to request an itinerary change. */
export const proposalSchema = z.object({
  type: z.literal("proposal"),
  title: z.string().min(1),
  reason: z.string().min(1),
  changes: z.array(z.object({
    entityType: z.enum(["trip", "trip_day", "trip_activity"]),
    entityId: z.string().uuid(),
    operation: z.enum(["create", "update", "delete", "move"]),
    field: z.string().min(1).optional(),
    newValue: z.unknown().optional(),
  })).min(1),
  impact: z.object({
    budget: z.number(),
    walkingDistance: z.number().nonnegative(),
    groupFit: z.number().min(0).max(100),
  }),
});

export type ProposalDraft = z.infer<typeof proposalSchema>;
