import { ChatOpenAI } from "@langchain/openai";
import { getAiConfig } from "@/lib/ai/config";

/**
 * Centralized Tripify model factory (server-side only).
 * All agent variants (fast / reasoning / fallback) should be added here
 * so model selection never spreads across the codebase.
 *
 * Pass an explicit `apiKey` when rotating through a key pool; otherwise
 * the first configured key is used. Keys must never leave the server.
 */
export function createTravelModel(
  apiKey?: string,
  variant: "default" = "default",
) {
  const config = getAiConfig();
  void variant;
  return new ChatOpenAI({
    apiKey: apiKey ?? config.apiKey,
    model: config.model,
    temperature: 0.4,
    maxRetries: 0,
    configuration: {
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": config.appUrl,
        "X-Title": "Tripify",
      },
    },
  });
}

export function tripThreadId(tripId: string, userId: string) {
  return `trip:${tripId}:user:${userId}`;
}
