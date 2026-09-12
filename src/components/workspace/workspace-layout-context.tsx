"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  COLS,
  PRESETS,
  WIDGETS,
  WIDGET_ORDER,
  fitCellsToCols,
  type Breakpoint,
  type GridCell,
  type PresetId,
  type WidgetId,
} from "./widget-registry";
import {
  loadGridState,
  saveGridState,
  type GridState,
} from "./workspace-layout-storage";

export type { WidgetId };

interface WorkspaceLayoutApi {
  state: GridState;
  unavailable: boolean;
  /** Breakpoint RGL currently reports (drives clamping of moves/resizes). */
  breakpoint: Breakpoint;
  setBreakpoint: (bp: Breakpoint) => void;
  announcement: string;
  focusId: WidgetId | null;
  setFocus: (id: WidgetId | null) => void;
  cellsFor: (bp: Breakpoint) => GridCell[];
  onGridChange: (all: Partial<Record<Breakpoint, GridCell[]>>) => void;
  show: (id: WidgetId) => void;
  hide: (id: WidgetId) => void;
  togglePin: (id: WidgetId) => void;
  nudge: (id: WidgetId, dx: number, dy: number) => void;
  grow: (id: WidgetId, dw: number, dh: number) => void;
  applyPreset: (preset: PresetId) => void;
  reset: () => void;
  /** Edit mode gates pointer drag/resize. Off by default (use mode) so map
   * pans and form controls never trigger an accidental layout drag; the
   * overflow menu always stays available as the non-drag alternative. */
  editing: boolean;
  setEditing: (on: boolean) => void;
  /** Session-only layout history (never persisted): one gentle step back. */
  canUndo: boolean;
  undo: () => void;
}

const WorkspaceLayoutContext = createContext<WorkspaceLayoutApi | null>(null);

function cellsWithDefaults(
  state: GridState,
  bp: Breakpoint,
  visible: WidgetId[],
): GridCell[] {
  const stored = state.layouts[bp] ?? [];
  const byId = new Map(stored.map((c) => [c.i, c]));
  const cols = COLS[bp];
  // Visible widgets without stored geometry stack below stored ones;
  // RGL vertical compaction packs them into free space on mount.
  let cursor = stored.reduce((max, c) => Math.max(max, c.y + c.h), 0);
  const cells: GridCell[] = [];
  const order = [
    ...stored.map((c) => c.i),
    ...visible.filter((id) => !byId.has(id)),
  ];
  for (const id of order) {
    const known = byId.get(id);
    if (known) {
      cells.push({ ...known });
      continue;
    }
    const def = WIDGETS[id];
    const w = Math.min(def.defaultCell.w, cols);
    cells.push({
      i: id,
      x: 0,
      y: cursor,
      w: Math.max(def.minW, w),
      h: def.defaultCell.h,
    });
    cursor += def.defaultCell.h;
  }
  return cells;
}

function sameCells(a: GridCell[] | undefined, b: GridCell[]): boolean {
  if (!a || a.length !== b.length) return false;
  const byId = new Map(a.map((c) => [c.i, c]));
  return b.every((nc) => {
    const pc = byId.get(nc.i);
    return (
      pc && pc.x === nc.x && pc.y === nc.y && pc.w === nc.w && pc.h === nc.h
    );
  });
}

function clampCell(cell: GridCell, cols: number): GridCell {
  const def = WIDGETS[cell.i];
  const w = Math.max(
    def.minW,
    Math.min(def.maxW ?? cols, cols, cell.w),
  );
  const h = Math.max(def.minH, Math.min(def.maxH ?? 24, 24, cell.h));
  return {
    ...cell,
    w,
    h,
    x: Math.max(0, Math.min(cols - w, cell.x)),
    y: Math.max(0, cell.y),
  };
}

