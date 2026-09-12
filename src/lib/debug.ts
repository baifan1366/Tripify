/**
 * Gated debug logger. Browser logs appear in devtools; server logs appear in
 * Vercel function logs. Enabled by (any one of):
 * - NEXT_PUBLIC_DEBUG=1 (client, baked at build time)
 * - TRIPIFY_DEBUG=1 / MAPS_DEBUG=1 (server)
 * - localStorage "tripify:debug" = "1" (client)
 * - URL query ?debug (client)
 *
 * NEVER pass API keys, tokens, or full request bodies to debugLog.
 */
export function isDebugEnabled(scope?: string): boolean {
  if (typeof window === "undefined") {
    if (process.env.TRIPIFY_DEBUG === "1") return true;
    if (scope === "maps" && process.env.MAPS_DEBUG === "1") return true;
    return false;
  }
  try {
    if (process.env.NEXT_PUBLIC_DEBUG === "1") return true;
    if (window.localStorage.getItem("tripify:debug") === "1") return true;
    return new URLSearchParams(window.location.search).has("debug");
  } catch {
    return false;
  }
}

export function debugLog(scope: string, message: string, data?: unknown) {
  if (!isDebugEnabled(scope)) return;
  if (data !== undefined)
    console.log(`[tripify:${scope}] ${message}`, data);
  else console.log(`[tripify:${scope}] ${message}`);
}
