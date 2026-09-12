"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Expand,
  GripVertical,
  Maximize2,
  Minimize2,
  Minus,
  MoreHorizontal,
  Pin,
  PinOff,
  Shrink,
  X,
} from "lucide-react";
import { AppPopover } from "@/components/ui/app-popover";
import { WIDGETS, type WidgetDensity, type WidgetId } from "./widget-registry";
import { useWorkspaceGrid } from "./workspace-layout-context";
import { usePresence } from "./workspace-presence";

export const WidgetDensityContext = createContext<WidgetDensity>("medium");

export function useWidgetDensity(): WidgetDensity {
  return useContext(WidgetDensityContext);
}

function densityForWidth(px: number): WidgetDensity {
  if (px < 400) return "compact";
  if (px < 620) return "medium";
  return "expanded";
}

export function WidgetFrame({
  id,
  title,
  badge,
  cell,
  children,
}: {
  id: WidgetId;
  title: string;
  badge?: number;
  cell: { x: number; y: number; w: number; h: number };
  children: ReactNode;
}) {
  const t = useTranslations("dock");
  const grid = useWorkspaceGrid();
  const presence = usePresence();
  const here = presence.others.filter((o) => o.widget === id);
  const bodyRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLSpanElement>(null);
  const [density, setDensity] = useState<WidgetDensity>("medium");
  const focused = grid.focusId === id;
  const pinned = grid.state.pinned.includes(id);
  const def = WIDGETS[id];

  // The section node remounts when it moves between the grid item and the
  // focus portal while this frame (and its state) persists — so re-observe
  // the current node on focus changes and measure synchronously as backup.
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      if (w > 0) setDensity(densityForWidth(w));
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [focused]);

  useEffect(() => {
    if (!focused) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") grid.setFocus(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused]);

  const refocusMenu = () => {
    // Keep keyboard focus stable after a layout action closes the popover.
    window.setTimeout(() => menuButtonRef.current?.focus(), 0);
  };

  const menuAction = (fn: () => void) => () => {
    fn();
    refocusMenu();
  };

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const frame = (
    <section
      id={`dock-${id}`}
      className="ws-widget dock-panel"
      data-widget={id}
      data-state="open"
      data-density={density}
      data-focused={focused}
      data-pinned={pinned}
      data-x={cell.x}
      data-y={cell.y}
      data-w={cell.w}
      data-h={cell.h}
      aria-label={title}
      onPointerEnter={() => presence.report(id)}
      onFocus={() => presence.report(id)}
    >
      <header className="ws-widget-heading">
        <span
          className="ws-drag-handle"
          aria-hidden="true"
          title={t("dragPanel", { panel: title })}
        >
          <GripVertical size={15} />
        </span>
        <h2 className="ws-drag-handle ws-widget-title">{title}</h2>
        {typeof badge === "number" && badge > 0 && (
          <span className="dock-badge" aria-label={`${badge}`}>
            {badge}
          </span>
        )}
        {id === "ai" && <span className="mvp-tag">{t("preview")}</span>}
        {here.length > 0 && (
          <span
            className="ws-presence"
            role="group"
            aria-label={t("presenceViewing")}
          >
            {here.slice(0, 3).map((o) => (
              <span
                key={o.userId}
                className="ws-presence-avatar"
                title={o.name}
                aria-hidden="true"
              >
                {o.name.slice(0, 1)}
              </span>
            ))}
            {here.length > 3 && (
              <span className="ws-presence-more" aria-hidden="true">
                +{here.length - 3}
              </span>
            )}
          </span>
        )}
        <div className="ws-widget-actions">
          {def.focusable && (
            <button
              type="button"
              className="ws-icon-button"
              aria-label={t("expandWidget", { panel: title })}
              onClick={() => grid.setFocus(focused ? null : id)}
            >
              {focused ? <Shrink size={15} /> : <Expand size={15} />}
            </button>
          )}
          <AppPopover
            label={t("panelOptions", { panel: title })}
            className="ws-icon-button"
            trigger={<MoreHorizontal size={17} aria-hidden="true" />}
          >
            {(close) => (
              <div className="dock-picker" role="group" aria-label={title}>
                <button type="button" onClick={() => { grid.nudge(id, -1, 0); close(); refocusMenu(); }}>
                  <ArrowLeft size={15} aria-hidden="true" />
                  {t("moveLeft")}
                </button>
                <button type="button" onClick={() => { grid.nudge(id, 1, 0); close(); refocusMenu(); }}>
                  <ArrowRight size={15} aria-hidden="true" />
                  {t("moveRight")}
                </button>
                <button type="button" onClick={() => { grid.nudge(id, 0, -1); close(); refocusMenu(); }}>
                  <ArrowUp size={15} aria-hidden="true" />
                  {t("moveUp")}
                </button>
                <button type="button" onClick={() => { grid.nudge(id, 0, 1); close(); refocusMenu(); }}>
                  <ArrowDown size={15} aria-hidden="true" />
                  {t("moveDown")}
                </button>
                <button type="button" onClick={() => { grid.grow(id, 1, 0); close(); refocusMenu(); }}>
                  <Maximize2 size={15} aria-hidden="true" />
                  {t("makeWider")}
                </button>
                <button type="button" onClick={() => { grid.grow(id, -1, 0); close(); refocusMenu(); }}>
                  <Minimize2 size={15} aria-hidden="true" />
                  {t("makeNarrower")}
                </button>
                <button type="button" onClick={() => { grid.grow(id, 0, 1); close(); refocusMenu(); }}>
                  <ArrowDown size={15} aria-hidden="true" />
                  {t("makeTaller")}
                </button>
                <button type="button" onClick={() => { grid.grow(id, 0, -1); close(); refocusMenu(); }}>
                  <ArrowUp size={15} aria-hidden="true" />
                  {t("makeShorter")}
                </button>
                {def.focusable && (
                  <button type="button" onClick={() => { grid.setFocus(focused ? null : id); close(); }}>
                    <Expand size={15} aria-hidden="true" />
                    {focused ? t("closeFocus") : t("focusWidget")}
                  </button>
                )}
                <button type="button" onClick={() => { grid.togglePin(id); close(); refocusMenu(); }}>
                  {pinned ? <PinOff size={15} aria-hidden="true" /> : <Pin size={15} aria-hidden="true" />}
                  {pinned ? t("unpinWidget") : t("pinWidget")}
                </button>
                {def.hidable && (
                  <>
                    <button
                      type="button"
                      onClick={menuAction(() => {
                        close();
                        grid.hide(id);
                      })}
                    >
                      <Minus size={15} aria-hidden="true" />
                      {t("minimize")}
                    </button>
                    <button
                      type="button"
                      onClick={menuAction(() => {
                        close();
                        grid.hide(id);
                      })}
                    >
                      <X size={15} aria-hidden="true" />
                      {t("hidePanel")}
                    </button>
                  </>
                )}
              </div>
            )}
          </AppPopover>
          {/* Stable ref target so focus can be restored after menu actions. */}
          <span
            ref={menuButtonRef}
            className="ws-menu-anchor"
            tabIndex={-1}
            aria-hidden="true"
          />
        </div>
      </header>
      <WidgetDensityContext.Provider value={density}>
        <div ref={bodyRef} className="ws-widget-body dock-panel-content">
          {children}
        </div>
      </WidgetDensityContext.Provider>
      {focused && (
        <button
          type="button"
          className="ws-focus-close"
          onClick={() => grid.setFocus(null)}
        >
          {t("closeFocus")}
        </button>
      )}
    </section>
  );
  // Focus is a body-level overlay (outside RGL's transformed grid items, so
  // viewport-fixed positioning actually works). The portal moves the same DOM
  // node: layout, React state and subscriptions are untouched, and closing
  // restores the exact previous grid.
  if (focused && mounted) {
    return createPortal(
      <div className="ws-focus-scrim" data-widget-scrim={id}>
        {frame}
      </div>,
      document.body,
    );
  }
  return frame;
}
