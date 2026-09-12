"use client";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Responsive, WidthProvider } from "react-grid-layout/legacy";
import type { Layout as RglLayout } from "react-grid-layout/legacy";
import {
  BREAKPOINTS,
  COLS,
  GRID_MARGIN,
  ROW_HEIGHT,
  WIDGETS,
  WIDGET_ORDER,
  type Breakpoint,
  type GridCell,
  type WidgetId,
} from "./widget-registry";
import {
  WorkspaceLayoutProvider,
  useWorkspaceGrid,
} from "./workspace-layout-context";
import { WidgetFrame } from "./widget-frame";
import { WorkspaceToolbar } from "./workspace-toolbar";
import { PresenceProvider } from "./workspace-presence";
import { WIDGET_CONTENT, type WidgetProps } from "./widget-content";

const ResponsiveGrid = WidthProvider(Responsive);

const subscribeMounted = () => () => {};

function toRgl(cells: GridCell[], pinned: WidgetId[]): RglLayout {
  return cells.map((c) => ({
    i: c.i,
    x: c.x,
    y: c.y,
    w: c.w,
    h: c.h,
    minW: WIDGETS[c.i].minW,
    minH: WIDGETS[c.i].minH,
    maxW: WIDGETS[c.i].maxW ?? COLS.lg,
    static: pinned.includes(c.i),
  }));
}

function fromRgl(layout: RglLayout): GridCell[] {
  return layout.map((c) => ({
    i: c.i as WidgetId,
    x: c.x,
    y: c.y,
    w: c.w,
    h: c.h,
  }));
}

function useIsMobile(): boolean {
  return useSyncExternalStore(
    (notify) => {
      const mq = window.matchMedia("(max-width: 767px)");
      mq.addEventListener("change", notify);
      return () => mq.removeEventListener("change", notify);
    },
    () => window.matchMedia("(max-width: 767px)").matches,
    () => false,
  );
}

