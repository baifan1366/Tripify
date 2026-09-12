"use client";
import type { PanelId } from "@/lib/mvp/workspace-layout";

export type WidgetId = PanelId;
export type WidgetDensity = "compact" | "medium" | "expanded";
export type Breakpoint = "lg" | "md" | "sm" | "xs" | "xxs";
export type PresetId = "default" | "planning" | "explore" | "decision";

export interface GridCell {
  i: WidgetId;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface WidgetDef {
  id: WidgetId;
  /** Default footprint on the 12-column desktop grid. */
  defaultCell: Omit<GridCell, "i">;
  minW: number;
  minH: number;
  maxW?: number;
  maxH?: number;
  hidable: boolean;
  focusable: boolean;
}

export const BREAKPOINTS: Record<Breakpoint, number> = {
  lg: 1200,
  md: 996,
  sm: 768,
  xs: 480,
  xxs: 0,
};

export const COLS: Record<Breakpoint, number> = {
  lg: 12,
  md: 10,
  sm: 8,
  xs: 4,
  xxs: 2,
};

export const ROW_HEIGHT = 88;
export const GRID_MARGIN: [number, number] = [12, 12];

/** Registry order is the canonical fallback ordering (mobile stack, menus). */
export const WIDGETS: Record<WidgetId, WidgetDef> = {
  plan: {
    id: "plan",
    defaultCell: { x: 0, y: 0, w: 6, h: 6 },
    minW: 3,
    minH: 4,
    hidable: true,
    focusable: true,
  },
  map: {
    id: "map",
    defaultCell: { x: 6, y: 0, w: 6, h: 6 },
    minW: 4,
    minH: 4,
    hidable: true,
    focusable: true,
  },
  budget: {
    id: "budget",
    defaultCell: { x: 5, y: 6, w: 3, h: 4 },
    minW: 3,
    minH: 3,
    hidable: true,
    focusable: true,
  },
  people: {
    id: "people",
    defaultCell: { x: 8, y: 6, w: 4, h: 5 },
    minW: 3,
    minH: 3,
    hidable: true,
    focusable: false,
  },
  ai: {
    id: "ai",
    defaultCell: { x: 0, y: 6, w: 5, h: 5 },
    minW: 3,
    minH: 4,
    hidable: true,
    focusable: true,
  },
  chat: {
    id: "chat",
    defaultCell: { x: 5, y: 6, w: 4, h: 6 },
    minW: 3,
    minH: 4,
    hidable: true,
    focusable: false,
  },
  decisions: {
    id: "decisions",
    defaultCell: { x: 0, y: 12, w: 5, h: 6 },
    minW: 3,
    minH: 4,
    hidable: true,
    focusable: true,
  },
  history: {
    id: "history",
    defaultCell: { x: 5, y: 12, w: 4, h: 5 },
    minW: 3,
    minH: 3,
    hidable: true,
    focusable: false,
  },
};

export const WIDGET_ORDER: WidgetId[] = [
  "plan",
  "map",
  "ai",
  "budget",
  "people",
  "chat",
  "decisions",
  "history",
];

export interface Preset {
  id: PresetId | "custom";
  visible: WidgetId[];
  /** 12-column desktop geometry; smaller breakpoints are derived. */
  cells: GridCell[];
}

export const PRESETS: Record<PresetId, Preset> = {
  default: {
    id: "default",
    visible: ["plan", "map", "ai", "budget", "people"],
    cells: [
      { i: "plan", x: 0, y: 0, w: 6, h: 6 },
      { i: "map", x: 6, y: 0, w: 6, h: 6 },
      { i: "ai", x: 0, y: 6, w: 5, h: 5 },
      { i: "budget", x: 5, y: 6, w: 3, h: 4 },
      { i: "people", x: 8, y: 6, w: 4, h: 5 },
    ],
  },
  planning: {
    id: "planning",
    visible: ["plan", "map", "ai", "budget"],
    cells: [
      { i: "plan", x: 0, y: 0, w: 5, h: 7 },
      { i: "map", x: 5, y: 0, w: 4, h: 7 },
      { i: "budget", x: 9, y: 0, w: 3, h: 3 },
      { i: "ai", x: 5, y: 7, w: 7, h: 5 },
    ],
  },
  explore: {
    id: "explore",
    visible: ["map", "plan", "ai"],
    cells: [
      { i: "map", x: 0, y: 0, w: 8, h: 7 },
      { i: "plan", x: 8, y: 0, w: 4, h: 7 },
      { i: "ai", x: 0, y: 7, w: 6, h: 5 },
    ],
  },
  decision: {
    id: "decision",
    visible: ["decisions", "ai", "plan", "people"],
    cells: [
      { i: "decisions", x: 0, y: 0, w: 6, h: 7 },
      { i: "ai", x: 6, y: 0, w: 6, h: 7 },
      { i: "plan", x: 0, y: 7, w: 8, h: 5 },
      { i: "people", x: 8, y: 7, w: 4, h: 5 },
    ],
  },
};

/**
 * Scale a 12-column layout down to fewer columns for tablet breakpoints.
 * Positions wrap into the narrower column count; RGL vertical compaction
 * resolves any residual collisions on mount.
 */
export function fitCellsToCols(cells: GridCell[], cols: number): GridCell[] {
  const from = COLS.lg;
  if (cols >= from) return cells.map((c) => ({ ...c }));
  return cells.map((c) => {
    const w = Math.max(
      WIDGETS[c.i].minW,
      Math.min(cols, Math.round((c.w / from) * cols)),
    );
    const x = Math.min(Math.floor((c.x / from) * cols), Math.max(0, cols - w));
    return { ...c, x, w };
  });
}

export function presetLayouts(preset: Preset): Record<Breakpoint, GridCell[]> {
  return {
    lg: preset.cells.map((c) => ({ ...c })),
    md: fitCellsToCols(preset.cells, COLS.md),
    sm: fitCellsToCols(preset.cells, COLS.sm),
    xs: fitCellsToCols(preset.cells, COLS.xs),
    xxs: fitCellsToCols(preset.cells, COLS.xxs),
  };
}