export function WorkspaceLayoutProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [initial] = useState(loadGridState);
  const [state, setState] = useState<GridState>(initial.state);
  const [breakpoint, setBreakpoint] = useState<Breakpoint>("lg");
  const [announcement, setAnnouncement] = useState("");
  const [focusId, setFocusId] = useState<WidgetId | null>(null);
  const [editing, setEditingState] = useState(false);
  const pastRef = useRef<GridState[]>([]);
  const lastPushRef = useRef(0);
  const [pastLen, setPastLen] = useState(0);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    saveGridState(state);
  }, [state]);

  const cellsFor = useCallback(
    (bp: Breakpoint) => cellsWithDefaults(state, bp, state.visible),
    [state],
  );

  const cloneState = (s: GridState): GridState => ({
    ...s,
    visible: [...s.visible],
    pinned: [...s.pinned],
    layouts: Object.fromEntries(
      Object.entries(s.layouts).map(([bp, cells]) => [
        bp,
        (cells ?? []).map((c) => ({ ...c })),
      ]),
    ) as GridState["layouts"],
  });

  // Push the COMMITTED state before a mutation. Drag sessions report many
  // layouts per second, so they coalesce; discrete actions always snapshot.
  const pushPast = useCallback((force: boolean) => {
    const now = Date.now();
    if (!force && now - lastPushRef.current < 2000) return;
    lastPushRef.current = now;
    pastRef.current.push(cloneState(stateRef.current));
    if (pastRef.current.length > 30) pastRef.current.shift();
    setPastLen(pastRef.current.length);
  }, []);

  const undo = useCallback(() => {
    const prev = pastRef.current.pop();
    if (!prev) return;
    setPastLen(pastRef.current.length);
    lastPushRef.current = Date.now();
    setState(prev);
    setAnnouncement("layout undone");
  }, []);

  const onGridChange = useCallback(
    (all: Partial<Record<Breakpoint, GridCell[]>>) => {
      // Skip history for no-op reports (mount compaction echoes geometry).
      const current = stateRef.current;
      const relevant = (Object.keys(all) as Breakpoint[]).some((bp) => {
        const list = all[bp];
        if (!list) return false;
        const known = new Set(current.visible);
        const cells = list
          .filter((c) => known.has(c.i))
          .map((c) => clampCell(c, COLS[bp]));
        return !sameCells(
          (current.layouts[bp] ?? []).filter((c) => known.has(c.i)),
          cells,
        );
      });
      if (relevant) pushPast(false);
      setState((s) => {
        const layouts = { ...s.layouts };
        let changed = false;
        for (const bp of Object.keys(all) as Breakpoint[]) {
          const list = all[bp];
          if (!list) continue;
          const next = list.map((c) => clampCell(c, COLS[bp]));
          const prev = s.layouts[bp];
          // Order-insensitive: RGL reports row-major order while storage
          // keeps insertion order; only geometry changes matter.
          const prevById = new Map((prev ?? []).map((pc) => [pc.i, pc]));
          const same =
            prev &&
            prev.length === next.length &&
            next.every((nc) => {
              const pc = prevById.get(nc.i);
              return (
                pc &&
                pc.x === nc.x &&
                pc.y === nc.y &&
                pc.w === nc.w &&
                pc.h === nc.h
              );
            });
          if (same) {
            layouts[bp] = prev;
            continue;
          }
          changed = true;
          layouts[bp] = next;
        }
        // Mount-time compaction reports are no-ops: keep the chosen preset
        // label and skip persistence until the user actually moves something.
        if (!changed) return s;
        return { ...s, preset: "custom", layouts };
      });
    },
    [pushPast],
  );

  const show = useCallback((id: WidgetId) => {
    pushPast(true);
    setState((s) =>
      s.visible.includes(id)
        ? s
        : { ...s, preset: "custom", visible: [...s.visible, id] },
    );
    setAnnouncement(`${id} shown`);
  }, [pushPast]);

  const hide = useCallback((id: WidgetId) => {
    pushPast(true);
    setState((s) => ({
      ...s,
      preset: "custom",
      visible: s.visible.filter((v) => v !== id),
    }));
    if (focusId === id) setFocusId(null);
    setAnnouncement(`${id} hidden`);
  }, [focusId, pushPast]);

  const togglePin = useCallback((id: WidgetId) => {
    pushPast(true);
    setState((s) => ({
      ...s,
      preset: "custom",
      pinned: s.pinned.includes(id)
        ? s.pinned.filter((p) => p !== id)
        : [...s.pinned, id],
    }));
    setAnnouncement(`${id} pin toggled`);
  }, [pushPast]);

  const adjust = useCallback(
    (id: WidgetId, dx: number, dy: number, dw: number, dh: number) => {
      pushPast(true);
      setState((s) => {
        const layouts = { ...s.layouts };
        for (const bp of Object.keys(COLS) as Breakpoint[]) {
          const base =
            layouts[bp] ?? fitCellsToCols(cellsFor(bp), COLS[bp]);
          layouts[bp] = base.map((c) =>
            c.i === id
              ? clampCell(
                  {
                    ...c,
                    x: c.x + dx,
                    y: c.y + dy,
                    w: c.w + dw,
                    h: c.h + dh,
                  },
                  COLS[bp],
                )
              : c,
          );
        }
        return { ...s, preset: "custom", layouts };
      });
    },
    [cellsFor, pushPast],
  );

  const nudge = useCallback(
    (id: WidgetId, dx: number, dy: number) => {
      adjust(id, dx, dy, 0, 0);
      setAnnouncement(`${id} moved`);
    },
    [adjust],
  );

  const grow = useCallback(
    (id: WidgetId, dw: number, dh: number) => {
      adjust(id, 0, 0, dw, dh);
      setAnnouncement(`${id} resized`);
    },
    [adjust],
  );

  const applyPreset = useCallback((preset: PresetId) => {
    const p = PRESETS[preset];
    pushPast(true);
    setState((s) => ({
      ...s,
      preset: p.id,
      visible: [...p.visible],
      layouts: {
        ...s.layouts,
        lg: p.cells.map((c) => ({ ...c })),
        md: fitCellsToCols(p.cells, COLS.md),
        sm: fitCellsToCols(p.cells, COLS.sm),
      },
      pinned: s.pinned.filter((id) => p.visible.includes(id)),
    }));
    setFocusId(null);
    setAnnouncement(`${preset} layout applied`);
  }, [pushPast]);

  const reset = useCallback(() => {
    applyPreset("default");
  }, [applyPreset]);

  const setFocus = useCallback((id: WidgetId | null) => {
    setFocusId(id);
    setAnnouncement(id ? `${id} focused` : "Focus closed");
  }, []);

  const setEditing = useCallback((on: boolean) => {
    setEditingState(on);
    setAnnouncement(on ? "editing" : "viewing");
  }, []);

  const api = useMemo<WorkspaceLayoutApi>(
    () => ({
      state,
      unavailable: initial.unavailable,
      breakpoint,
      setBreakpoint,
      announcement,
      focusId,
      setFocus,
      cellsFor,
      onGridChange,
      show,
      hide,
      togglePin,
      nudge,
      grow,
      applyPreset,
      reset,
      editing,
      setEditing,
      canUndo: pastLen > 0,
      undo,
    }),
    [
      state,
      initial,
      breakpoint,
      announcement,
      focusId,
      setFocus,
      cellsFor,
      onGridChange,
      show,
      hide,
      togglePin,
      nudge,
      grow,
      applyPreset,
      reset,
      editing,
      setEditing,
      pastLen,
      undo,
    ],
  );

  return (
    <WorkspaceLayoutContext.Provider value={api}>
      {children}
    </WorkspaceLayoutContext.Provider>
  );
}

export function useWorkspaceGrid(): WorkspaceLayoutApi {
  const api = useContext(WorkspaceLayoutContext);
  if (!api)
    throw new Error("useWorkspaceGrid must be used inside WorkspaceLayoutProvider");
  return api;
}

export { WIDGET_ORDER };
