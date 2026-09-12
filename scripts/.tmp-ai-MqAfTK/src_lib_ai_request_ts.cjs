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

// src/lib/ai/request.ts
var request_exports = {};
__export(request_exports, {
  aiChatBodySchema: () => aiChatBodySchema
});
module.exports = __toCommonJS(request_exports);
var import_zod = require("zod");
var aiChatBodySchema = import_zod.z.object({
  tripId: import_zod.z.uuid(),
  messages: import_zod.z.array(
    import_zod.z.object({
      role: import_zod.z.enum(["user", "assistant"]),
      content: import_zod.z.string().min(1).max(4e3)
    })
  ).min(1).max(20),
  locale: import_zod.z.enum(["en", "zh", "ms"]).default("en"),
  selectedDay: import_zod.z.number().int().min(1).max(60).optional(),
  /** Client-generated idempotency key for the analysis record. */
  requestId: import_zod.z.uuid().optional()
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  aiChatBodySchema
});
