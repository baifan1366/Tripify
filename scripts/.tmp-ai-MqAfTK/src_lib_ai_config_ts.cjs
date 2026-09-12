"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/lib/ai/config.ts
var config_exports = {};
__export(config_exports, {
  AiConfigError: () => AiConfigError,
  TRIPIFY_DEFAULT_MODEL: () => TRIPIFY_DEFAULT_MODEL,
  collectApiKeys: () => collectApiKeys,
  getAiConfig: () => getAiConfig,
  isKeyRotationError: () => isKeyRotationError
});
module.exports = __toCommonJS(config_exports);
var import_zod = require("zod");
var TRIPIFY_MODEL = "google/gemma-4-26b-a4b-it:free";
var MAX_NUMBERED_KEYS = 20;
var aiEnvSchema = import_zod.z.object({
  OPENROUTER_MODEL: import_zod.z.string().min(1).default(TRIPIFY_MODEL),
  NEXT_PUBLIC_APP_URL: import_zod.z.string().min(1).optional()
});
var AiConfigError = class extends Error {
  constructor(message = "Tripify AI is not configured.") {
    super(message);
    this.code = "AI_NOT_CONFIGURED";
    this.name = "AiConfigError";
  }
};
function splitList(value) {
  if (!value) return [];
  return value.split(/[\n,]+/).map((part) => part.trim().replace(/^["']|["']$/g, "")).filter((part) => part.length > 0);
}
function collectApiKeys(env = process.env) {
  const keys = [];
  if (env.OPENROUTER_API_KEY) keys.push(env.OPENROUTER_API_KEY.trim());
  keys.push(...splitList(env.OPENROUTER_API_KEYS));
  for (let i = 1; i <= MAX_NUMBERED_KEYS; i++) {
    const a = env[`OPENROUTER_API_KEY_${i}`];
    const b = env[`OPEN_ROUTER_KEY_${i}`];
    if (a?.trim()) keys.push(a.trim());
    if (b?.trim()) keys.push(b.trim());
  }
  return [...new Set(keys.filter((key) => key.length > 0))];
}
function getAiConfig(env = process.env) {
  const parsed = aiEnvSchema.safeParse({
    OPENROUTER_MODEL: env.OPENROUTER_MODEL || TRIPIFY_MODEL,
    NEXT_PUBLIC_APP_URL: env.NEXT_PUBLIC_APP_URL
  });
  const apiKeys = collectApiKeys(env);
  if (apiKeys.length === 0) {
    throw new AiConfigError(
      "Missing OpenRouter API key. Set OPENROUTER_API_KEY (or OPENROUTER_API_KEYS / OPEN_ROUTER_KEY_1.._20) in your server environment to enable Tripify AI."
    );
  }
  return {
    apiKeys,
    apiKey: apiKeys[0],
    model: parsed.success ? parsed.data.OPENROUTER_MODEL : TRIPIFY_MODEL,
    appUrl: parsed.data?.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  };
}
function errorStatus(error) {
  if (!error || typeof error !== "object") return void 0;
  const direct = error.status;
  if (typeof direct === "number") return direct;
  const code = error.code;
  if (typeof code === "number") return code;
  const response = error.response;
  if (response && typeof response === "object") {
    const nested = response.status;
    if (typeof nested === "number") return nested;
  }
  return void 0;
}
function isKeyRotationError(error) {
  const status = errorStatus(error);
  if (status === 401 || status === 402 || status === 429) return true;
  const message = error instanceof Error ? error.message : typeof error === "object" && error !== null && "message" in error ? String(error.message) : String(error ?? "");
  return /rate.?limit|too many requests|quota|insufficient (credits|balance|funds)|invalid (api.?key|key)|unauthorized|payment required/i.test(
    message
  );
}
var TRIPIFY_DEFAULT_MODEL = TRIPIFY_MODEL;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AiConfigError,
  TRIPIFY_DEFAULT_MODEL,
  collectApiKeys,
  getAiConfig,
  isKeyRotationError
});
