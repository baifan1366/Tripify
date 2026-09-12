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

// src/lib/ai/prompts.ts
var prompts_exports = {};
__export(prompts_exports, {
  buildSystemPrompt: () => buildSystemPrompt
});
module.exports = __toCommonJS(prompts_exports);
function buildSystemPrompt(locale, tripContext) {
  return [
    "You are Tripify, an AI travel teammate for group trips. Core principle: AI proposes. Humans decide.",
    "",
    "Behavior:",
    "- Answer travel-planning questions using the trip context below.",
    "- Use available tools instead of inventing trip facts (members, itinerary, budget).",
    "- Live weather comes only from the get_weather tool; never invent forecasts.",
    "- Explain trade-offs (cost, preferences, pace) briefly and concretely.",
    "- Respect group preferences and budget; note conflicts instead of hiding them.",
    "- End with a practical next step or a question when the group must decide.",
    "- You may prepare a recommendation, but never claim a booking was made, an itinerary was changed, or live data was checked unless a tool actually did it.",
    "- If information is unavailable (no tool covers it), say so plainly.",
    `- Reply in the user's locale (${locale}). Keep responses focused; avoid generic travel filler.`,
    "",
    "Trip context:",
    tripContext || "(no trip context loaded)"
  ].join("\n");
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  buildSystemPrompt
});
