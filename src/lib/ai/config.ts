import { z } from "zod";

const TRIPIFY_MODEL = "google/gemma-4-26b-a4b-it:free";

/** Highest numbered-key slot read (OPENROUTER_API_KEY_1.._N, OPEN_ROUTER_KEY_1.._N). */
const MAX_NUMBERED_KEYS = 20;

const aiEnvSchema = z.object({
  OPENROUTER_MODEL: z.string().min(1).default(TRIPIFY_MODEL),
  NEXT_PUBLIC_APP_URL: z.string().min(1).optional(),
});

export type AiConfig = {
  /** All configured keys in priority order. Never log or send to clients. */
  apiKeys: string[];
  /** Backwards-compatible first key. */
  apiKey: string;
  model: string;
  appUrl: string;
};

export class AiConfigError extends Error {
  code = "AI_NOT_CONFIGURED" as const;
  constructor(message = "Tripify AI is not configured.") {
    super(message);
    this.name = "AiConfigError";
  }
}

function cleanKey(value: string | undefined): string {
  // Vercel values are sometimes pasted with literal surrounding quotes.
  // A quoted key is always rejected (401), so strip them everywhere.
  return (value ?? "").trim().replace(/^["']|["']$/g, "");
}

function splitList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(/[\n,]+/)
    .map((part) => cleanKey(part))
    .filter((part) => part.length > 0);
}

/**
 * Collects OpenRouter keys from every supported variable (server-side only):
 * - OPENROUTER_API_KEY (single)
 * - OPENROUTER_API_KEYS (comma/newline separated list)
 * - OPENROUTER_API_KEY_1.._20 and OPEN_ROUTER_KEY_1.._20 (numbered rotation pool)
 */
export function collectApiKeys(
  env: Record<string, string | undefined> = process.env,
): string[] {
  const keys: string[] = [];
  const single = cleanKey(env.OPENROUTER_API_KEY);
  if (single) keys.push(single);
  keys.push(...splitList(env.OPENROUTER_API_KEYS));
  for (let i = 1; i <= MAX_NUMBERED_KEYS; i++) {
    const a = cleanKey(env[`OPENROUTER_API_KEY_${i}`]);
    const b = cleanKey(env[`OPEN_ROUTER_KEY_${i}`]);
    if (a) keys.push(a);
    if (b) keys.push(b);
  }
  return [...new Set(keys.filter((key) => key.length > 0))];
}

/** Server-side only. Reads OpenRouter config; throws AiConfigError when no key exists. */
export function getAiConfig(
  env: Record<string, string | undefined> = process.env,
): AiConfig {
  const parsed = aiEnvSchema.safeParse({
    OPENROUTER_MODEL: env.OPENROUTER_MODEL || TRIPIFY_MODEL,
    NEXT_PUBLIC_APP_URL: env.NEXT_PUBLIC_APP_URL,
  });
  const apiKeys = collectApiKeys(env);
  if (apiKeys.length === 0) {
    throw new AiConfigError(
      "Missing OpenRouter API key. Set OPENROUTER_API_KEY (or OPENROUTER_API_KEYS / OPEN_ROUTER_KEY_1.._20) in your server environment to enable Tripify AI.",
    );
  }
  return {
    apiKeys,
    apiKey: apiKeys[0],
    model: parsed.success ? parsed.data.OPENROUTER_MODEL : TRIPIFY_MODEL,
    appUrl: parsed.data?.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  };
}

function errorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const direct = (error as { status?: unknown }).status;
  if (typeof direct === "number") return direct;
  const code = (error as { code?: unknown }).code;
  if (typeof code === "number") return code;
  const response = (error as { response?: unknown }).response;
  if (response && typeof response === "object") {
    const nested = (response as { status?: unknown }).status;
    if (typeof nested === "number") return nested;
  }
  return undefined;
}

/**
 * True when the failure is tied to the key itself (invalid / exhausted /
 * rate-limited) and another key is worth trying. Transport errors and
 * 5xx/model errors return false.
 */
export function isKeyRotationError(error: unknown): boolean {
  const status = errorStatus(error);
  if (status === 401 || status === 402 || status === 429) return true;
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
        ? String((error as { message: unknown }).message)
        : String(error ?? "");
  return /rate.?limit|too many requests|quota|insufficient (credits|balance|funds)|invalid (api.?key|key)|unauthorized|payment required/i.test(
    message,
  );
}

/** Short, key-safe summary for rotation logs (status code, never key material). */
export function summarizeKeyError(error: unknown): string {
  const status = errorStatus(error);
  if (status) return `HTTP ${status}`;
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
        ? String((error as { message: unknown }).message)
        : String(error ?? "");
  return message.slice(0, 100) || "unknown error";
}

export const TRIPIFY_DEFAULT_MODEL = TRIPIFY_MODEL;
