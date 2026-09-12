import { z } from "zod";

/** Shared request contract for POST /api/ai/chat (server validates; test reuses). */
export const aiChatBodySchema = z.object({
  tripId: z.uuid(),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(20),
  locale: z.enum(["en", "zh", "ms"]).default("en"),
  selectedDay: z.number().int().min(1).max(60).optional(),
  /** Client-generated idempotency key for the analysis record. */
  requestId: z.uuid().optional(),
});

export type AiChatBody = z.infer<typeof aiChatBodySchema>;
