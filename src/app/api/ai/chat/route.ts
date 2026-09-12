import {
  AiConfigError,
  getAiConfig,
  isKeyRotationError,
  isPaymentError,
  isRateLimitError,
  summarizeKeyError,
} from "@/lib/ai/config";
import { buildTripifyGraph } from "@/lib/ai/graph";
import { tripThreadId } from "@/lib/ai/model";
import { aiChatBodySchema as bodySchema } from "@/lib/ai/request";
import { createClient } from "@/lib/supabase/server";
import {
  AIMessage,
  HumanMessage,
  type BaseMessage,
} from "@langchain/core/messages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Streaming AI replies need room beyond the default function limit.
export const maxDuration = 60;

function jsonError(code: string, message: string, status: number) {
  return Response.json({ error: code, message }, { status });
}

function chunkText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    let out = "";
    for (const part of content) {
      if (typeof part === "string") out += part;
      else if (
        part &&
        typeof part === "object" &&
        "text" in part &&
        typeof (part as { text: unknown }).text === "string"
      )
        out += (part as { text: string }).text;
    }
    return out;
  }
  return "";
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_INPUT", "Request body must be JSON.", 400);
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("INVALID_INPUT", "Invalid chat request.", 400);
  }
  const { tripId, messages, locale, selectedDay } = parsed.data;
  const clientRequestId = parsed.data.requestId ?? crypto.randomUUID();

  let client: Awaited<ReturnType<typeof createClient>>;
  try {
    client = await createClient();
  } catch {
    return jsonError("UNAVAILABLE", "Authentication service unavailable.", 503);
  }
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return jsonError("UNAUTHENTICATED", "Sign in to use Tripify AI.", 401);

  // RLS enforces membership: invisible trips read as no row → forbidden.
  const trip = await client
    .from("trips")
    .select("id,version")
    .eq("id", tripId)
    .maybeSingle();
  if (trip.error)
    return jsonError("UNAVAILABLE", "Trip service unavailable.", 503);
  if (!trip.data)
    return jsonError("TRIP_FORBIDDEN", "You cannot access this trip.", 403);
  const tripVersion = trip.data.version as number;
  const lastPrompt =
    [...messages].reverse().find((m) => m.role === "user")?.content.slice(0, 4000) ??
    messages[messages.length - 1].content.slice(0, 4000);

  const turns: BaseMessage[] = messages.map((m) =>
    m.role === "user"
      ? new HumanMessage(m.content)
      : new AIMessage(m.content),
  );

  let apiKeys: string[];
  let modelName: string;
  try {
    const config = getAiConfig();
    apiKeys = config.apiKeys;
    modelName = config.model;
  } catch (error) {
    if (error instanceof AiConfigError)
      return jsonError("AI_NOT_CONFIGURED", error.message, 503);
    console.error("Tripify AI config failed");
    return jsonError("AI_FAILED", "Tripify AI is temporarily unavailable.", 500);
  }

  const thread_id = tripThreadId(tripId, user.id);
  const encoder = new TextEncoder();
  const send = (controller: ReadableStreamDefaultController, payload: object) =>
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));

  const stream = new ReadableStream({
    async start(controller) {
      send(controller, { type: "status", phase: "thinking" });
      const seenTools = new Set<string>();
      let text = "";
      let exhaustedKeys = 0;
      let quotaHits = 0;
      let failed = false;
      let failureCode: string | null = null;

      for (let attempt = 0; attempt < apiKeys.length; attempt++) {
        if (request.signal.aborted) break;
        let graph: ReturnType<typeof buildTripifyGraph>["graph"];
        try {
          ({ graph } = buildTripifyGraph({
            client,
            tripId,
            userId: user.id,
            locale,
            selectedDay,
            apiKey: apiKeys[attempt],
          }));
        } catch (error) {
          failed = true;
          if (error instanceof AiConfigError) {
            failureCode = "AI_NOT_CONFIGURED";
            send(controller, {
              type: "error",
              code: "AI_NOT_CONFIGURED",
              message: error.message,
            });
            break;
          }
          failureCode = "AI_FAILED";
          console.error("Tripify AI graph build failed");
          send(controller, {
            type: "error",
            code: "AI_FAILED",
            message: "Tripify AI is temporarily unavailable. Try again.",
          });
          break;
        }

        try {
          const events = graph.streamEvents(
            { messages: turns },
            // Bounded tool loops: every extra round is another billed API call.
            { version: "v2", configurable: { thread_id }, recursionLimit: 12 },
          );
          for await (const event of events) {
            if (request.signal.aborted) break;
            if (event.event === "on_tool_start") {
              const name = String(
                (event as { name?: unknown }).name ?? "",
              );
              if (name && !seenTools.has(name)) {
                seenTools.add(name);
                send(controller, {
                  type: "status",
                  phase: "researching",
                  tools: [...seenTools],
                });
              }
            }
            if (event.event === "on_chat_model_stream") {
              const delta = chunkText(
                (event.data as { chunk?: { content?: unknown } }).chunk
                  ?.content,
              );
              if (delta) {
                text += delta;
                send(controller, { type: "token", text: delta });
              }
            }
          }
          // Success (or client abort): stop rotating.
          break;
        } catch (error) {
          // Empty wallet (402) is terminal: no key can succeed, so stop
          // at once instead of burning the whole pool.
          if (isPaymentError(error)) {
            failureCode = "AI_CREDITS_EXHAUSTED";
            send(controller, {
              type: "error",
              code: "AI_CREDITS_EXHAUSTED",
              message:
                "OpenRouter credits exhausted. Top up, then retry.",
            });
            text = "";
            failed = true;
            break;
          }
          // Rotate only on key-specific failures with keys remaining and
          // nothing streamed yet; otherwise the reply would be incoherent.
          // Free-model 429s are account-wide per OpenRouter docs, so three
          // consecutive quota hits stop the loop instead of burning all keys.
          if (
            isKeyRotationError(error) &&
            attempt < apiKeys.length - 1 &&
            !text
          ) {
            if (isRateLimitError(error) && ++quotaHits >= 3) {
              failureCode = "AI_QUOTA_EXHAUSTED";
              send(controller, {
                type: "error",
                code: "AI_QUOTA_EXHAUSTED",
                message:
                  "Daily free-model quota reached. Add credits on OpenRouter or try again tomorrow.",
              });
              text = "";
              failed = true;
              break;
            }
            exhaustedKeys += 1;
            console.error(
              `Tripify AI key ${attempt + 1} exhausted (${summarizeKeyError(error)}), rotating to next key`,
            );
            continue;
          }
          if (error instanceof AiConfigError) {
            failureCode = "AI_NOT_CONFIGURED";
            send(controller, {
              type: "error",
              code: "AI_NOT_CONFIGURED",
              message: error.message,
            });
          } else {
            failureCode =
              exhaustedKeys > 0 ? "AI_KEYS_EXHAUSTED" : "AI_UPSTREAM";
            console.error("Tripify AI request failed");
            send(controller, {
              type: "error",
              code: failureCode,
              message:
                exhaustedKeys > 0
                  ? "All Tripify AI keys are rate-limited right now. Try again in a minute."
                  : "Tripify AI is temporarily unavailable. Try again.",
            });
          }
          text = "";
          failed = true;
          break;
        }
      }

      if (request.signal.aborted) {
        controller.close();
        return;
      }
      // Persist the analysis record (completed or failed). Persistence must
      // never break the reply, so every call is guarded.
      const persist = async (
        status: "completed" | "failed",
        result: Record<string, unknown>,
      ) => {
        try {
          await client.rpc("trip_ai_analysis_save", {
            p_trip: tripId,
            p_request: clientRequestId,
            p_version: tripVersion,
            p_prompt: lastPrompt,
            p_model: modelName,
            p_status: status,
            p_result: result,
          });
        } catch {
          console.error("Tripify AI analysis persistence failed");
        }
      };
      if (failed) {
        if (failureCode) {
          await persist("failed", {
            error: failureCode,
            tools: [...seenTools],
            exhaustedKeys,
          });
        }
        controller.close();
        return;
      }
      if (!text) {
        await persist("failed", { error: "AI_EMPTY" });
        send(controller, {
          type: "error",
          code: "AI_EMPTY",
          message: "Tripify AI returned an empty response. Try again.",
        });
        controller.close();
        return;
      }
      send(controller, {
        type: "done",
        text,
        tools: [...seenTools],
      });
      await persist("completed", {
        text: text.slice(0, 8000),
        tools: [...seenTools],
        exhaustedKeys,
      });
      // Share the reply with the group chat (RPC caps content at 2000 chars).
      try {
        if (text.trim()) {
          await client.rpc("trip_ai_post_message", {
            p_trip: tripId,
            p_content: text.slice(0, 2000),
            p_kind: "ai",
          });
        }
      } catch {
        console.error("Tripify AI group message failed");
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
