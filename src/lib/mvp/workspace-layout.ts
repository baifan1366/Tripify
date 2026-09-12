export const panelIds = [
  "plan",
  "map",
  "ai",
  "chat",
  "decisions",
  "budget",
  "people",
  "history",
] as const;
export type PanelId = (typeof panelIds)[number];
export type PanelLayout = {
  id: PanelId;
  width: number;
  state: "open" | "collapsed" | "hidden";
};
export type WorkspaceLayout = { version: 1; panels: PanelLayout[] };
export const layoutStorageKey = "tripify.workspace-layout.v1";
export const panelMin = (id: PanelId) => (id === "map" ? 320 : 280);
export const panelMax = 960;
export function defaultLayout(): WorkspaceLayout {
  return {
    version: 1,
    panels: panelIds.map((id) => ({
      id,
      width: id === "map" ? 480 : id === "plan" ? 300 : 340,
      state: ["plan", "map", "ai"].includes(id) ? "open" : "hidden",
    })),
  };
}
/** Only UI preferences cross the storage boundary; reject unknown/duplicate IDs. */
export function parseLayout(value: unknown): WorkspaceLayout {
  const fallback = defaultLayout();
  if (
    !value ||
    typeof value !== "object" ||
    !("version" in value) ||
    value.version !== 1 ||
    !("panels" in value) ||
    !Array.isArray(value.panels)
  )
    return fallback;
  const seen = new Set<PanelId>();
  const panels: PanelLayout[] = [];
  for (const item of value.panels) {
    if (!item || !panelIds.includes(item.id) || seen.has(item.id)) continue;
    seen.add(item.id);
    panels.push({
      id: item.id,
      width: Number.isFinite(item.width)
        ? Math.max(panelMin(item.id), Math.min(panelMax, item.width))
        : 340,
      state: ["open", "collapsed", "hidden"].includes(item.state)
        ? item.state
        : "hidden",
    });
  }
  return {
    version: 1,
    panels: [...panels, ...fallback.panels.filter((p) => !seen.has(p.id))],
  };
}
export function movePanel(
  layout: WorkspaceLayout,
  id: PanelId,
  target: PanelId,
): WorkspaceLayout {
  const panels = [...layout.panels];
  const from = panels.findIndex((p) => p.id === id),
    to = panels.findIndex((p) => p.id === target);
  if (from < 0 || to < 0 || from === to) return layout;
  const [panel] = panels.splice(from, 1);
  panels.splice(to, 0, panel);
  return { ...layout, panels };
}
