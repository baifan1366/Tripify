import type { ToolRegistry } from "@/lib/ai/tools/trip-tools";

/** Single registry so future tools plug in without touching the graph. */
export function registryToolNames(registry: ToolRegistry): string[] {
  return registry.map((t) => t.name);
}
