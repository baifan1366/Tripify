import { ChatOpenAI } from "@langchain/openai";
import { getServerEnv } from "@/lib/env";

/** Creates the single Tripify agent's model through OpenRouter, not a provider-specific SDK. */
export function createTravelModel() {
  const env = getServerEnv();

  return new ChatOpenAI({
    apiKey: env.OPENROUTER_API_KEY,
    model: env.OPENROUTER_MODEL,
    temperature: 0.2,
    configuration: {
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
        "X-Title": "Tripify",
      },
    },
  });
}
