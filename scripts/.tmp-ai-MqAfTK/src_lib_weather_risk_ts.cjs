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

// src/lib/weather/risk.ts
var risk_exports = {};
__export(risk_exports, {
  assessRisk: () => assessRisk
});
module.exports = __toCommonJS(risk_exports);
var STORM_CODES = /* @__PURE__ */ new Set([95, 96, 99]);
function assessRisk(precipProbPct, windKmh, code) {
  if (code != null && STORM_CODES.has(code)) return "high";
  if (precipProbPct != null && precipProbPct >= 60 || windKmh != null && windKmh >= 50)
    return "high";
  if (precipProbPct != null && precipProbPct >= 30 || windKmh != null && windKmh >= 30)
    return "medium";
  return "low";
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  assessRisk
});