function Canvas(p: WidgetProps & { active: WidgetId; requested: string | null; badges?: Partial<Record<WidgetId, number>>; titles: Record<WidgetId, string> }) {
  const t = useTranslations("dock");
  const grid = useWorkspaceGrid();
  const mounted = useSyncExternalStore(subscribeMounted, () => true, () => false);
  const mobile = useIsMobile();

  const ordered = useMemo(() => {
    const visible = grid.state.visible.filter((id) => WIDGET_ORDER.includes(id));
    return [
      ...(p.active && visible.includes(p.active) ? [p.active] : []),
      ...visible.filter((id) => id !== p.active),
    ];
  }, [grid.state.visible, p.active]);

  // Route-backed ?view= links reveal their widget instead of navigating away.
  useEffect(() => {
    if (
      p.requested &&
      (WIDGET_ORDER as string[]).includes(p.requested) &&
      mounted
    ) {
      const id = p.requested as WidgetId;
      if (!grid.state.visible.includes(id)) grid.show(id);
      if (!mobile) {
        document
          .getElementById(`dock-${id}`)
          ?.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
    }
    // Reveal only; never hide or reorder on navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.requested, mounted]);

  useEffect(() => {
    if (!mobile) return;
    document
      .getElementById(`dock-${p.active}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [p.active, mobile]);

  if (!mounted) {
    // SSR / first paint: static skeleton avoids hydration mismatch; the live
    // grid mounts on the client with identical widget order and content.
    // (Mobile also renders the skeleton first for the same reason.)
    return (
      <div className="ws-skeleton" aria-hidden="true">
        {ordered.map((id) => (
          <div key={id} className="ws-skeleton-card">
            {p.titles[id]}
          </div>
        ))}
      </div>
    );
  }

  if (mobile) {
    return (
      <div className="ws-stack" data-focus={grid.focusId ?? undefined} data-editing={grid.editing}>
        {ordered.map((id) => {
          const Content = WIDGET_CONTENT[id];
          const cell = grid.cellsFor("sm").find((c) => c.i === id) ?? {
            i: id,
            x: 0,
            y: 0,
            w: COLS.sm,
            h: WIDGETS[id].defaultCell.h,
          };
          return (
            <div key={id} id={`widget-${id}`} className="ws-stack-item">
              <WidgetFrame id={id} title={p.titles[id]} badge={p.badges?.[id]} cell={cell}>
                <Content {...p} />
              </WidgetFrame>
            </div>
          );
        })}
        {ordered.length === 0 && <p className="ws-empty">{t("noPanels")}</p>}
        <KeepAlive {...p} />
      </div>
    );
  }

  const layouts = {
    lg: toRgl(grid.cellsFor("lg"), grid.state.pinned),
    md: toRgl(grid.cellsFor("md"), grid.state.pinned),
    sm: toRgl(grid.cellsFor("sm"), grid.state.pinned),
  };

  return (
    <div className="ws-canvas" data-focus={grid.focusId ?? undefined} data-editing={grid.editing}>
      <ResponsiveGrid
        className="ws-grid"
        layouts={layouts}
        breakpoints={BREAKPOINTS}
        cols={COLS}
        rowHeight={ROW_HEIGHT}
        margin={GRID_MARGIN}
        compactType="vertical"
        preventCollision={false}
        draggableHandle=".ws-drag-handle"
        resizeHandles={["se", "s", "e"]}
        isDraggable={grid.editing}
        isResizable={grid.editing}
        onBreakpointChange={(bp) => grid.setBreakpoint(bp as Breakpoint)}
        onLayoutChange={(_layout, all) => {
          const parsed: Partial<Record<Breakpoint, GridCell[]>> = {};
          for (const bp of Object.keys(all) as (keyof typeof all)[]) {
            const list = all[bp];
            if (list) parsed[bp as Breakpoint] = fromRgl(list);
          }
          grid.onGridChange(parsed);
        }}
      >
        {ordered.map((id) => {
          const Content = WIDGET_CONTENT[id];
          const cell = grid.cellsFor("lg").find((c) => c.i === id) ?? {
            i: id,
            ...WIDGETS[id].defaultCell,
          };
          return (
            <div key={id}>
              <WidgetFrame id={id} title={p.titles[id]} badge={p.badges?.[id]} cell={cell}>
                <Content {...p} />
              </WidgetFrame>
            </div>
          );
        })}
      </ResponsiveGrid>
      {ordered.length === 0 && <p className="ws-empty">{t("noPanels")}</p>}
      <KeepAlive {...p} />
    </div>
  );
}

/**
 * Chat (realtime subscription) and AI (conversation turns) stay mounted
 * while hidden so drafts, subscriptions and threads survive layout edits —
 * the same guarantee the previous dock gave these two widgets.
 */
function KeepAlive(p: WidgetProps) {
  const grid = useWorkspaceGrid();
  const showChat = grid.state.visible.includes("chat");
  const showAi = grid.state.visible.includes("ai");
  if (showChat && showAi) return null;
  const ChatBody = WIDGET_CONTENT.chat;
  const AiBody = WIDGET_CONTENT.ai;
  return (
    <>
      {!showChat && (
        <div id="dock-chat" className="ws-keepalive" data-widget="chat" aria-hidden="true">
          <ChatBody {...p} />
        </div>
      )}
      {!showAi && (
        <div id="dock-ai" className="ws-keepalive" data-widget="ai" aria-hidden="true">
          <AiBody {...p} />
        </div>
      )}
    </>
  );
}

export function AdaptiveWorkspace(
  p: WidgetProps & {
    active: WidgetId;
    requested: string | null;
    onNavigate: (panel: WidgetId) => void;
    badges?: Partial<Record<WidgetId, number>>;
  },
) {
  const t = useTranslations("dock");
  const titles = useMemo(
    () =>
      Object.fromEntries(
        WIDGET_ORDER.map((id) => [id, t(id === "plan" ? "journey" : id)]),
      ) as Record<WidgetId, string>,
    [t],
  );
  return (
    <WorkspaceLayoutProvider>
      <PresenceProvider tripId={p.trip.id}>
        <div className="adaptive-workspace">
          <WorkspaceToolbar titles={titles} badges={p.badges} />
          <Canvas {...p} titles={titles} />
        </div>
      </PresenceProvider>
    </WorkspaceLayoutProvider>
  );
}
