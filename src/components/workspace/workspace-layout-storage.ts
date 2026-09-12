"use client";
import {
  layoutStorageKey as legacyKey,
  panelIds,
  type PanelId,
} from "@/lib/mvp/workspace-layout";
import {
  COLS,
  PRESETS,
  WIDGETS,
  fitCellsToCols,
  type Breakpoint,
  type GridCell,
  type Preset,
  type WidgetId,
} from "./widget-registry";

export const GRID_STORAGE_KEY = "tripify-workspace-grid-v1";
const SAVE_DEBOUNCE_MS = 600;

export interface GridState {
  version: 1;
  preset: Preset["id"];
  visible: WidgetId[];
  layouts: Partial<Record<Breakpoint, GridCell[]>>;
  pinned: WidgetId[];
}

interface RawCell {
  i?: unknown;
  x?: unknown;
  y?: unknown;
  w?: unknown;
  h?: unknown;
}

function knownId(value: unknown): value is WidgetId {
  return (
    typeof value === "string" &&
    (panelIds as readonly string[]).includes(value)
  );
}

function num(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;
}

/** Clamp one stored cell to usable geometry for the given breakpoint. */
function sanitizeCell(raw: RawCell, cols: number): GridCell | null {
  if (!knownId(raw.i)) return null;
  const def = WIDGETS[raw.i];
  const w = Math.max(
    def.minW,
    Math.min(def.maxW ?? cols, cols, Math.round(num(raw.w, def.defaultCell.w))),
  );
  const h = Math.max(
    def.minH,
    Math.min(def.maxH ?? 24, 24, Math.round(num(raw.h, def.defaultCell.h))),
  );
  const x = Math.max(0, Math.min(cols - w, Math.round(num(raw.x, 0))));
  const y = Math.max(0, Math.round(num(raw.y, 0)));
  return { i: raw.i, x, y, w, h };
}

function sanitizeLayouts(value: unknown): Partial<Record<Breakpoint, GridCell[]>> {
  const out: Partial<Record<Breakpoint, GridCell[]>> = {};
  if (!value || typeof value !== "object") return out;
  for (const bp of Object.keys(COLS) as Breakpoint[]) {
    const raw = (value as Record<string, unknown>)[bp];
    if (!Array.isArray(raw)) continue;
    const seen = new Set<WidgetId>();
    const cells: GridCell[] = [];
    for (const item of raw) {
      const cell =
        item && typeof item === "object"
          ? sanitizeCell(item as RawCell, COLS[bp])
          : null;
      if (!cell || seen.has(cell.i)) continue;
      seen.add(cell.i);
      cells.push(cell);
    }
    if (cells.length) out[bp] = cells;
  }
  return out;
}

function defaultState(): GridState {
  const preset = PRESETS.default;
  return {
    version: 1,
    preset: preset.id,
    visible: [...preset.visible],
    layouts: {
      lg: preset.cells.map((c) => ({ ...c })),
      md: fitCellsToCols(preset.cells, COLS.md),
      sm: fitCellsToCols(preset.cells, COLS.sm),
    },
    pinned: [],
  };
}

/**
 * Adopt the previous dock layout (order + open panels) so returning users
 * keep their visible set when upgrading to the grid canvas.
 */
function migrateFromDock(): GridState | null {
  try {
    const raw = localStorage.getItem(legacyKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      version?: unknown;
      panels?: Array<{ id?: unknown; state?: unknown }>;
    };
    if (
      !parsed ||
      parsed.version !== 1 ||
      !Array.isArray(parsed.panels)
    )
      return null;
    const visible: WidgetId[] = [];
    for (const p of parsed.panels) {
      if (
        p &&
        knownId(p.id) &&
        (p.state === "open" || p.state === "collapsed") &&
        !visible.includes(p.id)
      )
        visible.push(p.id);
    }
    if (!visible.length) return null;
    const base = defaultState();
    base.preset = "custom";
    base.visible = visible;
    return base;
  } catch {
    return null;
  }
}

function parseState(value: unknown): GridState {
  const fallback = defaultState();
  if (!value || typeof value !== "object") return fallback;
  const v = value as Record<string, unknown>;
  if (v.version !== 1) return fallback;
  const visible = Array.isArray(v.visible)
    ? (v.visible as unknown[]).filter(knownId)
    : [];
  const pinned = Array.isArray(v.pinned)
    ? (v.pinned as unknown[]).filter(knownId)
    : [];
  const layouts = sanitizeLayouts(v.layouts);
  // Stored cells for hidden widgets are dropped; visible widgets missing
  // geometry fall back to their registry defaults on the canvas.
  const ids = new Set([...visible, ...pinned]);
  for (const bp of Object.keys(layouts) as Breakpoint[]) {
    layouts[bp] = layouts[bp]?.filter((c) => ids.has(c.i));
  }
  const preset =
    v.preset === "default" ||
    v.preset === "planning" ||
    v.preset === "explore" ||
    v.preset === "decision" ||
    v.preset === "custom"
      ? v.preset
      : "custom";
  return {
    version: 1,
    preset,
    visible: visible.length ? [...new Set(visible)] : fallback.visible,
    layouts,
    pinned: [...new Set(pinned)],
  };
}

export function loadGridState(): { state: GridState; unavailable: boolean } {
  try {
    const raw = localStorage.getItem(GRID_STORAGE_KEY);
    if (!raw) return { state: migrateFromDock() ?? defaultState(), unavailable: false };
    return { state: parseState(JSON.parse(raw)), unavailable: false };
  } catch {
    return { state: defaultState(), unavailable: true };
  }
}

let timer: ReturnType<typeof setTimeout> | null = null;

/** Debounced local persistence. Layout only — never trip, chat or AI data. */
export function saveGridState(state: GridState): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    try {
      const payload: GridState = {
        version: 1,
        preset: state.preset,
        visible: state.visible.filter(knownId),
        layouts: sanitizeLayouts(state.layouts),
        pinned: state.pinned.filter(knownId),
      };
      localStorage.setItem(GRID_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* Storage full or blocked: layout stays in memory for the session. */
    }
  }, SAVE_DEBOUNCE_MS);
}

export type { PanelId };
