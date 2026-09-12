"use client";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type PointerEvent,
} from "react";
import { useTranslations } from "next-intl";
import {
  GripVertical,
  MoreHorizontal,
  Plus,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Minus,
  X,
} from "lucide-react";
import { AppPopover } from "@/components/ui/app-popover";
import {
  defaultLayout,
  movePanel,
  panelMin,
  panelMax,
  panelIds,
  type PanelId,
} from "@/lib/mvp/workspace-layout";
import { useWorkspaceLayout } from "./use-workspace-layout";

const subscribeHydration = () => () => {};

export function DockWorkspace({
  panels,
  active,
  requested,
  onNavigate,
}: {
  panels: Record<PanelId, ReactNode>;
  active: PanelId;
  requested: string | null;
  onNavigate: (panel: PanelId) => void;
}) {
  const t = useTranslations("dock");
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false,
  );
  const { layout, updateLayout, unavailable } = useWorkspaceLayout();
  // Lazy-mount heavy panels: only open or active panels render content,
  // except chat (subscription + draft stay alive) and ai (conversation
  // survives hide). Hidden panels remount on reopen and refetch fresh data.
  const mounted = (id: PanelId, state: string) =>
    id === "chat" || id === "ai" || state === "open" || active === id;
  const [dragging, setDragging] = useState<PanelId | null>(null);
  const [target, setTarget] = useState<PanelId | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const resize = useRef<{ id: PanelId; x: number; width: number } | null>(null);
  const label = (id: PanelId) => t(id === "plan" ? "journey" : id);
  const setState = (id: PanelId, state: "open" | "hidden" | "collapsed") => {
    updateLayout((current) => ({
      ...current,
      panels: current.panels.map((p) => (p.id === id ? { ...p, state } : p)),
    }));
    setAnnouncement(t("layoutUpdated"));
    if (state !== "open")
      root.current
        ?.querySelector<HTMLButtonElement>(".dock-add-trigger")
        ?.focus();
  };
  // Route-backed detail links still open their destination in a custom desktop layout.
  useEffect(() => {
    if (
      window.matchMedia("(min-width: 1200px)").matches &&
      requested &&
      panelIds.includes(requested as PanelId)
    ) {
      updateLayout((current) => ({
        ...current,
        panels: current.panels.map((p) =>
          p.id === requested ? { ...p, state: "open" } : p,
        ),
      }));
      root.current
        ?.querySelector(`[data-panel="${requested}"]`)
        ?.scrollIntoView({
          block: "nearest",
          inline: "nearest",
          behavior: "instant",
        });
    }
  }, [requested, updateLayout]);
  const width = (id: PanelId, value: number) =>
    updateLayout((current) => ({
      ...current,
      panels: current.panels.map((p) =>
        p.id === id
          ? { ...p, width: Math.max(panelMin(id), Math.min(panelMax, value)) }
          : p,
      ),
    }));
  const reorder = (id: PanelId, to: PanelId) => {
    updateLayout((current) => movePanel(current, id, to));
    setAnnouncement(t("moved", { panel: label(id) }));
  };
  const beginResize = (
    e: PointerEvent<HTMLDivElement>,
    id: PanelId,
    value: number,
  ) => {
    if (e.button !== 0) return;
    resize.current = { id, x: e.clientX, width: value };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  return (
    <div className="dock-workspace" ref={root}>
      <div className="dock-toolbar">
        <div className="dock-layout-actions">
          <AppPopover
            className="dock-add-trigger dock-control"
            label={t("addPanel")}
            trigger={
              <>
                <Plus size={16} aria-hidden="true" />
                {t("addPanel")}
              </>
            }
          >
            {(close) => (
              <div className="dock-picker">
                {layout.panels.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    disabled={p.state === "open"}
                    onClick={() => {
                      setState(p.id, "open");
                      close();
                    }}
                  >
                    {label(p.id)}
                    {p.state === "open" && <small>{t("visible")}</small>}
                  </button>
                ))}
              </div>
            )}
          </AppPopover>
          <button
            type="button"
            className="dock-control"
            onClick={() => {
              updateLayout(() => defaultLayout());
              setAnnouncement(t("layoutReset"));
            }}
          >
            <RotateCcw size={16} aria-hidden="true" />
            <span>{t("resetLayout")}</span>
          </button>
        </div>
        <label className="dock-responsive-switch">
          <span>{t("openPanel")}</span>
          <select
            disabled={!hydrated}
            value={active}
            onChange={(e) => onNavigate(e.target.value as PanelId)}
          >
            {panelIds.map((id) => (
              <option key={id} value={id}>
                {label(id)}
              </option>
            ))}
          </select>
        </label>
        <div className="dock-minimized" aria-label={t("minimized")}>
          {layout.panels
            .filter((p) => p.state === "collapsed")
            .map((p) => (
              <button
                type="button"
                className="dock-control"
                key={p.id}
                onClick={() => setState(p.id, "open")}
              >
                {label(p.id)}
                <Plus size={14} aria-hidden="true" />
              </button>
            ))}
        </div>
        {unavailable && (
          <span className="dock-storage-note" role="status">
            {t("storageUnavailable")}
          </span>
        )}
      </div>
      <div className="dock-panels">
        {layout.panels.map((p) => {
          const open = layout.panels.filter((item) => item.state === "open");
          const index = open.findIndex((item) => item.id === p.id);
          const companion = active === "map" ? "plan" : "map";
          return (
            <section
              key={p.id}
              id={`dock-${p.id}`}
              className="dock-panel"
              data-panel={p.id}
              data-state={p.state}
              data-active={active === p.id}
              data-companion={companion === p.id}
              data-drop={target === p.id}
              aria-label={label(p.id)}
              style={{
                flexBasis: p.width,
                minWidth: panelMin(p.id),
                maxWidth: panelMax,
              }}
              onDragOver={(e) => {
                if (dragging && dragging !== p.id) {
                  e.preventDefault();
                  setTarget(p.id);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragging && dragging !== p.id) reorder(dragging, p.id);
                setDragging(null);
                setTarget(null);
              }}
            >
              <header className="dock-panel-heading">
                <button
                  type="button"
                  className="dock-drag dock-control"
                  draggable
                  aria-label={t("dragPanel", { panel: label(p.id) })}
                  onDragStart={(e) => {
                    setDragging(p.id);
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", p.id);
                  }}
                  onDragEnd={() => {
                    setDragging(null);
                    setTarget(null);
                  }}
                >
                  <GripVertical size={16} aria-hidden="true" />
                </button>
                <h2>{label(p.id)}</h2>
                {p.id === "ai" && (
                  <span className="mvp-tag">{t("preview")}</span>
                )}
                <div className="dock-panel-menu">
                  <AppPopover
                    label={t("panelOptions", { panel: label(p.id) })}
                    className="dock-control"
                    trigger={<MoreHorizontal size={18} aria-hidden="true" />}
                  >
                    {(close) => (
                      <div className="dock-picker">
                        <button
                          type="button"
                          disabled={index <= 0}
                          onClick={() => reorder(p.id, open[index - 1].id)}
                        >
                          <ChevronLeft size={16} />
                          {t("moveLeft")}
                        </button>
                        <button
                          type="button"
                          disabled={index < 0 || index === open.length - 1}
                          onClick={() => reorder(p.id, open[index + 1].id)}
                        >
                          <ChevronRight size={16} />
                          {t("moveRight")}
                        </button>
                        <label className="dock-width-label">
                          {t("panelWidth")}
                          <input
                            type="range"
                            min={panelMin(p.id)}
                            max={panelMax}
                            step={20}
                            value={p.width}
                            onChange={(e) =>
                              width(p.id, Number(e.target.value))
                            }
                            aria-label={t("resizePanel", {
                              panel: label(p.id),
                            })}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            close();
                            setState(p.id, "collapsed");
                          }}
                        >
                          <Minus size={16} />
                          {t("minimize")}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            close();
                            setState(p.id, "hidden");
                          }}
                        >
                          <X size={16} />
                          {t("hidePanel")}
                        </button>
                      </div>
                    )}
                  </AppPopover>
                </div>
              </header>
              <div className="dock-panel-content">
                {mounted(p.id, p.state) ? panels[p.id] : null}
              </div>
              <div
                className="dock-splitter"
                role="separator"
                tabIndex={0}
                aria-label={t("resizePanel", { panel: label(p.id) })}
                aria-orientation="vertical"
                aria-valuemin={panelMin(p.id)}
                aria-valuemax={panelMax}
                aria-valuenow={p.width}
                aria-controls={`dock-${p.id}`}
                onPointerDown={(e) => beginResize(e, p.id, p.width)}
                onPointerMove={(e) => {
                  if (resize.current?.id === p.id)
                    width(
                      p.id,
                      resize.current.width + e.clientX - resize.current.x,
                    );
                }}
                onPointerUp={() => {
                  resize.current = null;
                }}
                onPointerCancel={() => {
                  resize.current = null;
                }}
                onLostPointerCapture={() => {
                  resize.current = null;
                }}
                onKeyDown={(e) => {
                  const value =
                    e.key === "ArrowLeft"
                      ? p.width - 20
                      : e.key === "ArrowRight"
                        ? p.width + 20
                        : e.key === "Home"
                          ? panelMin(p.id)
                          : e.key === "End"
                            ? panelMax
                            : null;
                  if (value !== null) {
                    e.preventDefault();
                    width(p.id, value);
                  }
                }}
              />
            </section>
          );
        })}
        {!layout.panels.some((p) => p.state === "open") && (
          <p className="dock-no-panels">{t("noPanels")}</p>
        )}
      </div>
      <span className="sr-only" role="status">
        {announcement}
      </span>
    </div>
  );
}
